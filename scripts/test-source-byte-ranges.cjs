const assert=require('node:assert/strict'),fs=require('node:fs'),fsp=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),http=require('node:http'),vm=require('node:vm')
const {parseSourceByteRange}=require('../server/sourceByteRange.cjs')
const source=fs.readFileSync('server.js','utf8'),start=source.indexOf('function serveFile('),end=source.indexOf('\nasync function serveLocalCambridgeFile',start)
const serve=vm.runInNewContext(source.slice(start,end)+'\nserveFile',{fs,path,parseSourceByteRange})
const staticStart=source.indexOf('function serveStatic('),staticEnd=source.indexOf('\nfunction serveFile(',staticStart)
assert.ok(staticStart>=0&&staticEnd>staticStart,'server must expose a bounded serveStatic implementation')
let audioFullReads=0,audioStreams=0
const serveStatic=vm.runInNewContext(source.slice(staticStart,staticEnd)+'\nserveStatic',{
 URL,path,PUBLIC_DIR:path.resolve('public'),staticGzipCache:new Map(),zlib:{},
 fs:{readFile(){audioFullReads+=1}},
 serveFile(){audioStreams+=1},
})
serveStatic({url:'/generated/audio/cam15-l-test1-audio1.mp3',headers:{host:'127.0.0.1'}},{writeHead(){},end(){}})
assert.equal(audioStreams,1,'audio must use ranged streaming')
assert.equal(audioFullReads,0,'audio HEAD/Range requests must not read the full file before ranged streaming')
async function main(){const base=process.platform==='win32'?'D:/CodexWork':os.tmpdir(),dir=await fsp.mkdtemp(path.join(base,'ielts-range-qa-')),file=path.join(dir,'source.pdf'),body=Buffer.from('0123456789');await fsp.writeFile(file,body);const server=http.createServer((req,res)=>serve(req,res,file,'application/pdf'));await new Promise(r=>server.listen(0,'127.0.0.1',r));try{
 const url='http://127.0.0.1:'+server.address().port
 for(const[range,status,expected]of [['bytes=0-2',206,'012'],['bytes=-3',206,'789'],['bytes=8-',206,'89'],['bytes=8-100',206,'89'],['bytes=-999999999999999999999999',206,'0123456789'],['bytes=100000000000000000000-',416,''],['bytes=-0',416,''],['bytes=7-4',416,''],['items=1-2',200,'0123456789'],['bytes=0-1,7-9',200,'0123456789']]){const r=await fetch(url,{headers:{Range:range}});assert.equal(r.status,status,range);assert.equal(await r.text(),expected,range);if(status===416)assert.equal(r.headers.get('content-range'),'bytes */10')}
 const head=await fetch(url,{method:'HEAD',headers:{Range:'bytes=-3'}});assert.equal(head.status,200);assert.equal(head.headers.get('content-length'),'10');assert.equal(await head.text(),'')
 console.log('PDF/audio delivery: exact, suffix, open-ended, clamped, overflow, unsatisfiable, ignored multi/unknown ranges and HEAD passed.')
 }finally{await new Promise(r=>server.close(r));assert.equal(path.dirname(path.resolve(dir)),path.resolve(base));await fsp.rm(dir,{recursive:true})}}
main().catch(e=>{console.error(e.message);process.exitCode=1})
