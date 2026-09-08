const fs=require('node:fs'),fsp=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto')
function createOriginalMaterialResolver({root,manifest}={}){
 const completed=new Map(),pending=new Map();let chain=Promise.resolve()
 return async id=>{
  if(manifest?.schemaVersion!=='ielts-original-material-assets-v1'||!/^cam(?:[4-9]|1\d|2[01])-(?:pdf|analysis)$/.test(String(id))||!Object.hasOwn(manifest.assets||{},id))return null
  const asset=manifest.assets[id]
  if(!/^[a-f0-9]{64}$/.test(asset.sha256||'')||asset.file!==asset.sha256+'.pdf'||asset.contentType!=='application/pdf'||!Number.isInteger(asset.bytes)||asset.bytes<5||asset.bytes>512*1024*1024)return null
  try{
   const realRoot=await fsp.realpath(root),target=path.join(realRoot,asset.file),actual=await fsp.realpath(target)
   if(path.dirname(actual)!==realRoot)return null
   const stat=await fsp.stat(actual);if(!stat.isFile()||stat.size!==asset.bytes)return null
   const key=[actual,stat.size,stat.mtimeMs,stat.ctimeMs,asset.sha256].join('|')
   if(completed.has(key))return completed.get(key)?actual:null
   if(!pending.has(key)){
    // Verify immutable source objects once per filesystem identity, using a
    // single bounded stream instead of blocking Node on whole-book buffers.
    const job=chain.then(async()=>{const hash=crypto.createHash('sha256');let head=Buffer.alloc(0);for await(const chunk of fs.createReadStream(actual)){if(head.length<5)head=Buffer.concat([head,chunk.subarray(0,5-head.length)]);hash.update(chunk)}const after=await fsp.stat(actual);return head.toString()==='%PDF-'&&hash.digest('hex')===asset.sha256&&after.size===stat.size&&after.mtimeMs===stat.mtimeMs&&after.ctimeMs===stat.ctimeMs}).catch(()=>false)
    chain=job.then(()=>undefined);pending.set(key,job)
   }
   const valid=await pending.get(key);pending.delete(key);if(completed.size>=80)completed.clear();completed.set(key,valid);return valid?actual:null
  }catch{return null}
 }
}
module.exports={createOriginalMaterialResolver}
