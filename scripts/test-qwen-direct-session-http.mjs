import assert from 'node:assert/strict'
import http from 'node:http'
import net from 'node:net'
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const root = new URL('../', import.meta.url)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer()
    probe.once('error', reject)
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address()
      probe.close(() => resolve(address.port))
    })
  })
}

async function waitForServer(baseUrl, child, output) {
  const deadline = Date.now() + 15_000
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`server exited early (${child.exitCode}): ${output.text.slice(-800)}`)
    try { if ((await fetch(`${baseUrl}/healthz`)).ok) return } catch {}
    await sleep(100)
  }
  throw new Error(`server did not become healthy: ${output.text.slice(-800)}`)
}

async function withCandidate(extraEnv, callback) {
  const port = await freePort()
  const dbPath = join(tmpdir(), `ieltsist-qwen-direct-${process.pid}-${randomUUID()}.sqlite`)
  const output = { text: '' }
  const child = spawn(process.execPath, ['server.js'], {
    cwd: root,
    env: {
      SystemRoot: process.env.SystemRoot,
      WINDIR: process.env.WINDIR,
      PATH: process.env.PATH,
      PATHEXT: process.env.PATHEXT,
      TEMP: process.env.TEMP,
      TMP: process.env.TMP,
      NODE_ENV: 'test',
      PORT: String(port),
      IELTSIST_BIND_HOST: '127.0.0.1',
      IELTSIST_DB_PATH: dbPath,
      SESSION_COOKIE_SECURE: '0',
      DASHSCOPE_API_KEY: '',
      QWEN_API_KEY: '',
      DASHSCOPE_WORKSPACE_ID: '',
      QWEN_WORKSPACE_ID: '',
      ...extraEnv,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  })
  child.stdout.on('data', (chunk) => { output.text += chunk.toString('utf8') })
  child.stderr.on('data', (chunk) => { output.text += chunk.toString('utf8') })
  const baseUrl = `http://127.0.0.1:${port}`
  try {
    await waitForServer(baseUrl, child, output)
    await callback({ baseUrl, output })
  } finally {
    child.kill()
    await Promise.race([new Promise((resolve) => child.once('exit', resolve)), sleep(2_000)])
    await Promise.all(['', '-shm', '-wal'].map((suffix) => rm(`${dbPath}${suffix}`, { force: true }).catch(() => {})))
  }
}

async function register(baseUrl, suffix) {
  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: `qwen_direct_${suffix}`, password: 'fixture-password' }),
  })
  assert.equal(response.status, 200)
  return response.json()
}

function directPost(baseUrl, token, body, { native = true, signal } = {}) {
  return fetch(`${baseUrl}/api/speaking/direct-session`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      ...(native ? { 'x-stemist-native': '1' } : {}),
    },
    body: JSON.stringify(body),
    signal,
  })
}

await withCandidate({}, async ({ baseUrl }) => {
  const account = await register(baseUrl, 'disabled')
  const response = await directPost(baseUrl, account.token, {})
  assert.equal(response.status, 503)
  assert.match(response.headers.get('cache-control') || '', /no-store/)
  assert.equal(response.headers.get('pragma'), 'no-cache')
  assert.deepEqual(await response.json(), {
    code: 'direct_not_configured',
    retryable: false,
    error: 'Direct speaking is not configured.',
  })
})

const tokenPort = await freePort()
let tokenCalls = 0
let tokenMode = 'success'
let releaseHeldToken
let receivedDedicatedAuthorization = false
let receivedExactTokenRequest = false
let abortedProviderRequests = 0
const dedicatedKey = 'test-only-dedicated-direct-key'
const temporaryToken = 'st-test_only_direct_token_123456789'
const tokenServer = http.createServer(async (req, res) => {
  tokenCalls += 1
  res.once('close', () => { if (!res.writableEnded) abortedProviderRequests += 1 })
  receivedDedicatedAuthorization ||= req.headers.authorization === `Bearer ${dedicatedKey}`
  receivedExactTokenRequest ||= req.method === 'POST' && req.url === '/api/v1/tokens?expire_in_seconds=60'
  if (tokenMode === 'hold') await new Promise((resolve) => { releaseHeldToken = resolve })
  if (res.destroyed) return
  if (tokenMode === 'auth-error') {
    res.writeHead(401, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ code: 'InvalidApiKey', message: 'provider-private-detail' }))
    return
  }
  res.writeHead(200, { 'content-type': 'application/json' })
  res.end(JSON.stringify({ token: temporaryToken, expires_at: Math.floor(Date.now() / 1000) + 60 }))
})
await new Promise((resolve, reject) => {
  tokenServer.once('error', reject)
  tokenServer.listen(tokenPort, '127.0.0.1', resolve)
})

try {
  await withCandidate({
    QWEN_DIRECT_ENABLED: '1',
    QWEN_DIRECT_API_KEY: dedicatedKey,
    QWEN_DIRECT_WORKSPACE_ID: 'ws-direct-test',
    QWEN_DIRECT_MODEL: 'qwen3.5-omni-flash-realtime',
    QWEN_DIRECT_TOKEN_ENDPOINT: `http://127.0.0.1:${tokenPort}/api/v1/tokens?expire_in_seconds=60`,
  }, async ({ baseUrl, output }) => {
    const anonymous = await fetch(`${baseUrl}/api/speaking/direct-session`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-stemist-native': '1' },
      body: '{}',
    })
    assert.equal(anonymous.status, 401)
    assert.equal(tokenCalls, 0, 'anonymous requests initialize zero token providers')

    const account = await register(baseUrl, 'enabled')
    const browser = await directPost(baseUrl, account.token, {}, { native: false })
    assert.equal(browser.status, 403)
    assert.equal(tokenCalls, 0, 'non-native requests initialize zero token providers')

    const instructions = await directPost(baseUrl, account.token, { instructions: 'client override' })
    assert.equal(instructions.status, 400)
    assert.equal(tokenCalls, 0, 'arbitrary client instructions initialize zero token providers')

    const oversized = await directPost(baseUrl, account.token, { completedDialogue: [{ role: 'user', text: 'x'.repeat(25_000) }] })
    assert.equal(oversized.status, 400)
    assert.equal(tokenCalls, 0, 'oversized context initializes zero token providers')

    const missingTask = await directPost(baseUrl, account.token, { taskId: 'missing-speaking-task' })
    assert.equal(missingTask.status, 404)
    assert.equal(tokenCalls, 0, 'unknown canonical tasks initialize zero token providers')

    const tasks = await (await fetch(`${baseUrl}/api/tasks`)).json()
    const canonicalTask = tasks.speakingSets.find((task) => task && task.id)
    assert.ok(canonicalTask)
    const success = await directPost(baseUrl, account.token, { taskId: canonicalTask.id, elapsedSeconds: 12 })
    assert.equal(success.status, 201)
    assert.match(success.headers.get('cache-control') || '', /no-store/)
    assert.equal(success.headers.get('pragma'), 'no-cache')
    const contract = await success.json()
    assert.equal(contract.protocol, 'qwen-direct-session-v1')
    assert.equal(contract.token, temporaryToken)
    assert.equal(contract.endpoint, 'wss://ws-direct-test.cn-beijing.maas.aliyuncs.com/api-ws/v1/realtime?model=qwen3.5-omni-flash-realtime')
    assert.match(contract.sessionUpdate.session.instructions, new RegExp(canonicalTask.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    assert.equal(receivedDedicatedAuthorization, true)
    assert.equal(receivedExactTokenRequest, true)
    assert.equal(tokenCalls, 1)

    tokenMode = 'hold'
    const held = directPost(baseUrl, account.token, { recovery: true, elapsedSeconds: 20 })
    const deadline = Date.now() + 2_000
    while (tokenCalls < 2 && Date.now() < deadline) await sleep(10)
    assert.equal(tokenCalls, 2)
    const concurrent = await directPost(baseUrl, account.token, { recovery: true, elapsedSeconds: 20 })
    assert.equal(concurrent.status, 429)
    assert.match(concurrent.headers.get('retry-after') || '', /^\d+$/)
    assert.equal(tokenCalls, 2, 'concurrent issuance is rejected before another provider call')
    releaseHeldToken()
    assert.equal((await held).status, 201)

    tokenMode = 'auth-error'
    const authFailure = await directPost(baseUrl, account.token, { recovery: true, elapsedSeconds: 30 })
    assert.equal(authFailure.status, 503)
    assert.deepEqual(await authFailure.json(), {
      code: 'direct_not_configured',
      retryable: false,
      error: 'Direct speaking is not configured.',
    })

    const revokedAccount = await register(baseUrl, 'revoked')
    tokenMode = 'hold'
    releaseHeldToken = null
    const revokedMint = directPost(baseUrl, revokedAccount.token, { recovery: true, elapsedSeconds: 40 })
    const revokeDeadline = Date.now() + 2_000
    while (tokenCalls < 4 && Date.now() < revokeDeadline) await sleep(10)
    assert.equal(tokenCalls, 4)
    const logout = await fetch(`${baseUrl}/api/auth/logout`, { method: 'POST', headers: { authorization: `Bearer ${revokedAccount.token}` } })
    assert.equal(logout.status, 200)
    releaseHeldToken()
    const revokedResponse = await revokedMint
    const revokedBody = await revokedResponse.text()
    assert.equal(revokedResponse.status, 401, 'a revoked login cannot receive a token minted while it was active')
    assert.equal(revokedBody.includes(temporaryToken), false, 'revocation races cannot return the temporary credential')

    const abortAccount = await register(baseUrl, 'closed')
    tokenMode = 'hold'
    releaseHeldToken = null
    const abortController = new AbortController()
    const abortedMint = directPost(baseUrl, abortAccount.token, { recovery: true, elapsedSeconds: 50 }, { signal: abortController.signal })
    const requestDeadline = Date.now() + 2_000
    while (tokenCalls < 5 && Date.now() < requestDeadline) await sleep(10)
    assert.equal(tokenCalls, 5)
    abortController.abort()
    await assert.rejects(abortedMint, (error) => error && error.name === 'AbortError')
    const abortDeadline = Date.now() + 2_000
    while (!abortedProviderRequests && Date.now() < abortDeadline) await sleep(10)
    assert.equal(abortedProviderRequests, 1, 'closing the native response aborts the in-flight token request')
    releaseHeldToken()
    tokenMode = 'success'
    const afterAbort = await directPost(baseUrl, abortAccount.token, { recovery: true, elapsedSeconds: 51 })
    assert.equal(afterAbort.status, 201, 'disconnect cleanup releases the per-user in-flight limit')

    const sharedCatalogResponse = await fetch(`${baseUrl}/api/native/ielts/catalog`, {
      headers: { 'X-STEMist-Catalog': 'native-topics-v1' },
    })
    assert.equal(sharedCatalogResponse.status, 200)
    const sharedCatalog = await sharedCatalogResponse.json()
    const publicAdvice = sharedCatalog.speakingSets.find((task) => task.id === 'public-speaking-expanded-advice')
    assert.equal(publicAdvice?.sourceKind, 'public-topic')
    const publicWriting = sharedCatalog.writingTasks.find((task) => task.sourceKind === 'public-topic')
    assert.ok(publicWriting?.id)
    const publicAccount = await register(baseUrl, 'public_topic')
    const beforePublic = tokenCalls
    const publicWritingAttempt = await directPost(baseUrl, publicAccount.token, { taskId: publicWriting.id })
    assert.equal(publicWritingAttempt.status, 404, 'a public Writing ID cannot cross into Direct Speaking')
    const unknownPublicAttempt = await directPost(baseUrl, publicAccount.token, { taskId: 'public-speaking-not-published' })
    assert.equal(unknownPublicAttempt.status, 404)
    assert.equal(tokenCalls, beforePublic, 'wrong-module and unknown public IDs initialize zero token providers')
    const publicAdviceAttempt = await directPost(baseUrl, publicAccount.token, { taskId: publicAdvice.id })
    if (publicAdviceAttempt.status !== 201) assert.equal(tokenCalls, beforePublic, 'the current public-topic rejection happens before token minting')
    assert.equal(publicAdviceAttempt.status, 201, 'a canonical shared Speaking topic can start Direct Speaking')
    const publicAdviceContract = await publicAdviceAttempt.json()
    assert.match(publicAdviceContract.sessionUpdate.session.instructions, /Advice/)
    assert.equal(tokenCalls, beforePublic + 1)
    assert.equal((await fetch(`${baseUrl}/healthz`)).status, 200)
    assert.doesNotMatch(output.text, new RegExp(`${dedicatedKey}|${temporaryToken}|provider-private-detail`), 'tokens, keys and provider bodies cannot enter server logs')
  })
} finally {
  await new Promise((resolve) => tokenServer.close(resolve))
}

console.log('Qwen direct session HTTP: native authentication, fail-closed config, canonical task, provider isolation, no-store and concurrent issuance passed.')
