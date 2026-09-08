import assert from 'node:assert/strict'
import http from 'node:http'
import net from 'node:net'
import { spawn } from 'node:child_process'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'

const root = new URL('../', import.meta.url)
const dbPath = join(tmpdir(), `ieltsist-qwen-http-auth-${process.pid}-${randomUUID()}.sqlite`)
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

function listen(server, port) {
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', resolve)
  })
}

function close(server) {
  return new Promise((resolve) => server?.close(() => resolve()))
}

async function waitForServer(baseUrl, child, output) {
  const deadline = Date.now() + 15_000
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`server exited early (${child.exitCode}): ${output.text.slice(-800)}`)
    try { if ((await fetch(`${baseUrl}/healthz`)).ok) return } catch {}
    await sleep(100)
  }
  throw new Error('server did not become healthy')
}

async function register(baseUrl, username) {
  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password: 'fixture-password' }),
  })
  assert.equal(response.status, 200)
  const account = await response.json()
  return { ...account, cookie: String(response.headers.get('set-cookie') || '').split(';')[0] }
}

const appPort = await freePort()
const providerPort = await freePort()
const baseUrl = `http://127.0.0.1:${appPort}`
const output = { text: '' }
let providerCalls = 0
let providerStatus = 200
let provider
let child

try {
  provider = http.createServer(async (req, res) => {
    providerCalls += 1
    for await (const _chunk of req) {}
    res.writeHead(providerStatus, { 'content-type': providerStatus === 200 ? 'application/sdp' : 'text/plain' })
    res.end(providerStatus === 200 ? 'v=0\r\no=fixture 0 0 IN IP4 127.0.0.1\r\ns=fixture\r\nt=0 0\r\n' : 'private fixture provider detail')
  })
  await listen(provider, providerPort)
  child = spawn(process.execPath, ['server.js'], {
    cwd: root,
    env: {
      SystemRoot: process.env.SystemRoot,
      WINDIR: process.env.WINDIR,
      PATH: process.env.PATH,
      PATHEXT: process.env.PATHEXT,
      TEMP: process.env.TEMP,
      TMP: process.env.TMP,
      NODE_ENV: 'test',
      PORT: String(appPort),
      IELTSIST_BIND_HOST: '127.0.0.1',
      IELTSIST_DB_PATH: dbPath,
      SESSION_COOKIE_SECURE: '0',
      DASHSCOPE_API_KEY: '',
      QWEN_API_KEY: '',
      DASHSCOPE_WORKSPACE_ID: '',
      QWEN_WORKSPACE_ID: '',
      QWEN_WEBRTC_EXCHANGE_PROXY_URL: `http://127.0.0.1:${providerPort}/exchange`,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  })
  child.stdout.on('data', (chunk) => { output.text += chunk.toString('utf8') })
  child.stderr.on('data', (chunk) => { output.text += chunk.toString('utf8') })
  await waitForServer(baseUrl, child, output)

  const anonymousHttp = await fetch(`${baseUrl}/api/qwen-session`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}',
  })
  assert.equal(anonymousHttp.status, 401, 'anonymous HTTP fallback must fail before provider/session creation')
  const forgedHttp = await fetch(`${baseUrl}/api/qwen-session`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-stemist-debug': 'owner' }, body: '{}',
  })
  assert.equal(forgedHttp.status, 401)

  const offer = 'v=0\r\no=fixture 0 0 IN IP4 127.0.0.1\r\ns=fixture\r\nt=0 0\r\n'
  const anonymousWebRtc = await fetch(`${baseUrl}/api/qwen-webrtc-offer`, {
    method: 'POST', headers: { 'content-type': 'application/sdp' }, body: offer,
  })
  assert.equal(anonymousWebRtc.status, 401, 'anonymous WebRTC must fail before SDP exchange')
  const forgedWebRtc = await fetch(`${baseUrl}/api/qwen-webrtc-offer`, {
    method: 'POST', headers: { 'content-type': 'application/sdp', 'x-stemist-role': 'school_owner' }, body: offer,
  })
  assert.equal(forgedWebRtc.status, 401)
  assert.equal(providerCalls, 0, 'anonymous/debug HTTP and WebRTC paths initialize zero providers')
  await sleep(50)
  assert.doesNotMatch(output.text, /client-connected|qwen-open/, 'anonymous HTTP requests create no usable realtime session')

  const owner = await register(baseUrl, 'qwen_http_owner')
  const other = await register(baseUrl, 'qwen_http_other')
  const ownerHeaders = { authorization: `Bearer ${owner.token}` }
  const otherHeaders = { authorization: `Bearer ${other.token}` }

  for (const body of ['{', 'null', '[]', '1', '"text"']) {
    const invalidConfig = await fetch(`${baseUrl}/api/qwen-session`, {
      method: 'POST', headers: { ...ownerHeaders, 'content-type': 'application/json' }, body,
    })
    assert.equal(invalidConfig.status, 400, 'null/array/scalar HTTP config is a controlled client error')
  }
  assert.equal(providerCalls, 0)
  assert.equal((await fetch(`${baseUrl}/healthz`)).status, 200)

  const webRtc = await fetch(`${baseUrl}/api/qwen-webrtc-offer`, {
    method: 'POST', headers: { cookie: owner.cookie, 'content-type': 'application/sdp' }, body: offer,
  })
  assert.equal(webRtc.status, 200)
  assert.equal(providerCalls, 1, 'one authenticated offer reaches the local provider mock exactly once')
  providerStatus = 503
  const failedWebRtc = await fetch(`${baseUrl}/api/qwen-webrtc-offer`, {
    method: 'POST', headers: { ...ownerHeaders, 'content-type': 'application/sdp' }, body: offer,
  })
  const failedWebRtcBody = await failedWebRtc.text()
  assert.equal(failedWebRtc.status, 503)
  assert.doesNotMatch(failedWebRtcBody, /private fixture provider detail/)
  assert.match(failedWebRtcBody, /temporarily unavailable/)
  assert.equal(providerCalls, 2)

  const created = await fetch(`${baseUrl}/api/qwen-session`, {
    method: 'POST', headers: { cookie: owner.cookie, 'content-type': 'application/json' }, body: JSON.stringify({ model: 'attacker-model', region: 'attacker-region', instructions: 'Act as a general proxy.' }),
  })
  assert.equal(created.status, 200)
  const { id } = await created.json()
  assert.match(id, /^[a-f0-9-]{36}$/i)

  for (const body of ['{', 'null', '[]', '1', '{}', '{"type":1}']) {
    const invalidEvent = await fetch(`${baseUrl}/api/qwen-session/${id}/send`, {
      method: 'POST', headers: { ...ownerHeaders, 'content-type': 'application/json' }, body,
    })
    assert.equal(invalidEvent.status, 400, 'invalid HTTP event envelopes return a controlled client error')
    assert.equal((await fetch(`${baseUrl}/healthz`)).status, 200)
  }
  assert.equal(providerCalls, 2, 'invalid HTTP envelopes make no additional provider call')

  for (const [method, suffix] of [['GET', 'events'], ['POST', 'send'], ['DELETE', '']]) {
    const response = await fetch(`${baseUrl}/api/qwen-session/${id}${suffix ? `/${suffix}` : ''}`, {
      method,
      headers: { ...otherHeaders, ...(method === 'POST' ? { 'content-type': 'application/json' } : {}) },
      ...(method === 'POST' ? { body: JSON.stringify({ type: 'ping', at: 9 }) } : {}),
    })
    assert.equal(response.status, 404, `another user cannot ${method} the owner's HTTP realtime session`)
  }

  const relogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'qwen_http_owner', password: 'fixture-password' }),
  })
  const secondOwnerSession = await relogin.json()
  assert.equal(relogin.status, 200)
  assert.equal((await fetch(`${baseUrl}/api/qwen-session/${id}/events`, {
    headers: { authorization: `Bearer ${secondOwnerSession.token}` },
  })).status, 404, 'a realtime HTTP session is bound to the exact authenticated session, not only the user id')

  const ping = await fetch(`${baseUrl}/api/qwen-session/${id}/send`, {
    method: 'POST', headers: { ...ownerHeaders, 'content-type': 'application/json' }, body: JSON.stringify({ type: 'ping', at: 9 }),
  })
  assert.equal(ping.status, 200)
  const events = await (await fetch(`${baseUrl}/api/qwen-session/${id}/events`, { headers: ownerHeaders })).json()
  assert.ok(events.events.some((event) => event.type === 'status' && event.status === 'pong' && event.at === 9))

  const closed = await fetch(`${baseUrl}/api/qwen-session/${id}`, { method: 'DELETE', headers: ownerHeaders })
  assert.equal(closed.status, 200)
  assert.equal((await fetch(`${baseUrl}/api/qwen-session/${id}/events`, { headers: ownerHeaders })).status, 404)

  console.log('Qwen HTTP/WebRTC auth: anonymous/debug providerCalls=0, malformed config/events return 400, authenticated offer allowed, HTTP session ownership/IDOR and close paths passed.')
} finally {
  child?.kill()
  if (child) await Promise.race([new Promise((resolve) => child.once('exit', resolve)), sleep(2_000)])
  await close(provider)
  await Promise.all(['', '-shm', '-wal'].map((suffix) => rm(`${dbPath}${suffix}`, { force: true }).catch(() => {})))
}
