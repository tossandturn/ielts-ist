import assert from 'node:assert/strict'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import {spawn} from 'node:child_process'
import vm from 'node:vm'
const root=path.resolve(import.meta.dirname,'..'),temp=fs.mkdtempSync('D:/CodexWork/coach-fallback-native-')
const listen=s=>new Promise(r=>s.listen(0,'127.0.0.1',r)),close=s=>new Promise(r=>s.close(r)),sleep=ms=>new Promise(r=>setTimeout(r,ms))
const attempts=[]
const source=fs.readFileSync(path.join(root,'server.js'),'utf8')
const selector=source.slice(source.indexOf('function coachAiProviders'),source.indexOf('async function callCoachAI'))
const vars={URL,AI_GATEWAY_API_KEY:'fixture-gateway',AI_GATEWAY_BASE_URL:'https://ai.example.test/v1',AI_GATEWAY_MODEL:'fixture-gateway-model',AI_GATEWAY_REASONING_EFFORT:'xhigh',AI_GATEWAY_TIMEOUT_MS:35000,COACH_AI_API_KEY:'fixture-gateway-alias',COACH_AI_BASE_URL:'https://ai.example.test/v1',COACH_AI_MODEL:'wrong-proxy-model',COACH_AI_TIMEOUT_MS:25000,COACH_QWEN_CONFIGURED:true,OPENAI_API_KEY:'',WRITING_AI_API_KEY:'fixture-ali',WRITING_AI_BASE_URL:'https://fixture.cn-beijing.maas.aliyuncs.com/compatible-mode/v1',WRITING_AI_MODEL:'fixture-text',WRITING_VISION_AI_API_KEY:'fixture-vision',WRITING_VISION_AI_BASE_URL:'https://fixture.cn-beijing.maas.aliyuncs.com/compatible-mode/v1',WRITING_VISION_AI_MODEL:'fixture-vision-model'}
const context=vm.createContext(vars);vm.runInContext(selector,context)
assert.equal(context.coachAiProviders()[1].baseUrl,vars.WRITING_AI_BASE_URL)
assert.equal(context.coachAiProviders()[1].apiKey,vars.WRITING_AI_API_KEY)
assert.equal(context.coachAiProviders({vision:true})[1].model,vars.WRITING_VISION_AI_MODEL)
context.WRITING_AI_MODEL='qwen3.7-max';assert.equal(context.coachAiProviders()[1].enableThinking,false,'hybrid Qwen Coach responds without a long hidden-thinking delay')
const gateway=http.createServer((q,r)=>{attempts.push('gateway');r.writeHead(503,{'content-type':'application/json'});r.end(JSON.stringify({error:{message:'Synthetic unavailable upstream'}}))})
const qwen=http.createServer((q,r)=>{attempts.push('qwen');r.writeHead(200,{'content-type':'application/json'});r.end(JSON.stringify({choices:[{message:{content:'Lifelong learning means continuing to develop knowledge throughout life.'}}]}))})
let child,output=''
try{
 await listen(gateway);await listen(qwen)
 const probe=http.createServer();await listen(probe);const port=probe.address().port;await close(probe)
 const base='http://127.0.0.1:'+port
 child=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,NODE_ENV:'test',PORT:String(port),IELTSIST_DB_PATH:path.join(temp,'qa.sqlite'),AI_GATEWAY_API_KEY:'qa-gateway-key',AI_GATEWAY_BASE_URL:'http://127.0.0.1:'+gateway.address().port+'/v1',AI_GATEWAY_MODEL:'fixture-gateway',COACH_AI_API_KEY:'qa-qwen-key',COACH_AI_BASE_URL:'http://127.0.0.1:'+qwen.address().port+'/v1',COACH_AI_MODEL:'fixture-qwen',OPENAI_API_KEY:'',DASHSCOPE_API_KEY:'',QWEN_API_KEY:''},stdio:['ignore','pipe','pipe']})
 child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b)
 let ready=false;for(let i=0;i<100;i++){try{if((await fetch(base+'/healthz')).ok){ready=true;break}}catch{}await sleep(50)}
 assert.equal(ready,true,'fixture server starts with preserved native APIs')
 const r=await fetch(base+'/api/help/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message:'Explain lifelong learning.',helpContext:{activeModule:'vocabulary'}})})
 const d=await r.json();assert.equal(r.status,200);assert.equal(d.mode,'ai');assert.match(d.answer,/Lifelong learning/);assert.deepEqual(attempts,['gateway','qwen'])
 assert.doesNotMatch(JSON.stringify(d)+output,/qa-gateway-key|qa-qwen-key/)
 console.log(JSON.stringify({status:'pass',http:200,ai:true,providerOrder:attempts,nativeApisPreserved:true}))
}finally{child?.kill();if(child)await Promise.race([new Promise(r=>child.once('exit',r)),sleep(2000)]);await close(gateway);await close(qwen);fs.rmSync(temp,{recursive:true,force:true})}
