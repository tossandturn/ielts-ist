import assert from 'node:assert/strict'
import {nativeObjectiveRecord} from '../server/nativeObjectiveProjection.cjs'
const task={title:'Source Reading',questions:Array.from({length:40},(_,i)=>({id:'q'+(i+1),questionPage:i<13?10:i<26?20:30})),readingPassageStartPages:{1:8,2:18,3:28}}
const row={attempt_id:'objective-fixture',user_id:7,status:'submitted',task_id:'cam15-r-test1',module:'reading',question_ids_json:JSON.stringify(task.questions.slice(13,26).map(q=>q.id)),submitted_at:'2026-09-06T00:00:00Z'}
const record=nativeObjectiveRecord(row,{answerAvailable:true,correct:0,total:13,scoredTotal:13,band:0,details:[]},task)
assert.equal(record.itemId,'cam15-r-test1::section::2')
assert.equal(record.score.band,undefined);assert.equal(record.result.band,undefined)
assert.equal(record.result.nativeContext.questionIds[0],'q14')
assert.equal(nativeObjectiveRecord({...row,user_id:null},{},task),null)
assert.equal(nativeObjectiveRecord({...row,status:'open'},{},task),null)
const full=nativeObjectiveRecord({...row,question_ids_json:JSON.stringify(task.questions.map(q=>q.id))},{answerAvailable:true,correct:25,total:40,band:6},task)
assert.equal(full.itemId,row.task_id);assert.equal(full.score.band,6)
console.log('Native learning projection uses verified submissions; subsets cannot complete a full paper or create a full Band.')
