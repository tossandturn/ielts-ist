import assert from 'node:assert/strict'
import {buildNativeCatalog,nativeTaskDetail,sourceSections} from '../server/nativeIeltsCatalog.cjs'
const reading={id:'cam15-r-test1',title:'Reading',minutes:60,readingPassageStartPages:{1:10,2:20,3:30},contentTopics:{1:{key:'science',label:'Science',title:'A source title'}},questions:Array.from({length:40},(_,i)=>({id:'q'+(i+1),text:'Question '+(i+1),questionPage:i<14?12:i<27?22:32}))}
const listening={id:'cam15-l-test1',audioUrls:['one','two','three','four'],questions:reading.questions.map(q=>({...q}))}
const payload={readingTests:[reading],listeningTests:[listening],writingTasks:[],speakingSets:[],aiBaseUrl:'not-part-of-native-catalog'}
const catalog=buildNativeCatalog(payload)
assert.equal(catalog.schemaVersion,'native-ielts-catalog-v1')
assert.equal(catalog.readingTests[0].questionCount,40)
assert.equal(catalog.readingTests[0].sections[0].questionCount,14,'source pages, not a hard-coded 13-question Passage 1')
assert.doesNotMatch(JSON.stringify(catalog),/questionPage|Question 1|aiBaseUrl|questionIds/)
const task=nativeTaskDetail(payload,'reading',reading.id)
assert.equal(task.nativeSections[1].questionIds[0],'q15')
assert.equal(task.nativeSections[2].questionIds.at(-1),'q40')
assert.equal(sourceSections({...reading,readingPassageStartPages:{}},'reading').length,0,'missing source boundaries do not authorize guessed passage splits')
assert.equal(sourceSections({...reading,questions:reading.questions.map((q,i)=>i===25?{...q,questionPage:null}:q)},'reading').length,0)
assert.equal(sourceSections(listening,'listening').length,4)
assert.equal(nativeTaskDetail(payload,'reading','../../server'),null)
assert.equal(nativeTaskDetail(payload,'speaking',reading.id),null)
console.log('Native catalog: bounded index, exact source-page sections, detail isolation and no guessed Reading boundaries passed.')
