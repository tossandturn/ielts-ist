function nativeExamWriting(userId,writing,manifest,getJob){
 const expected=manifest?.writingSourceIds,ids=writing?.feedbackJobIds,tasks=writing?.tasks;
 if(!Array.isArray(expected)||expected.length!==2||!Array.isArray(ids)||ids.length!==2||!Array.isArray(tasks)||tasks.length!==2)throw Object.assign(new Error('Complete both Writing tasks before creating this report.'),{statusCode:409,code:'writing_feedback_required'});
 const results=[],items=[];
 for(let index=0;index<2;index++){
  const job=getJob(String(ids[index]||''));
  if(!job||job.userId!==userId)throw Object.assign(new Error('Writing feedback is not available.'),{statusCode:404,code:'writing_feedback_not_found'});
  if(job.status!=='done'||!job.result)throw Object.assign(new Error('Writing feedback is still pending.'),{statusCode:409,code:'writing_feedback_pending'});
  if(tasks[index].id!==expected[index]||job.sourceTaskIds?.length!==1||job.sourceTaskIds[0]!==expected[index]||!new RegExp('^cam\\d+-w-test\\d+-task'+(index+1)+'$').test(expected[index]))throw Object.assign(new Error('Writing feedback belongs to another task.'),{statusCode:409,code:'writing_feedback_source_mismatch'});
  const evidence=job.result.contract?.attempt?.items?.[0];
  if(!evidence||!job.result.analysis)throw Object.assign(new Error('Writing feedback is incomplete.'),{statusCode:409,code:'writing_feedback_incomplete'});
  items.push({id:expected[index],taskNumber:index+1,kind:index===0?'academic-task-1':'task-2',prompt:String(evidence.prompt||''),essay:String(evidence.response||'')});
  results.push(job.result);
 }
 return {items,results};
}
module.exports={nativeExamWriting};
