import assert from 'node:assert/strict'
import {bindWritingSource} from '../server/nativeWritingSource.cjs'
const task={id:'cam15-w-test1-task1',prompt:'The canonical chart task',writingPageImages:[{url:'/generated/writing-pages/chart.webp'}]}
let loaded=0
const options={findTask:id=>id===task.id?task:null,loadImage:()=>{loaded++;return 'data:image/webp;base64,fixture'}}
const bound=bindWritingSource({id:task.id,prompt:'forged prompt',essay:'student text'},options)
assert.equal(bound.prompt,task.prompt);assert.equal(bound.sourceImages.length,1);assert.equal(loaded,1)
assert.doesNotMatch(JSON.stringify(bound),/data:image|forged prompt/,'image bytes must not leak into persisted report contracts')
assert.throws(()=>bindWritingSource({id:'cam99-w-test1-task1'},options))
assert.equal(bindWritingSource({id:'custom',prompt:'A user task'},options).prompt,'A user task')
console.log('Native Writing source: canonical task binding, required original image evidence and no inline-image contract leakage passed.')
