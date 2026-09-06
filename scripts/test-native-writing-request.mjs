import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { bindWritingSource } from '../server/nativeWritingSource.cjs';
const source=fs.readFileSync(new URL('../server.js',import.meta.url),'utf8');
const start=source.indexOf('async function buildWritingFeedbackResult(');
const end=source.indexOf('\nasync function buildWritingPairFeedbackResult(',start);
assert.ok(start>0&&end>start);
const requests=[];
const context={AI_GATEWAY_API_KEY:'local-fixture-key',AI_GATEWAY_MODEL:'configured-vision-model',AI_GATEWAY_BASE_URL:'http://127.0.0.1:1/v1',AI_GATEWAY_REASONING_EFFORT:'xhigh',WRITING_AI_MODEL:'configured-text-model',WRITING_AI_TIMEOUT_MS:1000,WRITING_SCORING_PROMPT_VERSION:'fixture',writingSystemPrompt:()=> 'rubric',
 callOpenAI:async request=>{requests.push(request);return 'validated feedback'},callWritingAI:async request=>{requests.push(request);return 'text feedback'},
 writingProviderWarning:()=> 'unavailable',localWritingFeedbackAmber:()=> 'local feedback',normalizeWritingAnalysis:()=>({fullReport:'verified feedback',reviewRequired:false}),
 createWritingReportPdfDataUrl:async()=> 'data:application/pdf;base64,fixture',addPdfDownloadUrl:value=>value};
vm.runInNewContext(source.slice(start,end)+'\nthis.build=buildWritingFeedbackResult;',context);
const item=bindWritingSource({id:'cam15-w-test1-task1',essay:'Student essay',prompt:'forged'}, {
 findTask:()=>({prompt:'Canonical chart question',writingPageImages:[{url:'/generated/writing-pages/task.webp'}]}),loadImage:()=> 'data:image/webp;base64,fixture'
});
const result=await context.build(item.prompt,item.essay,item);
assert.equal(requests[0].model,'configured-vision-model');
assert.equal(requests[0].reasoningEffort,'xhigh');
assert.equal(requests[0].user[1].type,'image_url');
assert.match(requests[0].user[0].text,/Canonical chart question/);
assert.doesNotMatch(requests[0].user[0].text,/forged/);
assert.equal(result.provenance.model,'configured-vision-model');
assert.equal(result.provenance.sourceImagesSubmitted,1);
assert.doesNotMatch(JSON.stringify(result),/data:image|local-fixture-key/);
console.log('Native Writing request: source chart reaches the configured vision model; no image bytes in the result.');
