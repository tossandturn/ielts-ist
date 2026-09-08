const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),net=require('node:net'),{spawn}=require('node:child_process')
async function main(){
 const baseDir=process.platform==='win32'?'D:/CodexWork':os.tmpdir(),dir=await fs.mkdtemp(path.join(baseDir,'ielts-speaking-data-qa-')),probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r))
 const child=spawn(process.execPath,['server.js'],{cwd:process.cwd(),env:{...process.env,NODE_ENV:'test',PORT:String(port),IELTSIST_BIND_HOST:'127.0.0.1',IELTSIST_DB_PATH:path.join(dir,'isolated.sqlite')},stdio:'ignore',windowsHide:true})
 try{
  const base='http://127.0.0.1:'+port;let payload
  for(let i=0;i<80;i++){if(child.exitCode!==null)throw Error('Isolated HTTP server exited');try{const r=await fetch(base+'/api/tasks');if(r.ok){payload=await r.json();break}}catch{}await new Promise(r=>setTimeout(r,150))}
  assert.ok(payload,'isolated server ready');assert.equal(payload.speakingSets.length,72)
  const pages=new Set(payload.speakingSets.map(s=>JSON.stringify([s.sourceUrl,s.speakingPageImages])));assert.equal(pages.size,72)
  for(let book=4;book<=21;book++)assert.equal(payload.speakingSets.filter(s=>s.book===book).length,4,'four real source pages per Cambridge book')
  const repaired=payload.speakingSets.filter(s=>s.sourceReviewStatus==='ai-source-verified');assert.equal(repaired.length,69)
  assert.ok(repaired.every(s=>s.sameTestEligible===false&&s.formalProgressEligible===false&&s.humanReviewStatus==='pending'&&s.contentLifecycle==='validated'))
  assert.ok(payload.speakingSets.some(s=>s.id==='cam4-s-test1'));assert.ok(payload.speakingSets.some(s=>s.id==='cam17-s-test1'));assert.ok(payload.speakingSets.some(s=>s.id==='cam21-s-test3'))
  const header={'X-STEMist-Catalog':'native-topics-v1'},catalog=await (await fetch(base+'/api/native/ielts/catalog',{headers:header})).json();assert.equal(catalog.speakingSets.length,218)
  for(const item of repaired){const r=await fetch(base+'/api/native/ielts/tasks/speaking/'+item.id,{headers:header});assert.equal(r.status,200);const detail=(await r.json()).task;assert.equal(detail.id,item.id);assert.equal(detail.part2,item.part2);assert.equal(detail.formalProgressEligible,false);assert.ok(detail.speakingPageImages.length);assert.doesNotMatch(detail.part2,/You will have to talk|You can make some notes/);const image=await fetch(base+detail.speakingPageImages[0].url);assert.equal(image.status,200);const bytes=Buffer.from(await image.arrayBuffer());assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),item.sourcePageSha256)}
  console.log(JSON.stringify({status:'PASS',originalSourcePages:72,recoveredAdditionalPages:69,sharedNativeSpeaking:218,allSourceImagesMatched:true,oldPublishedIdsPreserved:true,isolatedDatabase:true}))
 }finally{
  if(child.exitCode===null){const stopped=new Promise(r=>child.once('exit',r));child.kill();await stopped}
  const target=path.resolve(dir);if(path.dirname(target)!==path.resolve(baseDir)||!path.basename(target).startsWith('ielts-speaking-data-qa-'))throw Error('Unsafe temporary target')
  await fs.rm(target,{recursive:true})
 }
}
main().catch(error=>{console.error(error.message);process.exitCode=1})
