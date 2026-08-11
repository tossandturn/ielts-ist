import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const appSource = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
const start = appSource.indexOf("const productReturnAllowedOrigins");
const end = appSource.indexOf("function readLocalVocabularyNotebook", start);
assert.ok(start >= 0 && end > start, "Product return URL helpers must remain available in app.js");

const link = {
  href: "",
  removedAttributes: [],
  removeAttribute(name) {
    this.removedAttributes.push(name);
  },
};
const context = vm.createContext({
  URL,
  URLSearchParams,
  window: { location: { href: "https://ieltsist.com/#home" } },
  document: { querySelectorAll: () => [link] },
});
vm.runInContext(`${appSource.slice(start, end)}\nthis.productReturnApi = { canonicalProductReturnUrl, updateStemProductSwitchLinks };`, context);
const { canonicalProductReturnUrl, updateStemProductSwitchLinks } = context.productReturnApi;

const initial = new URL("https://ieltsist.com/practice/reading");
initial.searchParams.set("module", "reading");
initial.searchParams.set("course", "ielts");
initial.searchParams.set("attemptId", "attempt-42");
initial.searchParams.set("from", "stem");
initial.searchParams.set("focus", "question");
initial.searchParams.set("returnTo", "https://stem.ieltsist.com/?returnTo=https%3A%2F%2Fieltsist.com");
initial.searchParams.set("return_to", "https://stem.ieltsist.com/private");
initial.searchParams.set("auth", "private-auth");
initial.searchParams.set("bridge", "private-bridge");
initial.searchParams.set("Token", "private-token");
initial.searchParams.set("code", "private-code");
initial.searchParams.set("state", "private-state");
initial.searchParams.set("access_token", "private-access-token");
initial.searchParams.set("id_token", "private-id-token");
initial.searchParams.set("refresh_token", "private-refresh-token");
initial.searchParams.set("session", "private-session");
initial.searchParams.set("callback", "https://stem.ieltsist.com/oauth/callback");
initial.searchParams.set("redirect_uri", "https://stem.ieltsist.com/private");
initial.searchParams.set("source", "https://evil.example/?access_token=nested-private");
initial.hash = "#single?panel=answers&token=fragment-private&returnTo=nested";

const expected = "https://ieltsist.com/practice/reading?attemptId=attempt-42&course=ielts&module=reading#single?panel=answers";
assert.equal(canonicalProductReturnUrl(initial.toString()), expected, "Canonical return URL must preserve only the in-product route and business context");
assert.equal(canonicalProductReturnUrl(expected), expected, "Canonicalization must be idempotent");
assert.equal(
  canonicalProductReturnUrl("https://stem.ieltsist.com/practice/physics?topicId=forces&from=ieltsist#attempt"),
  "https://stem.ieltsist.com/practice/physics?topicId=forces#attempt",
  "The trusted STEM origin must retain its route context",
);
assert.equal(canonicalProductReturnUrl("https://ieltsist.com/#access_token=fragment-secret&id_token=private"), "https://ieltsist.com/", "Credential-only fragments must be removed");
assert.equal(canonicalProductReturnUrl("https://ieltsist.com/#auth/callback"), "https://ieltsist.com/", "Unsafe auth callback fragments must not survive canonicalization");
assert.equal(canonicalProductReturnUrl("https://ieltsist.com/oauth/callback?topicId=forces"), "", "Auth callback paths are not valid product return destinations");
assert.equal(
  canonicalProductReturnUrl("https://stem.ieltsist.com/learn?attemptId=attempt-7&routeId=physics-as&termIds=force%2Cmoment&topicId=mechanics#mine"),
  "https://stem.ieltsist.com/learn?attemptId=attempt-7&routeId=physics-as&termIds=force%2Cmoment&topicId=mechanics#mine",
  "Canonical product context must retain route/topic/term/attempt fields",
);

let currentIeltsUrl = initial.toString();
let stableSwitchLength = 0;
for (let trip = 1; trip <= 10; trip += 1) {
  updateStemProductSwitchLinks(currentIeltsUrl);
  const switchUrl = new URL(link.href);
  const returnTo = switchUrl.searchParams.get("returnTo");
  assert.equal(switchUrl.origin, "https://stem.ieltsist.com");
  assert.equal(switchUrl.searchParams.get("from"), "ieltsist");
  assert.equal(switchUrl.searchParams.get("focus"), "syllabus");
  assert.equal(returnTo, expected, `Round trip ${trip} changed the canonical return URL`);
  assert.equal(new URL(returnTo).searchParams.has("returnTo"), false, `Round trip ${trip} nested returnTo`);
  assert.equal(returnTo.includes("return_to="), false, `Round trip ${trip} retained return_to`);
  if (!stableSwitchLength) stableSwitchLength = switchUrl.toString().length;
  assert.equal(switchUrl.toString().length, stableSwitchLength, `Round trip ${trip} grew the STEM switch URL`);

  const returned = new URL(returnTo);
  returned.searchParams.set("from", "stem");
  returned.searchParams.set("focus", "syllabus");
  returned.searchParams.set("returnTo", switchUrl.toString());
  returned.searchParams.set("state", `temporary-${trip}`);
  currentIeltsUrl = returned.toString();
}
assert.ok(link.removedAttributes.includes("target"), "Product handoff must stay in the same authenticated tab");

for (const hostile of [
  "https://evil.example/steal?returnTo=https://ieltsist.com/",
  "https://ieltsist.com.evil.example/steal",
  "http://ieltsist.com/insecure",
  "https://user:password@ieltsist.com/private",
]) {
  assert.equal(canonicalProductReturnUrl(hostile), "", `Untrusted source was accepted: ${hostile}`);
  updateStemProductSwitchLinks(hostile);
  assert.equal(new URL(link.href).searchParams.has("returnTo"), false, "Rejected sources must not be copied into the STEM link");
}

const oversized = `https://ieltsist.com/practice?topic=${"x".repeat(2_000)}`;
assert.equal(canonicalProductReturnUrl(oversized), "", "Oversized return URLs must be rejected instead of truncated into an ambiguous route");

console.log(`Product switch return URL passed: 10 stable round trips at ${stableSwitchLength} characters.`);
