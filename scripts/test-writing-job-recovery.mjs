import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const port=()=>new Promise(resolve=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const n=s.address().port;s.close(()=>resolve(n))})});
const temp=await mkdtemp(path.join(root,'.tmp-writing-job-'));
const providerPort=await port(),appPort=await port();let delay=1500,calls=0,low=false;
const essay='Public transport reduces congestion. It also helps workers reach jobs more reliably.';
const provider=http.createServer(async(req,res)=>{for await(const chunk of req){}calls++;const thisDelay=delay,thisLow=low;res.setHeader('content-type','application/json');res.flushHeaders();setTimeout(()=>res.end(JSON.stringify({choices:[{message:{content:JSON.stringify({overall:7,confidence:thisLow?'low':'high',reviewRequired:thisLow,fullReport:'Practice feedback supported by the supplied essay.',criteria:['Task Response','Coherence & Cohesion','Lexical Resource','Grammatical Range & Accuracy'].map(label=>({label,score:7,feedback:'Evidence is developed.',evidence:'Public transport reduces congestion.',bandRationale:'Clear development.'}))})}}]})),thisDelay)});
await new Promise(resolve=>provider.listen(providerPort,'127.0.0.1',resolve));
const child=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,NODE_ENV:'test',PORT:String(appPort),IELTSIST_BIND_HOST:'127.0.0.1',SESSION_COOKIE_SECURE:'0',IELTSIST_DB_PATH:path.join(temp,'test.sqlite'),AI_GATEWAY_API_KEY:'',OPENAI_API_KEY:'',COACH_AI_API_KEY:'',WRITING_AI_API_KEY:'local-fixture',WRITING_AI_BASE_URL:`http://127.0.0.1:${providerPort}/v1`,WRITING_AI_MODEL:'fixture',WRITING_AI_TIMEOUT_MS:'1000',WRITING_JOB_TIMEOUT_MS:'3000'},stdio:['ignore','ignore','pipe']});
let stderr='';child.stderr.on('data',b=>stderr+=b.toString());
const base=`http://127.0.0.1:${appPort}`;let cookie='';
async function request(url,data){const r=await fetch(base+url,{method:data?'POST':'GET',headers:{'content-type':'application/json',...(cookie?{cookie}:{})},...(data?{body:JSON.stringify(data)}:{})});return{status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')}}
const payload=extra=>({prompt:'Discuss public transport. '+extra,essay});
async function start(extra){const r=await request('/api/writing/feedback/start',payload(extra));assert.equal(r.status,202);return r.data.jobId}
async function done(id){for(let i=0;i<100;i++){const r=await request('/api/writing/feedback/job/'+id);assert.equal(r.status,200);if(r.data.status!=='pending')return r.data;await pause(80)}throw Error('Job did not settle')}
try{
 for(let i=0;i<100;i++){if(child.exitCode!==null)throw Error('Fixture server exited');try{if((await fetch(base+'/healthz')).ok)break}catch{}await pause(50)}
 const account=await request('/api/auth/register',{username:'jobqa_'+Date.now(),password:'local-fixture-only-password-123'});assert.equal(account.status,200);cookie=String(account.cookie||'').split(';')[0];assert.ok(cookie);
 const id=await start('delayed');assert.equal(await start('delayed'),id,'pending duplicate must reuse the running job');
 const result=await done(id);assert.match(result.result?.mode||'',/^ai:/,'owned async grading needs a longer bounded budget than the synchronous fallback');assert.equal(calls,1);assert.equal(await start('delayed'),id,'completed AI feedback remains idempotent');
 delay=4500;const timed=await start('retry');const failed=await done(timed);assert.equal(failed.status,'error','AI failure must not be cached as a completed local estimate');assert.equal(failed.errorCode,'writing_ai_timeout');assert.equal(failed.result,null);
 delay=10;const retried=await start('retry');assert.notEqual(retried,timed,'same content must be retryable after provider timeout');assert.match((await done(retried)).result.mode,/^ai:/);
 low=true;const uncertain=await start('uncertain');assert.equal((await done(uncertain)).result.review.required,true);low=false;const reviewed=await start('uncertain');assert.notEqual(reviewed,uncertain,'low-confidence feedback must not lock a deliberate retry');await done(reviewed);
 assert.doesNotMatch(stderr,/local-fixture|Student essay/);
 console.log('Writing jobs: separate async deadline, pending/success idempotency, retryable timeout and low-confidence retry passed.');
}finally{
 if(child.exitCode===null){child.kill();await Promise.race([new Promise(r=>child.once('exit',r)),pause(2000)]);if(child.exitCode===null)child.kill('SIGKILL')}
 provider.closeAllConnections();await new Promise(r=>provider.close(r));assert.equal(path.dirname(temp),root);assert.ok(path.basename(temp).startsWith('.tmp-writing-job-'));await rm(temp,{recursive:true,force:true});
}
