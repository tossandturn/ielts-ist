const fs=require('node:fs'),path=require('node:path')
function writingPrompt(value,id){
 const source=String(value||''),task=String(id||'').match(/^cam\d+-w-test\d+-task([12])$/)
 if(!task)return source
 const end=new RegExp('Write at least\\s+'+(task[1]==='1'?'150':'250')+'\\s+words\\.?','i').exec(source)
 return (end?source.slice(0,end.index+end[0].length):source).replace(/^\s*\|\s*$/gm,'').replace(/\n{3,}/g,'\n\n').trim()
}
function sourceImage(url,publicRoot){
 try {
 const clean=decodeURIComponent(String(url||''))
 if(!/^\/generated\/writing-pages\/[a-zA-Z0-9_./-]+\.(?:webp|png|jpe?g)$/i.test(clean)||clean.includes('..'))throw Object.assign(Error('Writing source image is not available.'),{statusCode:422})
 const root=fs.realpathSync(path.join(publicRoot,'generated/writing-pages'))
 const file=fs.realpathSync(path.resolve(publicRoot,'.'+clean))
 if(!file.startsWith(root+path.sep))throw Object.assign(Error('Writing source image is outside the allowed library.'),{statusCode:422})
 const stat=fs.statSync(file);if(!stat.isFile()||stat.size>3*1024*1024)throw Object.assign(Error('Writing source image is too large.'),{statusCode:422})
 const bytes=fs.readFileSync(file),mime=/\.webp$/i.test(file)?'webp':/\.png$/i.test(file)?'png':'jpeg'
 const valid= mime==='webp'?bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP':mime==='png'?bytes.subarray(0,4).equals(Buffer.from([137,80,78,71])):bytes[0]===255&&bytes[1]===216
 if(!valid)throw Error('Invalid image')
 return 'data:image/'+mime+';base64,'+bytes.toString('base64')
 } catch { throw Object.assign(Error('The original Writing image is temporarily unavailable; your essay has not been graded.'),{statusCode:422,code:'writing_source_unavailable'}) }
}
function bindWritingSource(item,{findTask,loadImage}){
 const id=String(item.sourceTaskId||item.id||'')
 if(!/^cam\d+-w-test\d+-task[12]$/.test(id))return item
 const task=findTask(id)
 if(!task)throw Object.assign(Error('The selected Writing source is not published.'),{statusCode:422})
 const taskNumber=/task1$/.test(id)?1:2
 const urls=taskNumber===1||!task.prompt?(task.writingPageImages||[]).map(image=>image.url):[]
 if((taskNumber===1||!task.prompt)&&(!urls.length||urls.length>4))throw Object.assign(Error('The original Writing question is not ready for marking.'),{statusCode:422})
 const images=urls.map(loadImage)
 const bound={...item,sourceTaskId:id,taskNumber,kind:taskNumber===1?'academic-task-1':'task-2',sourceImageUrls:urls,prompt:writingPrompt(task.prompt||task.data||('IELTS Writing Task '+taskNumber+'. Use the attached original question.'),id)}
 Object.defineProperty(bound,'sourceImages',{value:images,enumerable:false})
 return bound
}
module.exports={bindWritingSource,sourceImage,writingPrompt}
