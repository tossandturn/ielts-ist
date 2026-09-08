const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),vm=require('node:vm'),zlib=require('node:zlib')
const {nativeCatalogView}=require('../server/nativeIeltsCatalog.cjs')
const source=fs.readFileSync('server.js','utf8'),begin=source.indexOf('function sendCompressedJson('),end=source.indexOf('\nfunction getTasksPayloadCache()',begin)
assert.ok(begin>=0&&end>begin)
const send=vm.runInNewContext('('+source.slice(begin,end).trim()+')',{Buffer,zlib,nativeReportResponse:(_req,value)=>value,sendJson:()=>{throw Error('Unexpected compression failure')}})
const cache={payload:{listeningTests:[],readingTests:[],writingTasks:[],speakingSets:[{id:'cam4-s-test1',title:'Cambridge',source:'Cambridge'}]}}
const server=http.createServer((req,res)=>send(req,res,200,nativeCatalogView(cache,req).catalog,'public, max-age=60','X-STEMist-Catalog'))
async function main(){
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
 try{
  const url='http://127.0.0.1:'+server.address().port
  const old=await fetch(url),oldBody=await old.json();assert.equal(oldBody.speakingSets.length,1)
  const current=await fetch(url,{headers:{'X-STEMist-Catalog':'native-topics-v1','Accept-Encoding':'gzip'}}),currentBody=await current.json()
  assert.equal(currentBody.speakingSets.length,147);assert.equal(currentBody.writingTasks.length,24)
  assert.match(current.headers.get('vary'),/X-STEMist-Catalog/);assert.match(current.headers.get('vary'),/Accept-Encoding/)
  assert.equal(current.headers.get('content-encoding'),'gzip')
  const oldAgain=await fetch(url,{headers:{'X-STEMist-Catalog':'unknown'}});assert.equal((await oldAgain.json()).speakingSets.length,1)
  assert.equal(oldBody.version,oldBody.baseVersion);assert.notEqual(oldBody.version,currentBody.version)
  console.log('Native catalog negotiation: legacy Cambridge-only, opt-in shared topics, separate caches, gzip and Vary headers passed.')
 }finally{await new Promise(resolve=>server.close(resolve))}
}
main().catch(error=>{console.error(error.message);process.exitCode=1})
