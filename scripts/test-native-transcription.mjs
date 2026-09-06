import assert from 'node:assert/strict';
import {createNativeTranscriber,imageEvidence} from '../server/nativeTranscription.cjs';
const image='data:image/png;base64,'+Buffer.from([137,80,78,71,13,10,26,10,0]).toString('base64');
let calls=0;
const transcribe=createNativeTranscriber({providers:()=>[{model:'fixture',apiKey:'fixture-only'}],call:async request=>{
  calls++;assert.equal(request.user[1].image_url.url,image);assert.equal(request.agentTools.length,0);
  assert.ok(request.timeoutMs<=35000);return 'Student words.\n\n[无法识别]';
}});
await assert.rejects(()=>transcribe(0,image),error=>error.statusCode===401);
await assert.rejects(()=>transcribe(1,'data:image/png;base64,dGV4dA=='),error=>error.statusCode===400);
assert.equal(calls,0,'auth and malformed image are rejected before a provider call');
const result=await transcribe(1,image);
assert.equal(result.answer,'Student words.\n\n[无法识别]');assert.equal(result.reviewRequired,true);
assert.doesNotMatch(JSON.stringify(result),/fixture-only|data:image|band/);
assert.throws(()=>imageEvidence('https://untrusted/image.png'));
const unavailable=createNativeTranscriber({providers:()=>[{}],call:async()=>{throw Error('private provider body');}});
await assert.rejects(()=>unavailable(1,image),error=>error.statusCode===503&&!error.message.includes('private'));
console.log('Native photo transcription: actual image input, auth/magic-byte gate, bounded vision, explicit review and safe failure passed.');
