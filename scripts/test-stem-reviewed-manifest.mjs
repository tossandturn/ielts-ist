import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const manifestPath = path.join(root, 'data', 'stem-marking', '0580_m25_qp_12-reviewed-manifest.json')
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const tuple = {
  routeId: 'cie-0580-igcse-mathematics',
  qualification: 'IGCSE',
  specificationVersion: 'cambridge-0580-2025-2027',
  paperId: 'cie-0580-0580_m25_qp_12',
}
const marksByQuestion = {
  1: 1, 2: 3, 3: 2, 4: 3, 5: 3, 6: 2, 7: 2, 8: 2, 9: 1, 10: 2, 11: 2,
  12: 4, 13: 1, 14: 7, 15: 5, 16: 2, 17: 4, 18: 9, 19: 3, 20: 2, 21: 4,
  22: 3, 23: 5, 24: 3, 25: 1, 26: 4,
}
const pageByQuestionPart = {
  1: 3, 2: 3, 3: 3, 4: 3, 5: 4, 6: 4, 7: 5, 8: 5, 9: 5, 10: 6, 11: 6,
  12: 7, 13: 8, 14: 8, 15: 10, 16: 11, 17: 12, 18: 13, 19: 14, 20: 14, 21: 15,
  22: 15, 23: 16, 24: 17, 25: 17, 26: 18,
}
const markSchemePageByQuestion = {
  1: 7, 2: 7, 3: 7, 4: 7, 5: 7, 6: 7, 7: 7, 8: 7, 9: 7, 10: 7, 11: 7,
  12: 8, 13: 8, 14: 8, 15: 8, 16: 8, 17: 8, 18: 8, 19: 9, 20: 9, 21: 9,
  22: 9, 23: 9, 24: 9, 25: 9, 26: 10,
}
function questionPaperPage(number, label) {
  if (number === 14 && label === 'c') return 9
  return pageByQuestionPart[number]
}
const expectedChecksum = 'sha256:bb8bebf6fabb2cb1a4dd0ff5387bdb6407ba2934046974312d9aed88b3cdfc26'

assert.equal(manifest.schemaVersion, 'stem-marking-manifest.v1')
assert.equal(manifest.questions.length, 46)
assert.equal(manifest.questions.reduce((sum, question) => sum + question.availableMarks, 0), 80)
assert.equal(new Set(manifest.questions.map((question) => question.questionPartId)).size, 46)

const marksSeen = {}
for (const question of manifest.questions) {
  assert.deepEqual(Object.fromEntries(Object.keys(tuple).map((key) => [key, question[key]])), tuple)
  const match = question.questionPartId.match(/:q(\d+):part-(.+)$/)
  assert.ok(match, `${question.questionPartId} must contain a printed question number and part label`)
  const number = Number(match[1])
  marksSeen[number] = (marksSeen[number] || 0) + question.availableMarks
  assert.equal(question.availableMarks, question.markSchemePoints.reduce((sum, point) => sum + point.maxMarks, 0))
  assert.equal(question.markSchemePoints.length, 1)
  assert.equal(question.markSchemePoints[0].pointId, `${question.questionPartId}:scheme`)
  assert.equal(question.markSchemePoints[0].sourceEvidence.page, markSchemePageByQuestion[number])
  assert.equal(question.assets.length, 1)
  assert.equal(question.assets[0].assetId, `${tuple.paperId}:page-${questionPaperPage(number, match[2])}`)
  assert.equal(question.assets[0].checksum, expectedChecksum)
  assert.equal(question.assets[0].sourceEvidence.page, questionPaperPage(number, match[2]))
}
assert.deepEqual(marksSeen, marksByQuestion)
const q22 = manifest.questions.find((question) => question.questionPartId.includes(':q22:'))
assert.match(q22.prompt, /1 7\/15 - 4\/5/)
assert.match(q22.markSchemePoints[0].text, /7\/15 \+ 1\/5/)
assert.doesNotMatch(q22.markSchemePoints[0].text, /7\/15 \+ 1\/3/)
const q26 = manifest.questions.find((question) => question.questionPartId.includes(':q26:'))
assert.match(q26.prompt, /4t - 3w = 11/)
assert.match(q26.prompt, /6t \+ 2w = -3/)
assert.match(q26.markSchemePoints[0].text, /w = -3/)

console.log('Reviewed STEM manifest contract passed for Q1-Q26 (46 parts, 80 marks).')
