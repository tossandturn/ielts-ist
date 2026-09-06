function omitInlinePdf(value){
 if(Array.isArray(value))return value.map(omitInlinePdf)
 if(!value||typeof value!=='object')return value
 return Object.fromEntries(Object.entries(value).filter(([key])=>key!=='pdfDataUrl').map(([key,item])=>[key,omitInlinePdf(item)]))
}
function nativeReportResponse(request,payload){
 const path=String(request?.url||'').split('?')[0]
 if(request?.headers?.['x-stemist-native']!=='1'||!/^\/api\/(?:writing\/feedback(?:\/job\/[a-zA-Z0-9_-]+)?|speaking\/feedback|exam\/report|learning\/attempts\/[a-zA-Z0-9_-]+)$/.test(path))return payload
 return omitInlinePdf(payload)
}
module.exports={nativeReportResponse}
