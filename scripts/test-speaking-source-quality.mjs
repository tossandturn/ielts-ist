import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = new URL("../", import.meta.url);
const port = 8800 + (process.pid % 100);
const baseUrl = `http://127.0.0.1:${port}`;
const dbPath = join(tmpdir(), `ieltsist-speaking-quality-${process.pid}-${randomUUID()}.sqlite`);
const child = spawn(process.execPath, ["server.js"], {
  cwd: root,
  env: { ...process.env, PORT: String(port), IELTSIST_DB_PATH: dbPath, SESSION_COOKIE_SECURE: "0" },
  stdio: ["ignore", "pipe", "pipe"],
});
let output = "";
child.stdout.on("data", (chunk) => { output += chunk; });
child.stderr.on("data", (chunk) => { output += chunk; });

async function waitForServer() {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Speaking quality server exited early (${child.exitCode}).\n${output}`);
    try {
      const response = await fetch(`${baseUrl}/api/tasks`);
      if (response.ok) return response;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  throw new Error(`Speaking quality server did not start.\n${output}`);
}

try {
  const response = await waitForServer();
  const payload = await response.json();
  const sets = payload.speakingSets || [];
  assert.ok(sets.length >= 3, "The quality gate must retain every structurally complete source set without reintroducing damaged OCR");
  for (const set of sets) {
    const text = `${set.title || ""}\n${set.part2 || ""}`;
    assert.doesNotMatch(text, /what you(?:'|')?re going to|notes to|for 1 to|garden or pak/i, `No OCR overlay or typo may reach students (${set.id})`);
    assert.match(String(set.part2 || ""), /^(Describe|Talk about|Tell me about)\b/i, `Visible cue card needs a complete prompt (${set.id})`);
    assert.match(String(set.part2 || ""), /You should say:/i, `Visible cue card needs its cue-card instructions (${set.id})`);
  }
  const corrected = sets.find((set) => set.id === "cam21-s-test3");
  assert.ok(corrected, "The corrected Cambridge 21 source should remain available");
  assert.equal(corrected.title, "Interesting garden or park");
  assert.match(corrected.part2, /what you saw in this garden or park/i);
  assert.match(corrected.part2, /why you think this garden or park is interesting/i);
  assert.ok(sets.every((set) => set.contentLifecycle === "validated" && set.humanReviewStatus === "pending"), "Structured source validation must not be mislabelled as human PDF-verbatim review.");
  console.log(`PASS speaking source quality: ${sets.length} structurally validated student-visible sets have complete prompts and no OCR overlays; human PDF-verbatim review remains pending.`);
} finally {
  if (child.exitCode === null) {
    const exited = new Promise((resolve) => child.once("exit", resolve));
    child.kill();
    await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 2_000))]);
  }
  await Promise.all([dbPath, `${dbPath}-shm`, `${dbPath}-wal`].map((file) => rm(file, { force: true }).catch(() => {})));
}
