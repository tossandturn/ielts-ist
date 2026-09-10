import WebSocket from 'ws'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const {
  buildQwenDirectSession,
  parseQwenDirectConfig,
  parseQwenDirectRequest,
  parseQwenTemporaryToken,
} = require('../server/qwenDirectSession.cjs')

function smokeError(code) {
  return Object.assign(new Error(code), { safeCode: code })
}

async function issueTemporaryToken(config) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8_000)
  try {
    let response
    try {
      response = await fetch(config.tokenEndpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.apiKey}` },
        redirect: 'error',
        signal: controller.signal,
      })
    } catch { throw smokeError('token_request_failed') }
    if (!response.ok) {
      try { await response.body?.cancel() } catch {}
      throw smokeError(`token_http_${response.status}`)
    }
    try { return parseQwenTemporaryToken(await response.json()) } catch { throw smokeError('token_response_invalid') }
  } finally {
    clearTimeout(timer)
  }
}

function waitForSessionUpdated(config, contract) {
  return new Promise((resolve, reject) => {
    let opened = false
    let updated = false
    let settled = false
    let timer
    const socket = new WebSocket(config.endpoint, {
      headers: { Authorization: `Bearer ${contract.token}` },
      handshakeTimeout: 15_000,
    })
    const finish = (error) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      try { socket.close(1000, 'readiness check complete') } catch {}
      if (error) reject(error)
      else resolve({ opened, updated })
    }
    timer = setTimeout(() => finish(smokeError('session_updated_timeout')), 18_000)
    socket.once('open', () => {
      opened = true
      socket.send(JSON.stringify(contract.sessionUpdate))
    })
    socket.on('message', (raw) => {
      let event
      try { event = JSON.parse(raw.toString('utf8')) } catch { return }
      if (event?.type === 'session.updated') {
        updated = true
        finish()
      } else if (event?.type === 'error') finish(smokeError('provider_event_error'))
    })
    socket.once('unexpected-response', (_request, response) => {
      response.resume()
      finish(smokeError(`websocket_http_${response.statusCode || 0}`))
    })
    socket.once('error', () => finish(smokeError('websocket_connection_failed')))
    socket.once('close', () => {
      if (!updated) finish(smokeError('websocket_closed_before_ready'))
    })
  })
}

async function main() {
  const config = parseQwenDirectConfig(process.env)
  if (!config) throw smokeError('direct_config_unavailable')
  const temporaryToken = await issueTemporaryToken(config)
  const request = parseQwenDirectRequest({})
  const contract = buildQwenDirectSession({ config, request, temporaryToken })
  const result = await waitForSessionUpdated(config, contract)
  console.log(JSON.stringify({
    ok: true,
    temporaryTokenIssued: true,
    websocketOpened: result.opened,
    sessionUpdated: result.updated,
    audioSent: false,
    responseRequested: false,
  }))
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, code: error?.safeCode || 'direct_smoke_failed' }))
  process.exitCode = 1
})
