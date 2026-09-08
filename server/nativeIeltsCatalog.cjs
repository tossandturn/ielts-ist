const BANKS={listening:'listeningTests',reading:'readingTests',writing:'writingTasks',speaking:'speakingSets'}
const crypto=require('node:crypto')
const {topicMetadata,publicTasks,sourceHash}=require('./nativeTopicMetadata.cjs')
const ALLOWED=['id','module','title','type','source','sourceKind','formalProgressEligible','period','minutes','sourceUrl','audioUrls','questionPageImages','questions','contentTopics','contentVersion','contentLifecycle','humanReviewStatus','readingPageImages','readingPassagePageImages','readingQuestionPageImages','readingPassageStartPages','writingPageImages','speakingPageImages','prompt','data','visual','part1Topic','part1','part2','part3','part3Topics','topicKeywords','displayTitle','emoji','category','topicCategory','topicSubcategory']
const number=(q,index)=>Number(String(q.id||'').match(/^(?:q)?(\d+)$/)?.[1])||index+1
function tasksFor(payload,module,includePublicTopics){
 const tasks=(payload[BANKS[module]]||[]).slice(),seen=new Map(tasks.map(t=>[t.id,t]))
 if(includePublicTopics)for(const task of publicTasks(module)){
  const previous=seen.get(task.id)
  if(previous){const evidence=t=>JSON.stringify([t.prompt||'',t.part1||[],t.part2||'',t.part3||[]]);if(previous.source!=='Public topics'||evidence(previous)!==evidence(task))throw Error('Conflicting published public-topic ID');continue}
  tasks.push(task);seen.set(task.id,task)
 }
 return tasks
}

function sourceSections(task,module){
 if(!['listening','reading'].includes(module)||!Array.isArray(task.questions)||task.questions.length!==40)return []
 const starts=Object.entries(task.readingPassageStartPages||{}).map(([section,page])=>({section:Number(section),page:Number(page)})).sort((a,b)=>a.section-b.section)
 if(module==='reading'&&(starts.length!==3||starts.some((item,index)=>item.section!==index+1||!Number.isInteger(item.page)||item.page<1||index>0&&item.page<=starts[index-1].page)))return []
 const grouped=new Map()
 for(const [index,q] of task.questions.entries()){
  const n=number(q,index)
  const page=Number(q.questionPage)
  const section=module==='listening'?Math.ceil(n/10):starts.filter(start=>Number.isInteger(page)&&page>=start.page).at(-1)?.section
  if(!section||n<1||n>40)return []
  const list=grouped.get(section)||[];list.push(q.id);grouped.set(section,list)
 }
 const count=module==='reading'?3:4
 if(grouped.size!==count||new Set([...grouped.values()].flat()).size!==40)return []
 return Array.from({length:count},(_,index)=>{
  const section=index+1,topic=task.contentTopics?.[section]||{}
  return {number:section,label:(module==='reading'?'Passage ':'Section ')+section,
   topicKey:String(topic.key||''),topicLabel:String(topic.label||''),topicIcon:String(topic.icon||topic.key||''),topicEmoji:String(topic.emoji||''),title:String(topic.title||'').slice(0,220),
   questionIds:grouped.get(section),questionCount:grouped.get(section).length,minutes:module==='reading'?20:10}
 })
}

function indexItem(task,module){
 return {id:task.id,module,title:String(task.title||''),type:String(task.type||''),source:String(task.source||''),sourceKind:task.sourceKind||(/^cam\d+-/.test(task.id)?'cambridge':'published'),...topicMetadata(task,module),
  book:Number(String(task.id).match(/^cam(\d+)/)?.[1])||0,test:Number(String(task.id).match(/test(\d+)/)?.[1])||0,
  minutes:Number(task.minutes)||({listening:40,reading:60,writing:40,speaking:15})[module],
  questionCount:Array.isArray(task.questions)?task.questions.length:0,
  sections:sourceSections(task,module).map(({questionIds,...section})=>section)}
}

function buildNativeCatalog(payload,{includePublicTopics=false}={}){
 const baseVersion=crypto.createHash('sha256').update('native-task-v2|').update(JSON.stringify(Object.fromEntries(Object.values(BANKS).map(key=>[key,payload[key]||[]])))).digest('hex').slice(0,24)
 const version=includePublicTopics?crypto.createHash('sha256').update('native-task-v3-topics|'+baseVersion+'|'+sourceHash+'|'+includePublicTopics).digest('hex').slice(0,24):baseVersion
 return {schemaVersion:'native-ielts-catalog-v1',version,baseVersion,topicVersion:sourceHash,...Object.fromEntries(Object.entries(BANKS).map(([module,key])=>[key,tasksFor(payload,module,includePublicTopics).map(task=>indexItem(task,module))]))}
}

function nativeTaskDetail(payload,module,id,{includePublicTopics=false}={}){
 if(!BANKS[module]||!/^[-a-zA-Z0-9_]+$/.test(String(id)))return null
 const task=tasksFor(payload,module,includePublicTopics).find(task=>task.id===id)
 if(!task)return null
 const result={...Object.fromEntries(ALLOWED.filter(key=>task[key]!==undefined).map(key=>[key,task[key]])),...topicMetadata(task,module),nativeSections:sourceSections(task,module)}
 if(module==='listening'){
  const match=String(id).match(/^cam(\d+)-l-test(\d+)$/)
  const reading=match?(payload.readingTests||[]).find(item=>item.id===`cam${match[1]}-r-test${match[2]}`):null
  const boundary=Number(reading?.readingPassageStartPages?.[1])
  // The same physical PDF and complete question anchors are required. Never
  // guess a cut from the word "reading" or drop an unlocated continuation.
  if(reading&&task.sourceUrl===reading.sourceUrl&&/(?:\.pdf(?:[?#]|$)|^\/cambridge15\/pdf$)/i.test(String(task.sourceUrl||''))&&Number.isInteger(boundary)&&boundary>0&&task.questions?.length===40&&task.questions.every(q=>Number(q.questionPage)>0&&Number(q.questionPage)<boundary)){
   result.questionPageImages=(result.questionPageImages||[]).filter(image=>Number(image.page)<boundary)
  }
 }
 if(result.questions)result.questions=result.questions.map(q=>Object.fromEntries(['id','text','type','typeLabel','questionPage','options','optionsVerified','selectionLimit','optionGroupId'].filter(key=>q[key]!==undefined).map(key=>[key,q[key]])))
 return result
}
function nativeCatalogView(cache,request){
 const includePublicTopics=request?.headers?.['x-stemist-catalog']==='native-topics-v1',key=includePublicTopics?'shared-topics-v1':'legacy-cambridge-v1'
 cache.nativeIndexes ||= Object.create(null)
 cache.nativeIndexes[key] ||= buildNativeCatalog(cache.payload,{includePublicTopics})
 return {catalog:cache.nativeIndexes[key],options:{includePublicTopics}}
}
module.exports={buildNativeCatalog,nativeTaskDetail,sourceSections,nativeCatalogView}
