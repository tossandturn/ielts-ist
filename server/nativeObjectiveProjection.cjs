const crypto=require('node:crypto')
const {sourceSections}=require('./nativeIeltsCatalog.cjs')
function nativeObjectiveRecord(row,result,task){
 if(!row||row.status!=='submitted'||!Number.isInteger(Number(row.user_id))||Number(row.user_id)<1)return null
 const ids=JSON.parse(row.question_ids_json||'[]')
 if(!ids.length||ids.length>40||new Set(ids).size!==ids.length)throw Error('Invalid submitted question set')
 const full=ids.length===40,selected=new Set(ids)
 const section=full?null:sourceSections(task,row.module).find(s=>s.questionIds.length===ids.length&&s.questionIds.every(id=>selected.has(id)))
 const suffix=section?'::section::'+section.number:'::review::'+crypto.createHash('sha1').update(ids.join(',')).digest('hex').slice(0,12)
 const safeResult={...result}
 if(!full){delete safeResult.band;delete safeResult.overall;delete safeResult.scores}
 safeResult.nativeContext={taskId:row.task_id,questionIds:ids,section:section?.number||0,title:task.title||row.task_id}
 return {id:row.attempt_id,userId:Number(row.user_id),module:row.module,itemId:full?row.task_id:row.task_id+suffix,
  mode:full?'native-paper':'native-section',score:{correct:result.correct,total:result.scoredTotal||result.total,...(full&&result.answerAvailable&&Number.isFinite(result.band)?{band:result.band}:{})},
  result:safeResult,feedback:{source:'server-objective-grading',scope:full?'paper':'subset'},submittedAt:row.submitted_at}
}
module.exports={nativeObjectiveRecord}
