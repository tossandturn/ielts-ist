import assert from 'node:assert/strict'
import {nativeReportResponse} from '../server/nativeReportResponse.cjs'
const payload={mode:'ai:test',pdfDataUrl:'data:application/pdf;base64,'+'x'.repeat(1000000),pdfUrl:'/api/report/pdf/id',analysis:{overall:6.5},tasks:[{pdfDataUrl:'large-child',pdfUrl:'/api/report/pdf/child',feedback:'feedback'}]}
for(const url of ['/api/writing/feedback/job/a-b-c','/api/speaking/feedback','/api/exam/report']){
 const result=nativeReportResponse({url,headers:{'x-stemist-native':'1'}},payload)
 assert.equal(result.pdfDataUrl,undefined);assert.equal(result.tasks[0].pdfDataUrl,undefined)
 assert.equal(result.analysis.overall,6.5);assert.equal(result.pdfUrl,payload.pdfUrl)
 assert.ok(JSON.stringify(result).length<1000)
 assert.equal(nativeReportResponse({url,headers:{}},payload),payload,'browser response remains unchanged')
}
assert.equal(nativeReportResponse({url:'/api/speaking/recording',headers:{'x-stemist-native':'1'}},payload),payload,'audio evidence transport must not be stripped')
console.log('Native report payloads omit inline PDFs without changing scores, links, browser responses or audio evidence.')
