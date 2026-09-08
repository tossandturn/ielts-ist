const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto')
const {createOriginalMaterialResolver}=require('../server/originalMaterialAssets.cjs')
async function main(){const base=process.platform==='win32'?'D:/CodexWork':os.tmpdir(),root=await fs.mkdtemp(path.join(base,'ielts-source-asset-test-'));try{
 const bytes=Buffer.from('%PDF-1.4 source fixture'),hash=crypto.createHash('sha256').update(bytes).digest('hex'),file=hash+'.pdf';await fs.writeFile(path.join(root,file),bytes)
 const manifest={schemaVersion:'ielts-original-material-assets-v1',assets:{'cam4-pdf':{file,sha256:hash,bytes:bytes.length,contentType:'application/pdf'}}}
 const resolve=createOriginalMaterialResolver({root,manifest});assert.equal(await resolve('cam4-pdf'),path.join(root,file));assert.equal(await resolve('cam5-pdf'),null);assert.equal(await resolve('__proto__'),null);assert.equal(await resolve('../secret'),null)
 const unsafe=createOriginalMaterialResolver({root,manifest:{...manifest,assets:{'cam4-pdf':{...manifest.assets['cam4-pdf'],file:'../secret.pdf'}}}});assert.equal(await unsafe('cam4-pdf'),null)
 await fs.writeFile(path.join(root,file),Buffer.from('%PDF-1.4 changed source'));assert.equal(await resolve('cam4-pdf'),null,'tampered same-length source cannot be served')
 assert.equal(await createOriginalMaterialResolver({root,manifest:{schemaVersion:'unknown',assets:manifest.assets}})('cam4-pdf'),null)
 console.log('Original materials: known IDs only, content-addressed PDF, hash/size checks, traversal and tamper rejection passed.')
}finally{const target=path.resolve(root);assert.equal(path.dirname(target),path.resolve(base));assert.ok(path.basename(target).startsWith('ielts-source-asset-test-'));await fs.rm(target,{recursive:true})}}
main().catch(e=>{console.error(e.message);process.exitCode=1})
