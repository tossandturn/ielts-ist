const source=require('./webTopics.generated.json')
const {writingPrompt}=require('./nativeWritingSource.cjs')
const icons={'food-agriculture':'food','education-learning':'education','technology-digital':'technology','work-career':'work','environment-climate':'environment','transport-mobility':'transport','cities-housing':'architecture','health-lifestyle':'health','family-children':'society','crime-law':'law','government-public':'history','culture-traditions':'culture','media-advertising':'media','globalisation-language':'travel','consumerism-money':'business','science-research':'science','charts-data':'business','essay-general':'education'}
const categoryIcon={people:'society',place:'travel',lifestyle:'culture',education:'education',technology:'technology',media:'media',nature:'environment',work:'work',society:'society'}
const oneWord=value=>(String(value||'Speaking').split(/\s*[·|:/|,-]\s*|\s+/).find(Boolean)||'Speaking').replace(/^./,s=>s.toUpperCase()).slice(0,24)
const compact=value=>String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()
const writingRules=source.writingRules.map(rule=>({...rule,regex:new RegExp(rule.pattern,rule.flags)}))
const legacy={education:'education-learning',technology:'technology-digital',work:'work-career',nature:'environment-climate',place:'cities-housing',lifestyle:'health-lifestyle',society:'government-public',media:'culture-traditions'}
function topicMetadata(task,module){
 if(module==='writing'){
  const text=[writingPrompt(task.prompt||'',task.id),task.data,task.title].filter(Boolean).join(' ').replace(/present a written argument or case to an educated reader with no specialist knowledge|\bacademic\b|you should spend about \d+ minutes on this task|write at least \d+ words/gi,' ')
  const rule=writingRules.find(r=>r.key===task.topicSubcategory)||writingRules.find(r=>r.regex.test(text))||writingRules.find(r=>r.key===legacy[task.topicCategory])||writingRules.find(r=>r.key===(/task1$/.test(task.id)||/^Task 1\b/i.test(task.type)?'charts-data':'essay-general'))
  return {topicKey:'writing-'+rule.key,topicLabel:rule.label,topicIcon:icons[rule.key]||'education',topicEmoji:rule.emoji}
 }
 if(module!=='speaking')return {}
 let title,emoji,category
 if(task.displayTitle&&task.emoji){title=oneWord(task.displayTitle);emoji=task.emoji;category=task.category||'lifestyle'}
 else{
  const texts=[task.displayTitle,task.part1Topic,task.source==='Public topics'?task.title:'',task.topicKeywords,task.keywords,task.title,task.part2,Array.isArray(task.part1)?task.part1.join(' '):task.part1,Array.isArray(task.part3Topics)?task.part3Topics.join(' '):task.part3Topics,Array.isArray(task.part3)?task.part3.join(' '):task.part3].filter(Boolean).map(compact)
  let match
  for(const text of texts){let best=null;for(const [index,entry]of source.speakingTaxonomy.entries())for(const alias of entry[3]||[]){const key=compact(alias);if((' '+text+' ').includes(' '+key+' ')){const score=alias.length*1000-index;if(!best||score>best.score)best={entry,score}}}if(best){match=best.entry;break}}
  ;[title,emoji,category]=match||[oneWord(task.displayTitle||task.part1Topic||task.title),'',task.category||'lifestyle']
 }
 return {topicKey:'speaking-'+title.toLowerCase().replace(/[^a-z0-9]+/g,'-'),topicLabel:title,topicIcon:/money|shopping/i.test(title)?'business':categoryIcon[category]||'education',topicEmoji:emoji}
}
function publicTasks(module){return (source[module]||[]).map(task=>({...task,sourceKind:'public-topic',contentLifecycle:'curated-practice',formalProgressEligible:false}))}
module.exports={topicMetadata,publicTasks,sourceHash:source.sourceHash}
