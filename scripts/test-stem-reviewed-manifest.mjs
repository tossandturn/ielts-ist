import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const manifestPath = path.join(root, "data", "stem-marking", "0580_m25_qp_12-reviewed-manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const tuple = {
  routeId: "cie-0580-igcse-mathematics",
  qualification: "IGCSE",
  specificationVersion: "cambridge-0580-2025-2027",
  paperId: "cie-0580-0580_m25_qp_12",
};
const expected = {
  "cie-0580-0580_m25_qp_12:q20:part-a": {
    prompt: "The height, h metres, of a building is 635 m, correct to the nearest metre.\nComplete this statement about the value of h.",
    availableMarks: 2,
    page: 14,
    pointText: "B1: one mark for each of 634.5 and 635.5. / SC1: both values correct but answers reversed.",
  },
  "cie-0580-0580_m25_qp_12:q22:part-a": {
    prompt: "Work out 1 7/15 − 4/5.\nGive your answer as a fraction in its simplest form.",
    availableMarks: 3,
    page: 15,
    pointText: "B2: final answer is 10/15 or equivalent fraction. / B1: 22/15 or 7/15 + 1/3. / M1: (3*4)/(3*5) oe or (3*1)/(3*5) oe.",
  },
  "cie-0580-0580_m25_qp_12:q24:part-a": {
    prompt: "A circle has radius 7 cm.\nA square has side x cm.\nThe circumference of the circle is the same length as the perimeter of the square.\n\nFind the value of x.\nGive your answer in terms of π.",
    availableMarks: 3,
    page: 17,
    pointText: "M2: 2*pi*7 = 4x oe. / M1: 2*pi*7 or 14*pi or 4x. / A1: x = 7*pi/2 or 3.5*pi.",
  },
};

assert.equal(manifest.schemaVersion, "stem-marking-manifest.v1");
assert.deepEqual(Object.keys(expected).sort(), manifest.questions.map((question) => question.questionPartId).sort());
for (const question of manifest.questions) {
  assert.deepEqual(Object.fromEntries(Object.keys(tuple).map((key) => [key, question[key]])), tuple);
  const reference = expected[question.questionPartId];
  assert.equal(question.prompt, reference.prompt);
  assert.equal(question.availableMarks, reference.availableMarks);
  assert.equal(question.markSchemePoints.length, 1);
  assert.equal(question.markSchemePoints[0].pointId, `${question.questionPartId}:scheme`);
  assert.equal(question.markSchemePoints[0].maxMarks, reference.availableMarks);
  assert.equal(question.markSchemePoints[0].text, reference.pointText);
  assert.equal(question.markSchemePoints[0].sourceEvidence.page, 9);
  assert.equal(question.assets.length, 1);
  assert.equal(question.assets[0].assetId, `${tuple.paperId}:page-${reference.page}`);
  assert.equal(question.assets[0].checksum, "sha256:bb8bebf6fabb2cb1a4dd0ff5387bdb6407ba2934046974312d9aed88b3cdfc26");
  assert.equal(question.assets[0].sourceEvidence.page, reference.page);
}

console.log("Reviewed STEM manifest contract passed for Q20, Q22, and Q24.");
