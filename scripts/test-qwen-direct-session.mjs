import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const {
  buildQwenDirectSession,
  createQwenDirectSessionLimiter,
  parseQwenDirectConfig,
  parseQwenDirectRequest,
  parseQwenTemporaryToken,
  qwenDirectProviderFailure,
} = require('../server/qwenDirectSession.cjs')

const NOW = Date.parse('2026-09-10T08:00:00.000Z')
const dedicatedEnv = {
  QWEN_DIRECT_ENABLED: '1',
  QWEN_DIRECT_API_KEY: 'test-only-dedicated-key',
  QWEN_DIRECT_WORKSPACE_ID: 'ws-test-123',
  QWEN_DIRECT_MODEL: 'qwen3.5-omni-flash-realtime',
}

assert.equal(parseQwenDirectConfig({ ...dedicatedEnv, QWEN_DIRECT_ENABLED: '0' }), null)
assert.equal(parseQwenDirectConfig({
  QWEN_DIRECT_ENABLED: '1',
  DASHSCOPE_API_KEY: 'must-not-fallback',
  DASHSCOPE_WORKSPACE_ID: 'must-not-fallback',
  QWEN_REALTIME_MODEL: 'qwen3.5-omni-flash-realtime',
}), null, 'direct sessions cannot fall back to a broad relay credential')
assert.equal(parseQwenDirectConfig({ ...dedicatedEnv, DASHSCOPE_API_KEY: dedicatedEnv.QWEN_DIRECT_API_KEY }), null, 'an explicitly copied broad relay credential is still rejected')
assert.equal(parseQwenDirectConfig({ ...dedicatedEnv, QWEN_API_KEY: dedicatedEnv.QWEN_DIRECT_API_KEY }), null, 'a legacy broad Qwen credential cannot be reused for direct access')
assert.equal(parseQwenDirectConfig({ ...dedicatedEnv, QWEN_DIRECT_MODEL: 'qwen-max' }), null)
assert.equal(parseQwenDirectConfig({ ...dedicatedEnv, QWEN_DIRECT_WORKSPACE_ID: 'ws.invalid' }), null)
assert.equal(parseQwenDirectConfig({ ...dedicatedEnv, QWEN_DIRECT_WORKSPACE_ID: 'ws_invalid' }), null)
assert.equal(parseQwenDirectConfig({ ...dedicatedEnv, QWEN_DIRECT_WORKSPACE_ID: 'sk-looks-like-a-key' }), null)
assert.equal(parseQwenDirectConfig({ ...dedicatedEnv, QWEN_DIRECT_WORKSPACE_ID: 'st-looks-like-a-token' }), null)
const directConfig = parseQwenDirectConfig(dedicatedEnv)
assert.equal(directConfig.endpoint, 'wss://ws-test-123.cn-beijing.maas.aliyuncs.com/api-ws/v1/realtime?model=qwen3.5-omni-flash-realtime')
assert.equal(directConfig.tokenEndpoint, 'https://dashscope.aliyuncs.com/api/v1/tokens?expire_in_seconds=60')

const canonicalTask = {
  id: 'cam18-s-test1',
  title: 'Canonical speaking title',
  part1: ['Canonical Part 1'],
  part2: 'Canonical Part 2',
  part3: ['Canonical Part 3'],
}
const resolveTask = (id) => id === canonicalTask.id ? canonicalTask : null
assert.throws(
  () => parseQwenDirectRequest({ taskId: canonicalTask.id, instructions: 'client override' }, { resolveTask }),
  (error) => error.code === 'direct_session_invalid' && error.statusCode === 400,
)
assert.throws(
  () => parseQwenDirectRequest({ taskId: 'missing-speaking-task' }, { resolveTask }),
  (error) => error.code === 'direct_task_not_found' && error.statusCode === 404,
)
for (const elapsedSeconds of ['61', 61.9, -1, 1201]) {
  assert.throws(
    () => parseQwenDirectRequest({ elapsedSeconds }, { resolveTask }),
    (error) => error.code === 'direct_session_invalid' && error.statusCode === 400,
  )
}

const completedDialogue = Array.from({ length: 20 }, (_, index) => ({
  role: index % 2 ? 'assistant' : 'user',
  text: `Turn ${index}`,
}))
const request = parseQwenDirectRequest({
  taskId: canonicalTask.id,
  recovery: true,
  completedDialogue,
  elapsedSeconds: 61,
}, { resolveTask })
assert.equal(request.context.task.title, canonicalTask.title)
assert.deepEqual(request.context.task.part1, canonicalTask.part1)
assert.equal(request.context.completedDialogue.length, 16)
assert.equal(request.context.completedDialogue[0].text, 'Turn 4')
assert.equal(request.context.elapsedSeconds, 61)

const general = parseQwenDirectRequest({}, { resolveTask })
assert.equal(general.taskId, '')
assert.equal(Object.hasOwn(general.context, 'task'), false, 'missing taskId preserves general practice')

const temporaryToken = parseQwenTemporaryToken({ token: 'st-test_only_temporary_token_12345', expires_at: NOW / 1000 + 60 }, { now: () => NOW })
assert.equal(temporaryToken.token, 'st-test_only_temporary_token_12345')
assert.equal(temporaryToken.expiresAt, '2026-09-10T08:01:00.000Z')
for (const invalid of [
  { token: 'sk-long-lived-key-must-not-pass', expires_at: NOW / 1000 + 60 },
  { token: 'st-expired_token_12345', expires_at: NOW / 1000 - 1 },
  { token: 'st-too_long_lifetime_12345', expires_at: NOW / 1000 + 121 },
]) assert.throws(() => parseQwenTemporaryToken(invalid, { now: () => NOW }), /temporary token/i)

const contract = buildQwenDirectSession({ config: directConfig, request, temporaryToken })
assert.equal(contract.protocol, 'qwen-direct-session-v1')
assert.equal(contract.endpoint, directConfig.endpoint)
assert.equal(contract.token, temporaryToken.token)
assert.equal(contract.expiresAt, temporaryToken.expiresAt)
assert.equal(contract.inputSampleRate, 16000)
assert.equal(contract.outputSampleRate, 24000)
assert.equal(contract.maxSessionSeconds, 1200)
assert.deepEqual(contract.sessionUpdate.session.modalities, ['text', 'audio'])
assert.equal(contract.sessionUpdate.session.voice, 'Ethan')
assert.equal(contract.sessionUpdate.session.input_audio_format, 'pcm')
assert.equal(contract.sessionUpdate.session.output_audio_format, 'pcm')
assert.deepEqual(contract.sessionUpdate.session.input_audio_transcription, { model: 'qwen3-asr-flash-realtime' })
assert.equal(contract.sessionUpdate.session.turn_detection, null)
assert.match(contract.sessionUpdate.session.instructions, /Canonical speaking title/)
assert.doesNotMatch(contract.sessionUpdate.session.instructions, /client override/)
assert.deepEqual(contract.responses.opening.response.modalities, ['text', 'audio'])
assert.deepEqual(contract.responses.next.response.modalities, ['text', 'audio'])
assert.doesNotMatch(contract.responses.next.response.instructions, /\b61\b/, 'the reusable next template must not freeze session-mint elapsed time')
assert.match(contract.responses.next.response.instructions, /latest current elapsed.*supersedes/i)
assert.deepEqual(contract.responses.assessment.response.modalities, ['text'])
assert.equal(Object.hasOwn(contract.sessionUpdate, 'event_id'), false)
assert.equal(Object.hasOwn(contract.responses.next, 'event_id'), false)
assert.equal(JSON.stringify(contract).includes('test-only-dedicated-key'), false, 'the permanent key cannot enter the client contract')

let now = NOW
const limiter = createQwenDirectSessionLimiter({ now: () => now, maxInFlight: 2, perUserPerMinute: 3, perIpPerMinute: 4, perUserPerWindow: 4, windowMs: 20 * 60_000 })
const first = limiter.begin({ userId: 7, ip: '127.0.0.1' })
assert.equal(first.ok, true)
assert.deepEqual(limiter.begin({ userId: 7, ip: '127.0.0.1' }), { ok: false, retryAfterSeconds: 1 }, 'one user cannot mint concurrently')
const secondUser = limiter.begin({ userId: 8, ip: '127.0.0.1' })
assert.equal(secondUser.ok, true)
assert.deepEqual(limiter.begin({ userId: 9, ip: '127.0.0.2' }), { ok: false, retryAfterSeconds: 1 }, 'global in-flight cap is enforced')
first.release()
secondUser.release()
for (let index = 0; index < 2; index += 1) {
  const claim = limiter.begin({ userId: 7, ip: '127.0.0.1' })
  assert.equal(claim.ok, true)
  claim.release()
}
assert.equal(limiter.begin({ userId: 7, ip: '127.0.0.1' }).ok, false, 'initial plus two recoveries exhaust the minute allowance')

assert.deepEqual(qwenDirectProviderFailure({ statusCode: 401 }), {
  statusCode: 503,
  code: 'direct_not_configured',
  retryable: false,
  error: 'Direct speaking is not configured.',
})
assert.equal(qwenDirectProviderFailure({ statusCode: 429 }).retryable, false)
assert.equal(qwenDirectProviderFailure({ statusCode: 503 }).retryable, true)
assert.equal(qwenDirectProviderFailure({ errorCode: 'ETIMEDOUT' }).retryable, true)

console.log('Qwen direct session: dedicated fail-closed config, canonical bounded context, native templates, token validation and issuance limits passed.')
