const {
  qwenResponsePolicy,
  qwenSessionPolicy,
} = require('./qwenRealtimeAccess.cjs')

const DIRECT_PROTOCOL = 'qwen-direct-session-v1'
const DIRECT_TOKEN_ENDPOINT = 'https://dashscope.aliyuncs.com/api/v1/tokens?expire_in_seconds=60'
const DIRECT_MODELS = new Set(['qwen3.5-omni-flash-realtime', 'qwen3.5-omni-plus-realtime'])
const DIRECT_REQUEST_KEYS = new Set(['taskId', 'recovery', 'completedDialogue', 'elapsedSeconds'])

function directError(message, statusCode, code) {
  return Object.assign(new Error(message), { statusCode, code })
}

function parseQwenDirectConfig(env = {}) {
  const enabled = ['1', 'true'].includes(String(env.QWEN_DIRECT_ENABLED || '').trim().toLowerCase())
  const apiKey = String(env.QWEN_DIRECT_API_KEY || '').trim()
  const workspaceId = String(env.QWEN_DIRECT_WORKSPACE_ID || '').trim()
  const model = String(env.QWEN_DIRECT_MODEL || '').trim()
  if (!enabled || !apiKey || !workspaceId || !DIRECT_MODELS.has(model)) return null
  const broadKeys = [env.DASHSCOPE_API_KEY, env.QWEN_API_KEY].map((value) => String(value || '').trim()).filter(Boolean)
  if (broadKeys.includes(apiKey)) return null
  if (/^s[kt]-/i.test(workspaceId)) return null
  if (!/^(?=.{3,63}$)[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/.test(workspaceId)) return null
  let tokenEndpoint = DIRECT_TOKEN_ENDPOINT
  if (env.NODE_ENV === 'test' && env.QWEN_DIRECT_TOKEN_ENDPOINT) {
    try {
      const candidate = new URL(String(env.QWEN_DIRECT_TOKEN_ENDPOINT))
      if (!['127.0.0.1', 'localhost'].includes(candidate.hostname) || candidate.protocol !== 'http:') return null
      tokenEndpoint = candidate.toString()
    } catch { return null }
  }
  return Object.freeze({
    apiKey,
    workspaceId,
    model,
    tokenEndpoint,
    endpoint: `wss://${workspaceId}.cn-beijing.maas.aliyuncs.com/api-ws/v1/realtime?model=${encodeURIComponent(model)}`,
  })
}

function parseQwenDirectRequest(value, { resolveTask = () => null } = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw directError('Direct speaking session configuration is invalid.', 400, 'direct_session_invalid')
  }
  if (Object.keys(value).some((key) => !DIRECT_REQUEST_KEYS.has(key))) {
    throw directError('Direct speaking session configuration is invalid.', 400, 'direct_session_invalid')
  }
  if (value.taskId !== undefined && typeof value.taskId !== 'string') {
    throw directError('Direct speaking session configuration is invalid.', 400, 'direct_session_invalid')
  }
  if (value.recovery !== undefined && typeof value.recovery !== 'boolean') {
    throw directError('Direct speaking session configuration is invalid.', 400, 'direct_session_invalid')
  }
  if (value.elapsedSeconds !== undefined
    && (!Number.isInteger(value.elapsedSeconds) || value.elapsedSeconds < 0 || value.elapsedSeconds > 1_200)) {
    throw directError('Direct speaking session configuration is invalid.', 400, 'direct_session_invalid')
  }
  if (value.completedDialogue !== undefined && !Array.isArray(value.completedDialogue)) {
    throw directError('Direct speaking session configuration is invalid.', 400, 'direct_session_invalid')
  }

  const taskId = String(value.taskId || '').trim()
  const task = taskId ? resolveTask(taskId) : null
  if (taskId && !task) throw directError('Speaking task not found.', 404, 'direct_task_not_found')
  const completedDialogue = (value.completedDialogue || []).slice(-16).map((turn) => {
    if (!turn || typeof turn !== 'object' || !['user', 'assistant'].includes(turn.role) || typeof turn.text !== 'string') {
      throw directError('Direct speaking session configuration is invalid.', 400, 'direct_session_invalid')
    }
    return { role: turn.role, text: turn.text.trim().slice(0, 500) }
  }).filter((turn) => turn.text)
  const elapsedSeconds = value.elapsedSeconds || 0
  const context = {
    recovery: value.recovery === true,
    ...(task ? { task: {
      title: String(task.title || '').trim().slice(0, 240),
      part1: Array.isArray(task.part1) ? task.part1 : [],
      part2: String(task.part2 || '').trim().slice(0, 1_600),
      part3: Array.isArray(task.part3) ? task.part3 : [],
    } } : {}),
    ...(completedDialogue.length ? { completedDialogue } : {}),
    elapsedSeconds,
  }
  return Object.freeze({ taskId, context: Object.freeze(context) })
}

function parseQwenTemporaryToken(value, { now = Date.now } = {}) {
  const token = String(value && value.token || '').trim()
  const expiresAtSeconds = Number(value && value.expires_at)
  const nowMs = Number(now())
  const expiresAtMs = expiresAtSeconds * 1_000
  if (!/^st-[A-Za-z0-9._~-]{16,1024}$/.test(token)
    || !Number.isSafeInteger(expiresAtSeconds)
    || !Number.isFinite(nowMs)
    || expiresAtMs <= nowMs
    || expiresAtMs > nowMs + 120_000) {
    throw directError('The upstream temporary token response is invalid.', 503, 'direct_token_unavailable')
  }
  return Object.freeze({ token, expiresAt: new Date(expiresAtMs).toISOString() })
}

function responseTemplate(policy) {
  return Object.freeze({
    type: 'response.create',
    response: Object.freeze({ modalities: policy.modalities, instructions: policy.instructions }),
  })
}

function buildQwenDirectSession({ config, request, temporaryToken } = {}) {
  if (!config || !request || !temporaryToken) throw new TypeError('Direct session inputs are required.')
  const session = qwenSessionPolicy({ context: request.context })
  return Object.freeze({
    protocol: DIRECT_PROTOCOL,
    endpoint: config.endpoint,
    token: temporaryToken.token,
    expiresAt: temporaryToken.expiresAt,
    sessionUpdate: Object.freeze({
      type: 'session.update',
      session: Object.freeze({
        modalities: ['text', 'audio'],
        voice: session.voice,
        input_audio_format: 'pcm',
        output_audio_format: 'pcm',
        input_audio_transcription: Object.freeze({ model: 'qwen3-asr-flash-realtime' }),
        turn_detection: session.turnDetection,
        instructions: session.instructions,
      }),
    }),
    responses: Object.freeze({
      opening: responseTemplate(qwenResponsePolicy({ intent: 'opening' })),
      next: responseTemplate(qwenResponsePolicy({ intent: 'next-question' })),
      assessment: responseTemplate(qwenResponsePolicy({ intent: 'assessment' })),
    }),
    inputSampleRate: 16_000,
    outputSampleRate: 24_000,
    maxSessionSeconds: 1_200,
  })
}

function createQwenDirectSessionLimiter(options = {}) {
  const now = typeof options.now === 'function' ? options.now : Date.now
  const maxInFlight = Math.max(1, Number(options.maxInFlight) || 8)
  const perUserPerMinute = Math.max(1, Number(options.perUserPerMinute) || 3)
  const perIpPerMinute = Math.max(1, Number(options.perIpPerMinute) || 30)
  const perUserPerWindow = Math.max(perUserPerMinute, Number(options.perUserPerWindow) || 8)
  const windowMs = Math.max(60_000, Number(options.windowMs) || 20 * 60_000)
  const userMinute = new Map()
  const userWindow = new Map()
  const ipMinute = new Map()
  const usersInFlight = new Set()
  let totalInFlight = 0

  function rate(map, key, duration, at) {
    const existing = map.get(key)
    if (existing && existing.untilMs > at) return existing
    const fresh = { count: 0, untilMs: at + duration }
    map.set(key, fresh)
    return fresh
  }

  function reject(untilMs, at) {
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((untilMs - at) / 1_000)) }
  }

  function prune(at) {
    for (const map of [userMinute, userWindow, ipMinute]) {
      for (const [key, value] of map) if (!value || value.untilMs <= at) map.delete(key)
    }
  }

  function begin({ userId, ip = '' } = {}) {
    const at = Number(now())
    const normalizedUserId = Number(userId)
    const normalizedIp = String(ip || 'unknown').trim().slice(0, 160) || 'unknown'
    if (!Number.isSafeInteger(normalizedUserId) || normalizedUserId < 1) return reject(at + 60_000, at)
    prune(at)
    if (usersInFlight.has(normalizedUserId) || totalInFlight >= maxInFlight) return reject(at + 1_000, at)
    const minute = rate(userMinute, normalizedUserId, 60_000, at)
    const window = rate(userWindow, normalizedUserId, windowMs, at)
    const ipRate = rate(ipMinute, normalizedIp, 60_000, at)
    if (minute.count >= perUserPerMinute) return reject(minute.untilMs, at)
    if (window.count >= perUserPerWindow) return reject(window.untilMs, at)
    if (ipRate.count >= perIpPerMinute) return reject(ipRate.untilMs, at)
    minute.count += 1
    window.count += 1
    ipRate.count += 1
    usersInFlight.add(normalizedUserId)
    totalInFlight += 1
    let released = false
    return {
      ok: true,
      release() {
        if (released) return
        released = true
        usersInFlight.delete(normalizedUserId)
        totalInFlight = Math.max(0, totalInFlight - 1)
      },
    }
  }

  return Object.freeze({ begin })
}

function qwenDirectProviderFailure({ statusCode = 0, errorCode = '' } = {}) {
  const status = Number(statusCode)
  if ([401, 403].includes(status)) {
    return { statusCode: 503, code: 'direct_not_configured', retryable: false, error: 'Direct speaking is not configured.' }
  }
  const retryable = status >= 500 || ['ETIMEDOUT', 'ECONNRESET', 'EAI_AGAIN', 'ECONNREFUSED'].includes(String(errorCode || '').toUpperCase())
  return {
    statusCode: 503,
    code: 'direct_token_unavailable',
    retryable: status === 429 ? false : retryable,
    error: 'Direct speaking authorization is temporarily unavailable.',
  }
}

module.exports = {
  buildQwenDirectSession,
  createQwenDirectSessionLimiter,
  parseQwenDirectConfig,
  parseQwenDirectRequest,
  parseQwenTemporaryToken,
  qwenDirectProviderFailure,
}
