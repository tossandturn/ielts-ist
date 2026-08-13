import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/10604/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const root = new URL("../", import.meta.url);
const catalog = JSON.parse(await readFile(new URL("../public/data/alevel-stem-vocabulary.json", import.meta.url), "utf8"));
const port = 6700 + (process.pid % 300);
const baseUrl = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ["server.js"], {
  cwd: root,
  env: { ...process.env, PORT: String(port) },
  stdio: ["ignore", "ignore", "pipe"],
});
let stderr = "";
child.stderr.on("data", (chunk) => { stderr += chunk; });

async function waitForServer() {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(`${baseUrl}/healthz`)).ok) return;
    } catch {}
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 150));
  }
  throw new Error(`Expanded vocabulary test server did not start. ${stderr}`);
}

const expectedSubjects = [
  "computer-science",
  "business",
  "geography",
  "accounting",
  "psychology",
  "law",
  "sociology",
  "politics",
  "history",
  "environmental-management",
  "design-technology",
  "english-language",
  "english-literature",
  "media-studies",
  "physical-education",
  "art-design",
  "drama",
  "music",
  "religious-studies",
  "information-technology",
  "travel-tourism",
  "global-perspectives",
  "marine-science",
  "food-nutrition",
  "modern-languages",
  "enterprise",
  "agriculture",
  "child-development",
  "english-second-language",
  "chinese-language",
  "islamic-studies",
  "biblical-studies",
  "thinking-skills",
  "digital-media-design",
  "world-literature",
];
for (const subject of expectedSubjects) {
  assert.ok(catalog.items.some((item) => item.subject === subject), `Catalog is missing ${subject}`);
}
assert.ok(catalog.items.some((item) => item.subject === "computer-science" && item.stage === "IGCSE" && item.word === "binary"));
assert.ok(catalog.items.some((item) => item.subject === "business" && item.word === "market research"));
assert.ok(catalog.items.some((item) => item.subject === "geography" && item.word === "erosion"));
assert.ok(catalog.items.some((item) => item.subject === "accounting" && item.word === "trial balance"));
assert.ok(catalog.items.some((item) => item.subject === "psychology" && item.word === "hypothesis"));
assert.ok(catalog.items.some((item) => item.subject === "law" && item.word === "precedent"));
assert.ok(catalog.items.some((item) => item.subject === "sociology" && item.word === "social stratification"));
assert.ok(catalog.items.some((item) => item.subject === "politics" && item.word === "separation of powers"));
assert.ok(catalog.items.some((item) => item.subject === "history" && item.word === "historical interpretation"));
assert.ok(catalog.items.some((item) => item.subject === "environmental-management" && item.word === "biodiversity"));
assert.ok(catalog.items.some((item) => item.subject === "design-technology" && item.word === "ergonomics"));
assert.ok(catalog.items.some((item) => item.subject === "english-language" && item.word === "phonology"));
  assert.ok(catalog.items.some((item) => item.subject === "english-literature" && item.word === "dramatic irony"));
assert.ok(catalog.items.some((item) => item.subject === "media-studies" && item.word === "media representation"));
assert.ok(catalog.items.some((item) => item.subject === "physical-education" && item.word === "aerobic endurance"));
assert.ok(catalog.items.some((item) => item.subject === "art-design" && item.word === "composition"));
assert.ok(catalog.items.some((item) => item.subject === "drama" && item.word === "blocking"));
assert.ok(catalog.items.some((item) => item.subject === "music" && item.word === "tonality"));
assert.ok(catalog.items.some((item) => item.subject === "religious-studies" && item.word === "utilitarianism"));
assert.ok(catalog.items.some((item) => item.subject === "information-technology" && item.word === "database"));
assert.ok(catalog.items.some((item) => item.subject === "travel-tourism" && item.word === "sustainable tourism"));
assert.ok(catalog.items.some((item) => item.subject === "global-perspectives" && item.word === "global issue"));
assert.ok(catalog.items.some((item) => item.subject === "marine-science" && item.word === "salinity"));
assert.ok(catalog.items.some((item) => item.subject === "food-nutrition" && item.word === "balanced diet"));
assert.ok(catalog.items.some((item) => item.subject === "modern-languages" && item.word === "false friend"));
assert.ok(catalog.items.some((item) => item.subject === "enterprise" && item.word === "value proposition"));
assert.ok(catalog.items.some((item) => item.subject === "agriculture" && item.word === "soil pH"));
assert.ok(catalog.items.some((item) => item.subject === "child-development" && item.word === "developmental milestone"));
assert.ok(catalog.items.some((item) => item.subject === "english-second-language" && item.word === "register"));
assert.ok(catalog.items.some((item) => item.subject === "chinese-language" && item.word === "语体"));
assert.ok(catalog.items.some((item) => item.subject === "islamic-studies" && item.word === "isnad"));
assert.ok(catalog.items.some((item) => item.subject === "biblical-studies" && item.word === "parable"));
assert.ok(catalog.items.some((item) => item.subject === "thinking-skills" && item.word === "assumption"));
assert.ok(catalog.items.some((item) => item.subject === "digital-media-design" && item.word === "design brief"));
assert.ok(catalog.items.some((item) => item.subject === "world-literature" && item.word === "postcolonial reading"));

await waitForServer();
const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto(`${baseUrl}/?test=vocabulary-expanded#vocabulary`, { waitUntil: "networkidle" });
  await page.locator(".vocab-review-card").waitFor();
  assert.equal(await page.locator("#vocabSubjectFilter").inputValue(), "ielts", "A student opening Vocabulary must start in the IELTS Core deck, not a mixed all-subject deck");
  assert.match((await page.locator(".vocab-word-face h3").textContent()) || "", /^[A-Za-z][A-Za-z -]*$/, "The default card must be an IELTS English word, never an arbitrary imported subject term");
  assert.equal(await page.locator(".vocab-mini-list [data-vocab-index]").count(), 0, "The study workspace must not render a scrollable 36-word side list as a competing control");
  await page.getByRole("button", { name: /change word pack/i }).click();
  await page.locator(".vocab-hub-shell").waitFor();
  await page.locator("[data-vocab-course='alevel']").click();
  assert.equal(await page.locator(".vocab-subject-directory [data-vocab-subject]").count(), 40, "The subject directory must expose all professional subject packs");
  await page.locator("[data-vocab-subject='thinking-skills']").click();
  await page.locator(".vocab-word-face h3").waitFor();
  const thinkingEyebrow = await page.locator(".vocab-review-top .eyebrow").textContent();
  assert.match(thinkingEyebrow || "", /A-Level Thinking Skills/);
  await page.getByRole("button", { name: /change word pack/i }).click();
  await page.locator(".vocab-hub-shell").waitFor();
  await page.locator("[data-vocab-course='alevel']").click();
  await page.locator("[data-vocab-subject='law']").waitFor({ state: "visible" });
  await page.locator("[data-vocab-subject='law']").click();
  await page.locator(".vocab-word-face h3").waitFor();
  const lawEyebrow = await page.locator(".vocab-review-top .eyebrow").textContent();
  assert.match(lawEyebrow || "", /IG \+ A-Level Law/);
  await page.getByRole("button", { name: /change word pack/i }).click();
  await page.locator(".vocab-hub-shell").waitFor();
  await page.getByRole("button", { name: /IELTS English/i }).click();
  await page.locator(".vocab-review-card").waitFor();

  await page.getByRole("button", { name: /change word pack/i }).click();
  await page.locator("[data-vocab-course='igcse']").click();
  await page.locator("[data-vocab-subject='computer-science']").click();
  await page.locator("#vocabSearch").fill("binary");
  await page.locator(".vocab-word-face h3").waitFor();
  assert.equal((await page.locator(".vocab-word-face h3").textContent()).trim(), "binary");
  const eyebrow = await page.locator(".vocab-review-top .eyebrow").textContent();
  assert.match(eyebrow || "", /IG \+ A-Level Computer Science/);
  assert.match(eyebrow || "", /IGCSE/);
  await page.locator("#vocabReveal").click();
  await page.locator("#vocabMeaning").waitFor();
  const meaning = await page.locator("#vocabMeaning").innerText();
  assert.match(meaning, /Definition \/ 英文定义/i);
  assert.match(meaning, /Computers store data as binary states/);
  assert.match(meaning, /Core idea \/ 核心理解/);

  for (const [subject, query, expected] of [
    ["business", "market research", "market research"],
    ["geography", "erosion", "erosion"],
    ["accounting", "trial balance", "trial balance"],
    ["psychology", "hypothesis", "hypothesis"],
    ["law", "precedent", "precedent"],
    ["sociology", "social stratification", "social stratification"],
    ["politics", "separation of powers", "separation of powers"],
    ["history", "historical interpretation", "historical interpretation"],
    ["environmental-management", "biodiversity", "biodiversity"],
    ["design-technology", "ergonomics", "ergonomics"],
    ["english-language", "phonology", "phonology"],
    ["english-literature", "dramatic irony", "dramatic irony"],
    ["media-studies", "media representation", "media representation"],
    ["physical-education", "aerobic endurance", "aerobic endurance"],
    ["art-design", "composition", "composition"],
    ["drama", "blocking", "blocking"],
    ["music", "tonality", "tonality"],
    ["religious-studies", "utilitarianism", "utilitarianism"],
    ["information-technology", "database", "database"],
    ["travel-tourism", "sustainable tourism", "sustainable tourism"],
    ["global-perspectives", "global issue", "global issue"],
    ["marine-science", "salinity", "salinity"],
    ["food-nutrition", "balanced diet", "balanced diet"],
    ["modern-languages", "false friend", "false friend"],
    ["enterprise", "value proposition", "value proposition"],
    ["agriculture", "soil pH", "soil pH"],
    ["child-development", "developmental milestone", "developmental milestone"],
    ["english-second-language", "register", "register"],
    ["chinese-language", "语体", "语体"],
    ["islamic-studies", "isnad", "isnad"],
    ["biblical-studies", "parable", "parable"],
    ["thinking-skills", "assumption", "assumption"],
    ["digital-media-design", "design brief", "design brief"],
    ["world-literature", "postcolonial reading", "postcolonial reading"],
  ]) {
    await page.getByRole("button", { name: /change word pack/i }).click();
    await page.locator("[data-vocab-course='alevel']").click();
    await page.locator(`[data-vocab-subject='${subject}']`).click();
    await page.locator("#vocabSearch").fill(query);
    await page.locator(".vocab-word-face h3").filter({ hasText: expected }).waitFor({ state: "visible", timeoutMs: 5000 });
    assert.equal((await page.locator(".vocab-word-face h3").textContent()).trim(), expected, `${subject} search should open ${expected}`);
  }

  assert.deepEqual(errors, [], "Expanded vocabulary flow must not emit console errors");
  await page.close();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto(`${baseUrl}/?test=vocabulary-expanded-mobile#vocabulary`, { waitUntil: "networkidle" });
  await mobile.locator(".vocab-review-card").waitFor();
  let overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 1, `Expanded vocabulary mobile default deck overflow is ${overflow}px`);
  await mobile.getByRole("button", { name: /change word pack/i }).click();
  await mobile.locator("[data-vocab-course='igcse']").click();
  await mobile.locator("[data-vocab-subject='computer-science']").click();
  await mobile.locator("#vocabSearch").fill("binary");
  await mobile.locator(".vocab-word-face h3").waitFor();
  overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 1, `Expanded vocabulary mobile overflow is ${overflow}px`);
  await mobile.close();

  console.log("Expanded vocabulary subject browser flow passed.");
} finally {
  await browser.close();
  child.kill();
}
