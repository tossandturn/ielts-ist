const assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),fsp=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),http=require('node:http'),vm=require('node:vm')
const {parseSourceByteRange}=require('../server/sourceByteRange.cjs')
const {sourceFileValidator,openValidatedSourceFile,clearSourceFileValidatorCacheForTests,sourceFileValidatorCacheSizeForTests}=require('../server/sourceFileValidator.cjs')
const source=fs.readFileSync('server.js','utf8'),start=source.indexOf('function serveFile('),end=source.indexOf('\nasync function serveLocalCambridgeFile',start)
const serve=vm.runInNewContext(source.slice(start,end)+'\nserveFile',{fs,path,parseSourceByteRange,sourceFileValidator,openValidatedSourceFile})
const staticStart=source.indexOf('function serveStatic('),staticEnd=source.indexOf('\nfunction serveFile(',staticStart)
assert.ok(staticStart>=0&&staticEnd>staticStart,'server must expose a bounded serveStatic implementation')
let audioFullReads=0,audioStreams=0
const serveStatic=vm.runInNewContext(source.slice(staticStart,staticEnd)+'\nserveStatic',{
 URL,path,PUBLIC_DIR:path.resolve('public'),staticGzipCache:new Map(),zlib:{},
 fs:{readFile(){audioFullReads+=1}},serveFile(){audioStreams+=1},
})
serveStatic({url:'/generated/audio/cam15-l-test1-audio1.mp3',headers:{host:'127.0.0.1'}},{writeHead(){},end(){}})
assert.equal(audioStreams,1,'audio must use ranged streaming')
assert.equal(audioFullReads,0,'audio HEAD/Range requests must not read the full file before ranged streaming')

const sha=value=>crypto.createHash('sha256').update(value).digest('hex')
async function main(){
 const base=process.platform==='win32'?'D:/CodexWork':os.tmpdir(),dir=await fsp.mkdtemp(path.join(base,'ielts-range-qa-')),file=path.join(dir,'source.mp3'),body=Buffer.from('0123456789')
 await fsp.writeFile(file,body);clearSourceFileValidatorCacheForTests()
 const initial=await fsp.stat(file),first=sourceFileValidator(file,initial),joined=sourceFileValidator(file,initial)
 assert.equal(first,joined,'same file/stat hashing must coalesce')
 const validator=await first;assert.equal(validator.etag,`"sha256-${sha(body)}"`);assert.equal(sourceFileValidatorCacheSizeForTests(),1)
 const server=http.createServer((req,res)=>serve(req,res,file,'audio/mpeg'));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
 try{
  const url='http://127.0.0.1:'+server.address().port
  const full=await fetch(url),etag=full.headers.get('etag');assert.equal(full.status,200);assert.equal(etag,validator.etag);assert.equal(full.headers.get('cache-control'),'public, max-age=31536000, immutable');assert.equal(await full.text(),'0123456789')
  const head=await fetch(url,{method:'HEAD'});assert.equal(head.status,200);assert.equal(head.headers.get('etag'),etag);assert.equal(head.headers.get('content-length'),'10');assert.equal(await head.text(),'')
  for(const[rangeValue,status,expected]of [['bytes=0-2',206,'012'],['bytes=-3',206,'789'],['bytes=8-',206,'89'],['bytes=8-100',206,'89'],['bytes=-999999999999999999999999',206,'0123456789'],['bytes=100000000000000000000-',416,''],['bytes=-0',416,''],['bytes=7-4',416,''],['items=1-2',200,'0123456789'],['bytes=0-1,7-9',200,'0123456789']]){
   const response=await fetch(url,{headers:{Range:rangeValue}});assert.equal(response.status,status,rangeValue);assert.equal(response.headers.get('etag'),etag);assert.equal(await response.text(),expected,rangeValue);if(status===416)assert.equal(response.headers.get('content-range'),'bytes */10')
  }
  const rangeHead=await fetch(url,{method:'HEAD',headers:{Range:'bytes=0-2'}});assert.equal(rangeHead.status,206);assert.equal(rangeHead.headers.get('etag'),etag);assert.equal(rangeHead.headers.get('content-range'),'bytes 0-2/10');assert.equal(rangeHead.headers.get('content-length'),'3')
  const current=await fetch(url,{headers:{Range:'bytes=2-4','If-Range':etag}});assert.equal(current.status,206);assert.equal(await current.text(),'234')
  for(const stale of ['"stale"',`W/${etag}`,'Wed, 21 Oct 2015 07:28:00 GMT']){const response=await fetch(url,{headers:{Range:'bytes=2-4','If-Range':stale}});assert.equal(response.status,200,stale);assert.equal(await response.text(),'0123456789',stale)}
  for(const match of [etag,`W/${etag}`]){const response=await fetch(url,{headers:{'If-None-Match':match}});assert.equal(response.status,304,match);assert.equal(response.headers.get('etag'),etag);assert.equal(await response.text(),'')}
  await new Promise(resolve=>setTimeout(resolve,5));const changed=Buffer.from('abcdefghij');await fsp.writeFile(file,changed)
  const changedResponse=await fetch(url);assert.equal(await changedResponse.text(),'abcdefghij');assert.notEqual(changedResponse.headers.get('etag'),etag);assert.equal(changedResponse.headers.get('etag'),`"sha256-${sha(changed)}"`)
 }finally{await new Promise(resolve=>server.close(resolve))}

 clearSourceFileValidatorCacheForTests();const moving=path.join(dir,'moving.mp3'),oldBytes=Buffer.alloc(2*1024*1024,65),newBytes=Buffer.alloc(2*1024*1024,66);oldBytes.write('ID3');newBytes.write('ID3');await fsp.writeFile(moving,oldBytes);const movingPromise=sourceFileValidator(moving,await fsp.stat(moving));await fsp.writeFile(moving,newBytes);const moved=await movingPromise.catch(error=>error);if(moved?.code==='source_file_changed')assert.match(moved.message,/changed/);else assert.equal(moved.etag,`"sha256-${sha(newBytes)}"`,'a file changed while hashing is retried once or rejected, never tagged with the old validator')
 const snapshot=path.join(dir,'snapshot.mp3');await fsp.writeFile(snapshot,body);const snap=await sourceFileValidator(snapshot,await fsp.stat(snapshot));await new Promise(resolve=>setTimeout(resolve,5));await fsp.writeFile(snapshot,Buffer.from('abcdefghij'));await assert.rejects(()=>openValidatedSourceFile(snapshot,snap.signature),/changed/i);await fsp.unlink(snapshot)
 clearSourceFileValidatorCacheForTests();for(let index=0;index<70;index++){const item=path.join(dir,`cache-${index}.mp3`);await fsp.writeFile(item,Buffer.from(`ID3-${index}`));await sourceFileValidator(item,await fsp.stat(item))}assert.ok(sourceFileValidatorCacheSizeForTests()<=64,'validator cache must stay bounded')
 await assert.rejects(()=>sourceFileValidator(path.join(dir,'missing.mp3')),/regular|ENOENT/i)
 console.log('PDF/audio delivery: strong validators, HEAD/GET parity, exact ranges, If-Range fallback, 304, mutation retry, descriptor close and bounded hash cache passed.')
 assert.equal(path.dirname(path.resolve(dir)),path.resolve(base));await fsp.rm(dir,{recursive:true})
}
main().catch(error=>{console.error(error);process.exitCode=1})
