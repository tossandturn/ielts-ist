import assert from 'node:assert/strict'
import net from 'node:net'
import { spawn } from 'node:child_process'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import WebSocket from 'ws'

const root = new URL('../', import.meta.url)
const dbPath = join(tmpdir(), `ieltsist-qwen-auth-${process.pid}-${randomUUID()}.sqlite`)
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
  throw new Error('server did not become healthy')
}

function websocketAttempt(url, headers = {}) {
  return new Promise((resolve) => {
    let settled = false
    const finish = (result) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(result)
    }
    const ws = new WebSocket(url, { headers, handshakeTimeout: 3_000 })
    const timer = setTimeout(() => { ws.terminate(); finish({ opened: false, status: 0 }) }, 4_000)
    ws.once('open', () => { ws.close(); finish({ opened: true, status: 101 }) })
    ws.once('unexpected-response', (_request, response) => { response.resume(); finish({ opened: false, status: response.statusCode }) })
    ws.once('error', () => finish({ opened: false, status: 0 }))
  })
}

function websocketPing(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url, { headers, handshakeTimeout: 3_000 })
    const timer = setTimeout(() => { ws.terminate(); reject(new Error('authenticated websocket ping timed out')) }, 4_000)
    ws.once('open', () => ws.send(JSON.stringify({ type: 'ping', at: 12345 })))
    ws.on('message', (raw) => {
      let message
      try { message = JSON.parse(raw.toString('utf8')) } catch { return }
      if (message.type !== 'status' || message.status !== 'pong') return
      clearTimeout(timer)
      ws.close()
      resolve(message)
    })
    ws.once('unexpected-response', (_request, response) => {
      response.resume()
      clearTimeout(timer)
      reject(new Error(`authenticated websocket rejected with ${response.statusCode}`))
    })
    ws.once('error', (error) => { clearTimeout(timer); reject(error) })
  })
}

function websocketInvalidEnvelope(url, headers, payload) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url, { headers, handshakeTimeout: 3_000 })
    let safeError = ''
    const timer = setTimeout(() => { ws.terminate(); reject(new Error('invalid envelope was not rejected')) }, 4_000)
    ws.once('open', () => ws.send(payload))
    ws.on('message', (raw) => {
      try {
        const message = JSON.parse(raw.toString('utf8'))
        if (message.type === 'error') safeError = String(message.message || '')
      } catch {}
    })
    ws.once('close', (code) => { clearTimeout(timer); resolve({ code, safeError }) })
    ws.once('error', (error) => { clearTimeout(timer); reject(error) })
  })
}

const port = await freePort()
const baseUrl = `http://127.0.0.1:${port}`
const wsUrl = `ws://127.0.0.1:${port}/qwen-client`
const output = { text: '' }
let child

try {
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
      PORT: String(port),
      IELTSIST_BIND_HOST: '127.0.0.1',
      IELTSIST_DB_PATH: dbPath,
      SESSION_COOKIE_SECURE: '0',
      DASHSCOPE_API_KEY: '',
      QWEN_API_KEY: '',
      DASHSCOPE_WORKSPACE_ID: '',
      QWEN_WORKSPACE_ID: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  })
  child.stdout.on('data', (chunk) => { output.text += chunk.toString('utf8') })
  child.stderr.on('data', (chunk) => { output.text += chunk.toString('utf8') })
  await waitForServer(baseUrl, child, output)

  const anonymous = await websocketAttempt(wsUrl)
  assert.equal(anonymous.opened, false, 'anonymous websocket must be rejected before connection/provider setup')
  assert.equal(anonymous.status, 401)
  const forgedDebug = await websocketAttempt(wsUrl, { 'x-stemist-debug': 'owner', 'x-stemist-role': 'school_owner' })
  assert.equal(forgedDebug.opened, false, 'client debug/role headers are not authorization')
  assert.equal(forgedDebug.status, 401)
  const forgedTicketRequest = await fetch(`${baseUrl}/api/speaking/realtime-ticket`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-stemist-debug': 'owner', 'x-stemist-role': 'school_owner' },
    body: '{}',
  })
  assert.equal(forgedTicketRequest.status, 401)
  await sleep(50)
  assert.doesNotMatch(output.text, /client-connected|qwen-open/, 'anonymous rejection must initialize zero providers')

  const registration = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'qwen_auth_fixture', password: 'fixture-password' }),
  })
  assert.equal(registration.status, 200)
  const account = await registration.json()
  const cookie = String(registration.headers.get('set-cookie') || '').split(';')[0]
  assert.match(account.token, /^[A-Za-z0-9_-]{32,128}$/)
  assert.match(cookie, /^ieltsist_session=/)

  const ticketResponse = await fetch(`${baseUrl}/api/speaking/realtime-ticket`, {
    method: 'POST',
    headers: { authorization: `Bearer ${account.token}`, 'content-type': 'application/json' },
    body: '{}',
  })
  assert.equal(ticketResponse.status, 201)
  const ticket = await ticketResponse.json()
  assert.equal(ticket.protocol, 'ielts-realtime-ticket-v1')
  assert.equal(ticket.purpose, 'qwen-speaking')
  assert.match(ticket.ticket, /^[A-Za-z0-9_-]{32,128}$/)
  assert.ok(Date.parse(ticket.expiresAt) - Date.now() <= 20_000)

  const invalid = await websocketAttempt(wsUrl, { 'x-stemist-realtime-ticket': 'invalid-ticket-value-that-is-long-enough-123456' })
  assert.equal(invalid.opened, false)
  assert.equal(invalid.status, 401)

  const pong = await websocketPing(wsUrl, { 'x-stemist-realtime-ticket': ticket.ticket })
  assert.equal(pong.at, 12345)
  const replay = await websocketAttempt(wsUrl, { 'x-stemist-realtime-ticket': ticket.ticket })
  assert.equal(replay.opened, false, 'a consumed ticket cannot open a second websocket')
  assert.equal(replay.status, 401)

  for (const payload of ['{', 'null', '[]', '1', '{}', '{"type":1}']) {
    const envelopeTicketResponse = await fetch(`${baseUrl}/api/speaking/realtime-ticket`, {
      method: 'POST',
      headers: { authorization: `Bearer ${account.token}`, 'content-type': 'application/json' },
      body: '{}',
    })
    assert.equal(envelopeTicketResponse.status, 201)
    const envelopeTicket = await envelopeTicketResponse.json()
    const rejected = await websocketInvalidEnvelope(wsUrl, { 'x-stemist-realtime-ticket': envelopeTicket.ticket }, payload)
    assert.equal(rejected.code, 1008)
    assert.match(rejected.safeError, /message format is invalid/i)
    assert.equal((await fetch(`${baseUrl}/healthz`)).status, 200, 'malformed authenticated messages cannot stop the service')
  }
  assert.doesNotMatch(output.text, /qwen-open|key or workspace is not configured/, 'invalid envelopes initialize zero providers')

  const cookieWithoutOrigin = await websocketAttempt(wsUrl, { cookie })
  assert.equal(cookieWithoutOrigin.opened, false, 'browser cookies require a same-origin handshake')
  assert.equal(cookieWithoutOrigin.status, 401)
  const browserPong = await websocketPing(wsUrl, { cookie, origin: baseUrl })
  assert.equal(browserPong.status, 'pong', 'the existing same-origin browser cookie remains compatible')

  const revokedTicketResponse = await fetch(`${baseUrl}/api/speaking/realtime-ticket`, {
    method: 'POST',
    headers: { authorization: `Bearer ${account.token}`, 'content-type': 'application/json' },
    body: '{}',
  })
  const revokedTicket = await revokedTicketResponse.json()
  const logout = await fetch(`${baseUrl}/api/auth/logout`, { method: 'POST', headers: { authorization: `Bearer ${account.token}` } })
  assert.equal(logout.status, 200)
  const revoked = await websocketAttempt(wsUrl, { 'x-stemist-realtime-ticket': revokedTicket.ticket })
  assert.equal(revoked.opened, false, 'logout revokes an unconsumed realtime ticket')
  assert.equal(revoked.status, 401)

  console.log('Qwen websocket auth: anonymous/forged-debug/invalid/replayed/revoked access rejected, malformed envelopes isolated with service alive, native ticket and browser cookie accepted, providerCalls=0 before authorization.')
} finally {
  child?.kill()
  if (child) await Promise.race([new Promise((resolve) => child.once('exit', resolve)), sleep(2_000)])
  await Promise.all(['', '-shm', '-wal'].map((suffix) => rm(`${dbPath}${suffix}`, { force: true }).catch(() => {})))
}
