const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm')
const source=fs.readFileSync('server.js','utf8'),code=source.slice(source.indexOf('function speakingSetQualityIssue('),source.indexOf('function speakingContentDescriptor('))
const quality=vm.runInNewContext(code+'\nspeakingSetQualityIssue',{isVerifiedSpeakingSource:()=>false})
const question='How do you usually contact your friends? [Why?]'
const task={title:'A party that you enjoyed',part1:[question,question,question,question],part2:'Describe a party that you enjoyed.\nYou should say:\nwhose party it was and what it was celebrating\nwhere the party was held and who went to it\nwhat people did during the party\nand explain what you enjoyed about this party.',part3:Array(6).fill('Why do people organise family parties in your country?')}
assert.equal(quality(task),'','Printed bracketed follow-up prompts do not truncate a complete question')
assert.equal(quality({...task,part1:Array(4).fill('How do you usually contact your friends [Why?]')}),'truncated_questions')
assert.equal(quality({...task,part2:task.part2.replace('Describe a party that you enjoyed.','Describe a party that')}),'truncated_cue_card_title')
console.log('Speaking punctuation: complete bracketed follow-ups accepted; incomplete questions and titles remain rejected.')
