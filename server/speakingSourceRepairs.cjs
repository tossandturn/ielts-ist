const crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path')
const HASH=/^[a-f0-9]{64}$/
const verifiedSources=new WeakSet()
const isVerifiedSpeakingSource=value=>Boolean(value&&typeof value==='object'&&verifiedSources.has(value))
function carrySpeakingSourceVerification(source,projection){if(isVerifiedSpeakingSource(source))verifiedSources.add(projection);return projection}
const digest=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex')
const text=value=>typeof value==='string'&&value.trim().length>0&&value.length<=1500
const lines=(value,min,max)=>Array.isArray(value)&&value.length>=min&&value.length<=max&&value.every(text)
const pageIdentity=set=>JSON.stringify([set.sourceUrl,set.speakingPageImages?.map(p=>[p.page,p.url])])
const reflow=value=>String(value||'').replace(/\s+/g,' ').trim()
function normalizeSpeakingSourceReading(value){
 if(!value||!Array.isArray(value.cueBullets))return null
 const bullets=[],explanations=[]
 for(const raw of value.cueBullets){
  const line=reflow(raw),match=/\band explain\b/i.exec(line)
  if(match){if(line.slice(0,match.index).trim())bullets.push(line.slice(0,match.index).trim());explanations.push(line.slice(match.index))}
  else bullets.push(line)
 }
 const separate=reflow(value.cueExplanation)
 if(/^and explain\b/i.test(separate))explanations.push(separate)
 else if(separate&&!/^You will have to talk\b/i.test(separate))return null
 const unique=[...new Set(explanations.map(s=>s.toLowerCase()))]
 if(unique.length!==1||!explanations.length)return null
 // Reflow printed lines; do not invent missing words or keep unboxed timing text.
 return {part1Topic:reflow(value.part1Topic),part1:value.part1?.map(reflow),cuePrompt:reflow(value.cuePrompt),cueBullets:bullets,cueExplanation:explanations[0],part3Topics:value.part3Topics?.map(reflow),part3:value.part3?.map(reflow)}
}
function mergeSpeakingSourceRepairs({sourceSets=[],visibleSets=[],document,verifyImage=()=>false}={}){
 const original=visibleSets.slice()
 if(document?.schemaVersion!=='ielts-speaking-source-repairs-v1'||!Array.isArray(document.repairs)||document.repairs.length>100)return original
 const ids=document.repairs.map(r=>r.legacySourceId)
 if(new Set(ids).size!==ids.length)return original
 const sources=new Map(sourceSets.map(s=>[s.id,s])),visiblePages=new Set(visibleSets.map(pageIdentity)),visibleIds=new Set(visibleSets.map(s=>s.id))
 for(const repair of document.repairs){
  const source=sources.get(repair.legacySourceId),content=repair.content
  if(!source||sourceSets.filter(s=>s.id===source.id).length!==1||digest(source)!==repair.sourceRowSha256)continue
  const book=Number(source.book),page=Number(source.page)
  if(!Number.isInteger(book)||book<4||book>21||!Number.isInteger(page)||page<1||page>1000||page!==repair.page)continue
  if(![repair.sourceRowSha256,repair.sourcePageSha256,repair.primaryReceiptSha256,repair.independentReceiptSha256].every(h=>HASH.test(h||''))||repair.primaryReceiptSha256===repair.independentReceiptSha256)continue
  const agreement=repair.reviewMethod==='two-independent-source-page-reads'&&repair.reviewStatus==='source-content-agreement'
  const adjudicated=repair.reviewMethod==='two-source-reads-plus-source-adjudication'&&repair.reviewStatus==='source-content-adjudicated'&&HASH.test(repair.adjudicationReceiptSha256||'')&&![repair.primaryReceiptSha256,repair.independentReceiptSha256].includes(repair.adjudicationReceiptSha256)
  if(!agreement&&!adjudicated)continue
  if(!source.speakingPageImages?.some(i=>i.page===page&&i.url===repair.sourceImageUrl)||!/^\/generated\/speaking-pages\/cam\d+\/test\d+\/page-\d+\.webp$/.test(repair.sourceImageUrl||''))continue
  if(!content||!text(content.part1Topic)||!text(content.cuePrompt)||!text(content.cueExplanation)||!lines(content.part1,2,12)||!lines(content.cueBullets,3,5)||!lines(content.part3,2,16)||!lines(content.part3Topics,0,5))continue
  const identity=pageIdentity(source),id=`cam${book}-s-page${page}`
  if(visiblePages.has(identity)||visibleIds.has(id))continue
  try{if(!verifyImage(repair))continue}catch{continue}
  // An old parser sometimes renumbered tests after skipping a damaged page.
  // Use the exact physical source page until same-test identity is verified;
  // never silently repurpose a historical task ID or invent an exam ordinal.
  const cuePrompt=content.cuePrompt.trim(),part2=[cuePrompt,'You should say:',...content.cueBullets.map(s=>s.trim()),content.cueExplanation.trim()].join('\n')
  const title=cuePrompt.replace(/^(?:Describe|Talk about|Tell me about)\s+/i,'').replace(/[.!?]$/,'').replace(/^./,s=>s.toUpperCase())
  const restored={...source,id,test:0,title,source:`Cambridge IELTS ${book} · Speaking`,sourceKind:'cambridge-source-page',legacySourceId:source.id,
   part1Topic:content.part1Topic.trim(),part1:content.part1.map(s=>s.trim()),part2,part3Topics:content.part3Topics.map(s=>s.trim()),part3:content.part3.map(s=>s.trim()),
   sameTestEligible:false,formalProgressEligible:false,sourceReviewStatus:'ai-source-verified',sourcePageSha256:repair.sourcePageSha256}
  verifiedSources.add(restored);original.push(restored)
  visiblePages.add(identity);visibleIds.add(id)
 }
 return original
}
function createSpeakingPageVerifier(publicRoot){
 const cache=new Map()
 return repair=>{
  const relative=repair.sourceImageUrl.replace(/^\//,''),target=path.resolve(publicRoot,relative),inside=path.relative(path.resolve(publicRoot),target)
  if(!inside||inside.startsWith('..')||path.isAbsolute(inside))return false
  const stat=fs.statSync(target);if(!stat.isFile()||stat.size<1000||stat.size>4*1024*1024)return false
  const key=[target,stat.size,stat.mtimeMs,stat.ctimeMs].join('|')
  let actual=cache.get(key)
  if(!actual){actual=crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex');if(cache.size>=100)cache.clear();cache.set(key,actual)}
  return actual===repair.sourcePageSha256
 }
}
module.exports={mergeSpeakingSourceRepairs,createSpeakingPageVerifier,normalizeSpeakingSourceReading,isVerifiedSpeakingSource,carrySpeakingSourceVerification}
