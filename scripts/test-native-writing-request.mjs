import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { bindWritingSource } from '../server/nativeWritingSource.cjs';
const source=fs.readFileSync(new URL('../server.js',import.meta.url),'utf8');
const start=source.indexOf('async function buildWritingFeedbackResult(');
const end=source.indexOf('\nasync function buildWritingPairFeedbackResult(',start);
assert.ok(start>0&&end>start);
const requests=[];
const context={AI_GATEWAY_API_KEY:'local-fixture-key',AI_GATEWAY_MODEL:'configured-vision-model',AI_GATEWAY_BASE_URL:'http://127.0.0.1:1/v1',AI_GATEWAY_REASONING_EFFORT:'xhigh',WRITING_AI_MODEL:'configured-text-model',WRITING_AI_TIMEOUT_MS:1000,WRITING_VISION_TIMEOUT_MS:180000,WRITING_SCORING_PROMPT_VERSION:'fixture',writingSystemPrompt:()=> 'rubric',
 callOpenAI:async request=>{requests.push(request);return 'validated feedback'},callWritingAI:async request=>{requests.push(request);return 'text feedback'},
 writingProviderWarning:()=> 'unavailable',localWritingFeedbackAmber:()=> 'local feedback',normalizeWritingAnalysis:()=>({fullReport:'verified feedback',reviewRequired:false}),
 createWritingReportPdfDataUrl:async()=> 'data:application/pdf;base64,fixture',addPdfDownloadUrl:value=>value,parseWritingAnalysisJson:()=>({transcribedEssay:'The student photographed essay.'})};
Object.assign(context,{WRITING_VISION_AI_API_KEY:'',WRITING_VISION_AI_MODEL:'qwen3.7-plus',WRITING_VISION_AI_BASE_URL:'http://127.0.0.1:1/v1'});
vm.runInNewContext(source.slice(start,end)+'\nthis.build=buildWritingFeedbackResult;',context);
const item=bindWritingSource({id:'cam15-w-test1-task1',essay:'Student essay',prompt:'forged'}, {
 findTask:()=>({prompt:'Canonical chart question',writingPageImages:[{url:'/generated/writing-pages/task.webp'}]}),loadImage:()=> 'data:image/webp;base64,fixture'
});
const result=await context.build(item.prompt,item.essay,item);
assert.equal(requests[0].model,'configured-vision-model');
assert.equal(requests[0].reasoningEffort,'xhigh');
assert.equal(requests[0].timeoutMs,180000,'owned photo jobs use the measured visual grading budget, not the short text timeout');
assert.equal(requests[0].user[1].type,'image_url');
assert.match(requests[0].user[0].text,/Canonical chart question/);
assert.doesNotMatch(requests[0].user[0].text,/forged/);
assert.equal(result.provenance.model,'configured-vision-model');
assert.equal(result.provenance.sourceImagesSubmitted,1);
assert.doesNotMatch(JSON.stringify(result),/data:image|local-fixture-key/);
const photo={studentImages:['data:image/png;base64,student-fixture'],essay:'',sourceImages:[]};
const photoResult=await context.build('Source task','',photo);
assert.equal(requests[1].user[1].image_url.url,photo.studentImages[0]);
assert.equal(photoResult.provenance.studentImagesSubmitted,1);
assert.equal(photo.essay,'The student photographed essay.');
context.callOpenAI=async()=>{throw Error('private upstream error');};
await assert.rejects(()=>context.build('Task','',{studentImages:['data:image/png;base64,fixture']}),error=>error.code==='writing_vision_unavailable'&&!error.message.includes('private upstream'));
context.callOpenAI=async()=>{throw Error('AI request timed out.');};
await assert.rejects(()=>context.build('Task','',{studentImages:['data:image/png;base64,fixture']}),error=>error.code==='writing_vision_timeout');
context.callOpenAI=async()=>{throw Error('AI API failed. chat=401: private account message');};
await assert.rejects(()=>context.build('Task','',{studentImages:['data:image/png;base64,fixture']}),error=>error.code==='writing_vision_configuration'&&!error.message.includes('private account'));
context.WRITING_VISION_AI_API_KEY='explicit-photo-fixture';context.callOpenAI=async request=>{requests.push(request);return 'vision feedback'};
const direct=await context.build('Task','',{studentImages:['data:image/png;base64,fixture']});
assert.equal(requests.at(-1).model,'qwen3.7-plus');assert.equal(requests.at(-1).enableThinking,false);assert.equal(requests.at(-1).timeoutMs,90000);assert.equal(direct.provenance.model,'qwen3.7-plus');assert.equal(requests.at(-1).user[1].type,'image_url');
assert.equal(requests.at(-1).jsonResponse,true);
const rubricStart=source.indexOf('function writingSystemPrompt('),rubricEnd=source.indexOf('\nfunction ',rubricStart+12);
const rubric={AMBER_WRITING_SKILL:'',WRITING_SCORING_PROMPT_VERSION:'fixture'};vm.runInNewContext(source.slice(rubricStart,rubricEnd)+';this.prompt=writingSystemPrompt;',rubric);
assert.match(rubric.prompt({photo:true}),/Use this schema: \{"transcribedEssay":/,'the required photo evidence field belongs to the actual JSON schema, not only an optional instruction');
assert.doesNotMatch(rubric.prompt(),/transcribedEssay/,'typed grading keeps its previous schema');
console.log('Native Writing request: source chart reaches the configured vision model; no image bytes in the result.');
