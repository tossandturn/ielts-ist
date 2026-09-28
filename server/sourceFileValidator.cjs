const crypto=require('node:crypto'),fs=require('node:fs'),fsp=require('node:fs/promises'),path=require('node:path')
const LIMIT=64,cache=new Map(),pending=new Map()
const signature=stat=>[stat.size,stat.mtimeMs,stat.ctimeMs,stat.ino].join(':')
const changed=()=>Object.assign(Error('Source file changed while preparing its validator.'),{code:'source_file_changed'})
async function regular(file){const stat=await fsp.stat(file);if(!stat.isFile())throw Error('Source path is not a regular file.');return stat}
function digest(file){return new Promise((resolve,reject)=>{const hash=crypto.createHash('sha256'),stream=fs.createReadStream(file);stream.on('data',chunk=>hash.update(chunk));stream.once('error',reject);stream.once('end',()=>resolve(hash.digest('hex')))})}
function remember(key,value){cache.delete(key);cache.set(key,value);while(cache.size>LIMIT)cache.delete(cache.keys().next().value);return value}
async function calculate(file,stat,retry=0){const before=signature(stat),hash=await digest(file),after=await regular(file),afterSignature=signature(after);if(afterSignature!==before){if(retry<1)return calculate(file,after,retry+1);throw changed()}return remember(file+'\0'+afterSignature,{etag:`"sha256-${hash}"`,lastModified:after.mtime.toUTCString(),signature:afterSignature,stat:after})}
function sourceFileValidator(filePath,knownStat){const file=path.resolve(filePath);if(knownStat&&!knownStat.isFile())return Promise.reject(Error('Source path is not a regular file.'));if(!knownStat)return regular(file).then(stat=>sourceFileValidator(file,stat));const key=file+'\0'+signature(knownStat),hit=cache.get(key);if(hit){cache.delete(key);cache.set(key,hit);return Promise.resolve(hit)}if(pending.has(key))return pending.get(key);const work=calculate(file,knownStat).finally(()=>pending.delete(key));pending.set(key,work);return work}
async function openValidatedSourceFile(filePath,expectedSignature){const handle=await fsp.open(path.resolve(filePath),'r');try{const stat=await handle.stat();if(!stat.isFile()||signature(stat)!==expectedSignature)throw changed();return handle}catch(error){await handle.close().catch(()=>{});throw error}}
function clearSourceFileValidatorCacheForTests(){cache.clear();pending.clear()}
const sourceFileValidatorCacheSizeForTests=()=>cache.size
module.exports={sourceFileValidator,openValidatedSourceFile,clearSourceFileValidatorCacheForTests,sourceFileValidatorCacheSizeForTests}
