// Build-only projection of the website's existing public definitions. No
// student data or external input is evaluated; production loads plain JSON.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto')
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'public/app.js'),'utf8').replace(/\r\n/g,'\n')
function array(name){const begin=source.indexOf('const '+name+' = [');if(begin<0)throw Error('Missing website definition: '+name);const end=source.indexOf('\n];',begin);if(end<0||end-begin>200000)throw Error('Unbounded website definition');return source.slice(begin,end+3)}
function between(start,end){const a=source.indexOf(start),b=source.indexOf(end,a);if(a<0||b<a||b-a>40000)throw Error('Website public-topic factory changed');return source.slice(a,b)}
const definitions=[array('builtInPublicWritingTopics'),array('builtInPublicSpeakingTopics'),array('publicSpeakingTopicSeeds'),array('speakingTopicCatalog'),between('function slugifyPublicTopic(value)','const speakingTopicCatalog = ['),between('function writingTopicRules()','function writingTopicMeta(')].join('\n')
const code=definitions+'\nJSON.stringify({writing:builtInPublicWritingTopics,speaking:[...builtInPublicSpeakingTopics,...expandedPublicSpeakingTopics],speakingTaxonomy:speakingTopicCatalog,writingRules:writingTopicRules().map(r=>({key:r.accent,label:r.title,emoji:r.emoji,pattern:r.pattern.source,flags:r.pattern.flags}))})'
const values=JSON.parse(vm.runInNewContext(code,Object.create(null),{timeout:300,contextCodeGeneration:{strings:false,wasm:false}}))
for(const [module,items] of Object.entries({writing:values.writing,speaking:values.speaking})){
 if(!Array.isArray(items)||items.length>400||new Set(items.map(t=>t.id)).size!==items.length)throw Error('Invalid public topic collection')
 for(const task of items)if(task.module!==module||task.source!=='Public topics'||!new RegExp('^public-'+module+'-[a-z0-9-]+$').test(task.id))throw Error('Non-public task in website projection')
}
const result={schemaVersion:'ieltsist-web-topic-projection-v1',source:'public/app.js',sourceHash:crypto.createHash('sha256').update(definitions).digest('hex'),...values}
const file=path.join(root,'server/webTopics.generated.json'),text=JSON.stringify(result,null,2)+'\n'
if(process.argv.includes('--write'))fs.writeFileSync(file,text,'utf8')
if(process.argv.includes('--check')&&fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n')!==text)throw Error('Public topic projection is stale; rebuild it from the website definitions')
console.log(JSON.stringify({writing:result.writing.length,speaking:result.speaking.length,sourceHash:result.sourceHash,bytes:Buffer.byteLength(text),sourceFilesChanged:0,written:process.argv.includes('--write')}))
