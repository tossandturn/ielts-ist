const BANKS={listening:'listeningTests',reading:'readingTests',writing:'writingTasks',speaking:'speakingSets'}
const crypto=require('node:crypto')
const ALLOWED=['id','module','title','type','source','period','minutes','sourceUrl','audioUrls','questionPageImages','questions','contentTopics','contentVersion','contentLifecycle','humanReviewStatus','readingPageImages','readingPassagePageImages','readingQuestionPageImages','readingPassageStartPages','writingPageImages','speakingPageImages','prompt','data','visual','part1Topic','part1','part2','part3']
const number=(q,index)=>Number(String(q.id||'').match(/^(?:q)?(\d+)$/)?.[1])||index+1

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
   topicKey:String(topic.key||''),topicLabel:String(topic.label||''),title:String(topic.title||'').slice(0,220),
   questionIds:grouped.get(section),questionCount:grouped.get(section).length,minutes:module==='reading'?20:10}
 })
}

function indexItem(task,module){
 return {id:task.id,module,title:String(task.title||''),type:String(task.type||''),source:String(task.source||''),
  book:Number(String(task.id).match(/^cam(\d+)/)?.[1])||0,test:Number(String(task.id).match(/test(\d+)/)?.[1])||0,
  minutes:Number(task.minutes)||({listening:40,reading:60,writing:40,speaking:15})[module],
  questionCount:Array.isArray(task.questions)?task.questions.length:0,
  sections:sourceSections(task,module).map(({questionIds,...section})=>section)}
}

function buildNativeCatalog(payload){
 const version=crypto.createHash('sha256').update('native-task-v2|').update(JSON.stringify(Object.fromEntries(Object.values(BANKS).map(key=>[key,payload[key]||[]])))).digest('hex').slice(0,24)
 return {schemaVersion:'native-ielts-catalog-v1',version,...Object.fromEntries(Object.entries(BANKS).map(([module,key])=>[key,(payload[key]||[]).map(task=>indexItem(task,module))]))}
}

function nativeTaskDetail(payload,module,id){
 if(!BANKS[module]||!/^[-a-zA-Z0-9_]+$/.test(String(id)))return null
 const task=(payload[BANKS[module]]||[]).find(task=>task.id===id)
 if(!task)return null
 const result={...Object.fromEntries(ALLOWED.filter(key=>task[key]!==undefined).map(key=>[key,task[key]])),nativeSections:sourceSections(task,module)}
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
 if(result.questions)result.questions=result.questions.map(q=>Object.fromEntries(['id','text','type','typeLabel','questionPage','options','selectionLimit','optionGroupId'].filter(key=>q[key]!==undefined).map(key=>[key,q[key]])))
 return result
}
module.exports={buildNativeCatalog,nativeTaskDetail,sourceSections}
