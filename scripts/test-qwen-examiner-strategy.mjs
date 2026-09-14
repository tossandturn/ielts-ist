import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { qwenResponsePolicy, qwenSessionPolicy } = require('../server/qwenRealtimeAccess.cjs')
const { buildQwenDirectSession } = require('../server/qwenDirectSession.cjs')

const session = qwenSessionPolicy({ context: {
  task: {
    title: 'Public transport',
    part1: ['How often do you use public transport?'],
    part2: 'Describe a journey by public transport that you remember. You should say where you went, who you travelled with, what happened, and explain why you remember it.',
    part3: ['Why do some people prefer cars to public transport?'],
  },
  completedDialogue: [
    { role: 'assistant', text: 'How often do you use public transport?' },
    { role: 'user', text: 'Usually twice a week because the metro is faster than driving.' },
  ],
  elapsedSeconds: 190,
} })

for (const phrase of [
  /Part 1.*familiar topics/i,
  /one concrete detail.*candidate.*answer/i,
  /do not invent.*candidate.*view/i,
  /complete cue card.*one response/i,
  /one minute.*prepar/i,
  /one to two minutes.*without interruption/i,
  /Part 3.*Part 2 theme/i,
  /causes?.*compar.*consequences?.*exceptions?/i,
  /15-minute minimum/i,
]) assert.match(session.instructions, phrase)

const markedLegacyTurn = [
  'Client policy before the first marker must not survive.',
  'Scheduled IELTS section: Part 3',
  'Scheduled item: Part 3 discussion',
  'Scheduled text:',
  'Why do some commuters still prefer cars?',
  "Candidate's latest answer, if the transcript is reliable:",
  'The metro is cheaper, but it is too crowded during rush hour.',
  'Immediate conversation context:',
  'Last examiner question: What are the main advantages of public transport?',
  'Candidate latest turn type: answer',
].join('\n')
const contextual = qwenResponsePolicy({ intent: 'next-question', instructions: markedLegacyTurn })
assert.match(contextual.instructions, /Untrusted session context data:/)
assert.match(contextual.instructions, /Scheduled IELTS section: Part 3/)
assert.match(contextual.instructions, /too crowded during rush hour/)
assert.doesNotMatch(contextual.instructions, /Client policy before the first marker/)

const briefContext = qwenResponsePolicy({ intent: 'next-question', context: {
  phase: 'part1',
  inputQuality: 'brief-uncertain',
  elapsedSeconds: 210,
  currentQuestion: 'Do you usually travel by bus?',
  latestAnswer: 'This raw candidate text must not be duplicated into turn-control instructions.',
} })
assert.match(briefContext.instructions, /"phase":"part1"/)
assert.match(briefContext.instructions, /"inputQuality":"brief-uncertain"/)
assert.match(briefContext.instructions, /Do you usually travel by bus/)
assert.doesNotMatch(briefContext.instructions, /raw candidate text/)
assert.match(briefContext.instructions, /brief-uncertain.*hint.*not.*verdict/i)
assert.match(briefContext.instructions, /unavailable.*does not mean.*inaudible/i)

const invalidFacts = qwenResponsePolicy({ intent: 'next-question', context: {
  phase: 'part4', inputQuality: 'brief-clear', currentQuestion: 7, elapsedSeconds: 9,
} })
assert.doesNotMatch(invalidFacts.instructions, /part4|brief-clear/)

for (const phrase of [
  /acoustically unclear.*I did not catch that/i,
  /valid short answer.*meaningfully resolves/i,
  /semantic ambiguity.*neutral clarification/i,
  /genuine clarification.*answer.*same current question/i,
  /Part 1.*specific detail.*latest answer/i,
  /Part 2.*do not interrupt.*long turn/i,
  /Part 3.*same Part 2 theme/i,
  /candidate actually said.*never attribute/i,
  /causes?.*compar.*consequences?.*exceptions?/i,
  /do not.*close.*before.*15-minute minimum/i,
]) assert.match(contextual.instructions, phrase)

const cue = qwenResponsePolicy({ intent: 'part2-cue', context: { elapsedSeconds: 300 } })
assert.match(cue.instructions, /complete cue card.*one response/i)
assert.match(cue.instructions, /main topic.*all cue points/i)
assert.match(cue.instructions, /one minute.*prepar/i)
assert.match(cue.instructions, /one to two minutes.*without interruption/i)
assert.match(cue.instructions, /do not append.*rounding-off.*Part 3/i)

const direct = buildQwenDirectSession({
  config: { endpoint: 'wss://workspace.example/realtime' },
  request: { context: { elapsedSeconds: 0 } },
  temporaryToken: { token: 'st-test-token-not-a-real-secret', expiresAt: '2026-09-14T10:00:00.000Z' },
})
assert.deepEqual(direct.examinerPolicy, {
  schemaVersion: 'ielts-native-examiner-v2',
  part1Seconds: 300,
  part2PreparationSeconds: 60,
  part2AnswerSeconds: 120,
})
assert.equal(Object.isFrozen(direct.examinerPolicy), true)
assert.deepEqual(Object.keys(direct.responses), ['opening', 'next', 'part2Cue', 'closing', 'assessment'])
assert.match(direct.responses.part2Cue.response.instructions, /complete cue card.*one response/i)
assert.match(direct.responses.closing.response.instructions, /end of the speaking test/i)
assert.equal(direct.protocol, 'qwen-direct-session-v1')
assert.equal(direct.sessionUpdate.session.turn_detection, null)

console.log('Qwen examiner strategy: answer-led Parts 1-3, turn classification, full cue-card delivery, long-turn protection and direct templates passed.')
