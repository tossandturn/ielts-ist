import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const manifestPath = path.join(root, "data", "stem-marking", "0580_m25_qp_12-reviewed-manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

if (manifest.schemaVersion !== "stem-marking-manifest.v2" && manifest.schemaVersion !== "stem-marking-manifest.v1") {
  throw new Error("Expected the reviewed STEM manifest v1 or v2 input.");
}
if (!Array.isArray(manifest.questions)) throw new Error("Expected reviewed STEM manifest questions.");
const reviewVersion = `reviewed:${String(manifest.source?.sha256 || manifest.generatedAt || "v1").slice(0, 140)}`;
manifest.questions.forEach((question) => {
  const asset = question.assets?.[0] || {};
  const inheritedEvidence = question.sourceEvidence || asset.sourceEvidence || question.markSchemePoints?.[0]?.sourceEvidence;
  if (!inheritedEvidence || !question.questionPartId) {
    throw new Error("Every reviewed question needs source evidence and a stable part id.");
  }
  question.sourceQuestionId = question.sourceQuestionId || question.questionPartId;
  question.sourceEvidence = {
    ...(asset.assetId ? { assetId: asset.assetId } : {}),
    ...inheritedEvidence,
  };
  question.review = {
    status: question.review?.status || "approved",
    schemaVersion: question.review?.schemaVersion || "stem-source-review.v1",
    version: question.review?.version || reviewVersion,
  };
});
manifest.schemaVersion = "stem-marking-manifest.v2";
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

console.log(`Reviewed STEM manifest is ${manifest.schemaVersion} with ${manifest.questions.length} source-reviewed parts.`);
