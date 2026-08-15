import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../public/app.js", import.meta.url), "utf8");

function asyncFunctionSource(name) {
  const match = new RegExp(`async\\s+function\\s+${name}\\s*\\(`).exec(source);
  assert.ok(match, `Missing async function ${name}`);
  const start = match.index;
  const remaining = source.slice(start + match[0].length);
  const next = /\n(?:async\s+)?function\s+[A-Za-z_$][\w$]*\s*\(/.exec(remaining);
  return source.slice(start, next ? start + match[0].length + next.index : source.length);
}

const code = asyncFunctionSource("qwenShouldTryWebRtc");
const context = {
  qwenRuntimeConfig: async () => ({ webrtcEnabled: true, webrtcMode: "auto" }),
};
vm.createContext(context);
vm.runInContext(`${code}\nthis.qwenShouldTryWebRtc = qwenShouldTryWebRtc;`, context);

for (const prefix of ["single", "bank", "full-exam"]) {
  assert.equal(
    await context.qwenShouldTryWebRtc(prefix),
    true,
    `${prefix} should prefer direct WebRTC when the runtime enables it`,
  );
}

context.qwenRuntimeConfig = async () => ({ webrtcEnabled: false, webrtcMode: "off" });
assert.equal(await context.qwenShouldTryWebRtc("single"), false, "runtime opt-out must retain fallback transport");

console.log("Speaking transport selection prefers WebRTC and retains the configured fallback.");
