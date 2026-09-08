// Single byte ranges per RFC 9110 sections 14.1.2 and 14.2.
// Unsupported units and multipart ranges are deliberately ignored.
function parseSourceByteRange(header,size,method='GET'){
 if(method!=='GET'||typeof header!=='string'||!Number.isSafeInteger(size)||size<=0)return null
 if(!/^bytes\s*=/i.test(header)||header.includes(','))return null
 const match=/^bytes\s*=\s*(\d*)-(\d*)\s*$/i.exec(header)
 if(!match||!match[1]&&!match[2])return {unsatisfiable:true}
 const length=BigInt(size)
 if(!match[1]){const suffix=BigInt(match[2]);return suffix===0n?{unsatisfiable:true}:{start:Number(suffix>=length?0n:length-suffix),end:size-1}}
 const first=BigInt(match[1]),last=match[2]?BigInt(match[2]):length-1n
 if(first>=length||last<first)return {unsatisfiable:true}
 return {start:Number(first),end:Number(last>=length?length-1n:last)}
}
module.exports={parseSourceByteRange}
