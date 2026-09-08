import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {buildNativeCatalog,nativeTaskDetail,nativeCatalogView} from '../server/nativeIeltsCatalog.cjs'
import {publicTasks,topicMetadata} from '../server/nativeTopicMetadata.cjs'
execFileSync(process.execPath,['scripts/build-web-topic-projection.cjs','--check'],{stdio:'pipe'})
const payload={listeningTests:[],readingTests:[],writingTasks:[{id:'cam15-w-test1-task1',type:'Task 1',title:'A chart',prompt:'Summarise the information.'}],speakingSets:[{id:'cam4-s-test1',title:'Speaking',part1Topic:'Friends'}]}
const base=buildNativeCatalog(payload),catalog=buildNativeCatalog(payload,{includePublicTopics:true})
assert.equal(base.version,base.baseVersion,'legacy native clients keep their unchanged Cambridge bundle identity')
const cache={payload},legacyView=nativeCatalogView(cache,{headers:{}}),sharedView=nativeCatalogView(cache,{headers:{'x-stemist-catalog':'native-topics-v1'}})
assert.equal(legacyView.catalog.speakingSets.length,1,'old random-exam clients must not receive public topics they cannot isolate')
assert.equal(sharedView.catalog.speakingSets.length,147)
assert.equal(nativeCatalogView(cache,{headers:{}}).catalog,legacyView.catalog,'old and new cache entries must not overwrite each other')
assert.equal(catalog.writingTasks.length,25);assert.equal(catalog.speakingSets.length,147)
assert.equal(catalog.baseVersion,base.baseVersion,'adding public metadata does not invalidate unchanged Cambridge source bundles')
assert.notEqual(catalog.version,base.version)
assert.equal(new Set(catalog.speakingSets.map(t=>t.id)).size,147)
for(const [module,key]of [['writing','writingTasks'],['speaking','speakingSets']]){
 const expected=publicTasks(module),actual=catalog[key].filter(t=>t.source==='Public topics')
 assert.deepEqual(actual.map(t=>t.id),expected.map(t=>t.id),'retain the website public IDs and source ordering')
 for(const task of expected){const detail=nativeTaskDetail(payload,module,task.id,{includePublicTopics:true});assert.ok(detail);assert.equal(detail.sourceKind,'public-topic');assert.equal(detail.formalProgressEligible,false);assert.ok(detail.topicKey&&detail.topicLabel&&detail.topicEmoji);if(module==='writing')assert.equal(detail.prompt,task.prompt);else{assert.deepEqual(detail.part1,task.part1);assert.equal(detail.part2,task.part2);assert.deepEqual(detail.part3,task.part3)}}
}
assert.equal(topicMetadata(payload.writingTasks[0],'writing').topicKey,'writing-charts-data')
assert.equal(catalog.speakingSets[0].topicLabel,'Friends')
assert.equal(nativeTaskDetail(payload,'speaking','public-speaking-hometown'),null,'explicit opt-in keeps existing helper consumers compatible')
assert.doesNotMatch(JSON.stringify(catalog),/part1|part2|prompt|sourceUrl|questionPageImages/,'list payload remains metadata only')
console.log('Native public topics: 24 Writing and 146 Speaking entries match the website IDs/content/icons; Cambridge source version, detail isolation and non-formal provenance passed.')
