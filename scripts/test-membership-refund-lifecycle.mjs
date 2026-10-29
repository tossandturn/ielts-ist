import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const callback=require('../server/membershipWechatCallback.js');
const {createMembershipWechatRuntime}=require('../server/membershipWechatRuntime.js');
const {createWechatVirtualProvider}=require('../server/membershipWechatVirtual.js');
const now=new Date('2026-10-29T12:00:00Z');
const config={enabled:true,appId:'wxrefundfixture',offerId:'1234567890',productId:'membership',appKey:'synthetic-key',token:'SyntheticToken123',encodingAesKey:Buffer.alloc(32,5).toString('base64').slice(0,-1),callbackFormat:'json',getAccessToken:async()=>'synthetic-access-token'};
const key=Buffer.from(config.encodingAesKey+'=','base64');
const sha1=values=>crypto.createHash('sha1').update(values.sort().join('')).digest('hex');
function envelope(message,format='json'){
 const text=format==='json'?JSON.stringify(message):'<xml>'+Object.entries(message).map(([k,v])=>`<${k}>${v}</${k}>`).join('')+'</xml>';
 const payload=Buffer.from(text);const size=Buffer.alloc(4);size.writeUInt32BE(payload.length);
 const plain=Buffer.concat([Buffer.alloc(16,3),size,payload,Buffer.from(config.appId)]);
 const padding=32-plain.length%32;const cipher=crypto.createCipheriv('aes-256-cbc',key,key.subarray(0,16));cipher.setAutoPadding(false);
 const Encrypt=Buffer.concat([cipher.update(Buffer.concat([plain,Buffer.alloc(padding,padding)])),cipher.final()]).toString('base64');
 const timestamp=String(Math.floor(now.getTime()/1000)),nonce='fixture';
 return {rawBody:format==='json'?JSON.stringify({ToUserName:'gh_fixture',Encrypt}):`<xml><ToUserName>gh_fixture</ToUserName><Encrypt>${Encrypt}</Encrypt></xml>`,query:{encrypt_type:'aes',timestamp,nonce,msg_signature:sha1([config.token,timestamp,nonce,Encrypt])},config:{...config,callbackFormat:format}};
}
function decryptReply(response,format='json'){
 const outer=format==='json'?JSON.parse(response.body):Object.fromEntries([...response.body.matchAll(/<(Encrypt|MsgSignature|TimeStamp|Nonce)>(?:<!\[CDATA\[)?([^<]*?)(?:\]\]>)?<\/\1>/g)].map(m=>[m[1],m[2]]));
 assert.equal(outer.MsgSignature,sha1([config.token,String(outer.TimeStamp),outer.Nonce,outer.Encrypt]));
 const decipher=crypto.createDecipheriv('aes-256-cbc',key,key.subarray(0,16));decipher.setAutoPadding(false);
 const padded=Buffer.concat([decipher.update(Buffer.from(outer.Encrypt,'base64')),decipher.final()]);
 const plain=padded.subarray(0,padded.length-padded.at(-1)),length=plain.readUInt32BE(16);
 assert.equal(plain.subarray(20+length).toString(),config.appId);
 return plain.subarray(20,20+length).toString();
}
const baseMessage={ToUserName:'gh_fixture',FromUserName:'payer-fixture',CreateTime:String(now.getTime()/1000),MsgType:'event'};
const inquiry={...baseMessage,Event:'xpay_subscribe_ios_refund_query_notify',refund_time:String(now.getTime()/1000),order_time:String(now.getTime()/1000-600),channel_bill:'apple-fixture-bill',bundleid:'com.tencent.xin',product_id:'membership',p_count:'1',refund_request_reason:'UNINTENDED_PURCHASE',provide_status:'1',pay_order_id:'wechat-payment-fixture'};
const order={id:'M'+ '1'.repeat(30),userId:42,planId:'all-access-month',productId:'membership',provider:'wechat_virtual',platform:'ios',idempotencyKey:'fixture-idempotency',outTradeNo:'M'+'1'.repeat(30),amountFen:2880,currency:'CNY',durationDays:30,autoRenew:false,status:'fulfilled',payerAppId:config.appId,payerOpenid:'payer-fixture',providerOrderId:'wechat-payment-fixture',createdAt:new Date(now-600000).toISOString(),updatedAt:now.toISOString(),expiresAt:new Date(+now+1800000).toISOString()};
const row={id:order.id,user_id:42,plan_id:order.planId,product_id:order.productId,provider:order.provider,platform:'ios',idempotency_key:order.idempotencyKey,out_trade_no:order.id,amount_fen:2880,currency:'CNY',duration_days:30,auto_renew:0,status:'fulfilled',payer_app_id:config.appId,payer_openid:order.payerOpenid,provider_order_id:order.providerOrderId,created_at:order.createdAt,updated_at:order.updatedAt,expires_at:order.expiresAt};
const refund={...baseMessage,FromUserName:'official-refund',Event:'xpay_refund_notify',OpenId:order.payerOpenid,WxRefundId:'wx-refund-fixture',MchRefundId:'merchant-refund-fixture',WxOrderId:order.providerOrderId,MchOrderId:order.id,RefundFee:2880,RetCode:0,RefundStartTimestamp:Math.floor(now.getTime()/1000)-5,RefundSuccTimestamp:Math.floor(now.getTime()/1000),RetryTimes:0};

// Actual encrypted Apple event, not a generic success acknowledgement.
for(const format of ['json','xml']){
 const parsed=callback.verifyEncryptedWechatNotification(envelope(inquiry,format));
 assert.equal(parsed.eventType,'ios_refund_inquiry');
 assert.equal(parsed.paymentId,order.providerOrderId);
 assert.equal(parsed.payerOpenid,order.payerOpenid);
 assert.equal(parsed.queryRequired,false);
 for(const field of ['pay_order_id','product_id','p_count','provide_status','refund_time']){
  const bad={...inquiry};delete bad[field];assert.throws(()=>callback.verifyEncryptedWechatNotification(envelope(bad,format)));
 }
}
const parsedRefund=callback.verifyEncryptedWechatNotification(envelope(refund));
assert.equal(parsedRefund.refundId,refund.WxRefundId);
assert.equal(parsedRefund.merchantRefundId,refund.MchRefundId);
assert.equal(callback.verifyEncryptedWechatNotification(envelope({...refund,RetCode:1,RefundSuccTimestamp:0})).eventType,'refund_failed_trigger');

const env={MEMBERSHIP_WECHAT_VIRTUAL_ENABLED:'1',MEMBERSHIP_WECHAT_VIRTUAL_PRODUCTION_READY:'1',MEMBERSHIP_WECHAT_VIRTUAL_PRODUCT_PUBLISHED:'1',MEMBERSHIP_WECHAT_VIRTUAL_MODE:'production',MEMBERSHIP_WECHAT_VIRTUAL_APP_ID:config.appId,MEMBERSHIP_WECHAT_VIRTUAL_OFFER_ID:config.offerId,MEMBERSHIP_WECHAT_VIRTUAL_PRODUCT_ID:config.productId,MEMBERSHIP_WECHAT_VIRTUAL_APP_KEY:config.appKey,MEMBERSHIP_WECHAT_VIRTUAL_APP_SECRET:'synthetic-secret',MEMBERSHIP_WECHAT_VIRTUAL_ANDROID_READY:'1',MEMBERSHIP_WECHAT_VIRTUAL_IOS_ENABLED:'1',MEMBERSHIP_WECHAT_VIRTUAL_IOS_IAP_READY:'1',WECHAT_VIRTUAL_CALLBACK_READY:'1',WECHAT_VIRTUAL_CALLBACK_MODE:'safe',WECHAT_VIRTUAL_CALLBACK_TOKEN:config.token,WECHAT_VIRTUAL_CALLBACK_AES_KEY:config.encodingAesKey,WECHAT_VIRTUAL_CALLBACK_FORMAT:'json'};
let network=0,applied=0;
for(const format of ['json','xml']){
 const runtime=createMembershipWechatRuntime({env:{...env,WECHAT_VIRTUAL_CALLBACK_FORMAT:format},clock:()=>+now,fetchImpl:async()=>{network++;throw Error('Inquiry must not call network');}});
 assert.deepEqual(runtime.providerRegistry,{});
 const start=performance.now();
 const result=await runtime.processNotification({...envelope(inquiry,format),lookupOrder:()=>{throw Error('Not a merchant trade number');},lookupIosOrder:()=>row,applyVerifiedEvent:()=>{applied++;}});
 assert.equal(result.eventType,'ios_refund_inquiry');
 const plain=decryptReply(result.response,format);
 assert.match(plain,/IosRefundQueryResponse/);
 assert.match(plain,/fulfilled/);
 assert.doesNotMatch(plain,/已消费|consumed|used the service|payer-fixture|synthetic/);
 if(format==='json')assert.equal(JSON.parse(plain).IosRefundQueryResponse.result_code,0);
 assert.ok(performance.now()-start<1000);
 const unknown=await runtime.processNotification({...envelope(inquiry,format),lookupOrder:()=>null,lookupIosOrder:()=>null,applyVerifiedEvent:()=>{applied++;}});
 assert.match(decryptReply(unknown.response,format),/not_verified/);
 const mismatch=await runtime.processNotification({...envelope(inquiry,format),lookupOrder:()=>null,lookupIosOrder:()=>({...row,payer_openid:'another-owner'}),applyVerifiedEvent:()=>{applied++;}});
 assert.match(decryptReply(mismatch.response,format),/not_verified/);
 const timeoutStart=performance.now();
 const delayed=await runtime.processNotification({...envelope(inquiry,format),lookupOrder:()=>null,lookupIosOrder:()=>new Promise(()=>{}),applyVerifiedEvent:()=>{applied++;}});
 assert.match(decryptReply(delayed.response,format),/not_verified/);
 assert.ok(performance.now()-timeoutStart<1500);
 await assert.rejects(runtime.processNotification({...envelope(inquiry,format),query:{},lookupIosOrder:()=>{throw Error('Cannot lookup before authentication');},applyVerifiedEvent:()=>{applied++;}}));
 const failed=await runtime.processNotification({...envelope({...refund,RetCode:1,RefundSuccTimestamp:0},format),lookupOrder:()=>row,applyVerifiedEvent:()=>{applied++;}});
 assert.equal(failed.eventType,'refund_failed_trigger');
}
assert.equal(network,0);assert.equal(applied,0);

let responseById={},requests=[];
const provider=createWechatVirtualProvider({config,clock:()=>now,httpClient:async request=>{
 const body=JSON.parse(request.body);requests.push(body);
 const value=responseById[body.wx_order_id||body.order_id];
 return {statusCode:200,body:JSON.stringify({errcode:0,order:value})};
}});
const checkout=await provider.createCheckout({order:{...order,status:'pending'},identity:{appId:config.appId,openid:order.payerOpenid,userId:42},sessionContext:{sessionKey:'synthetic-session',codeVerifiedAt:now.toISOString()}});
const payment={order_id:order.id,wx_order_id:order.providerOrderId,env_type:1,order_fee:2880,paid_fee:2880,refund_fee:0,left_fee:0,status:4,order_type:7,paid_time:Math.floor(+now/1000)-600,biz_meta:JSON.parse(checkout.parameters.signData).attach};
const refunded={order_id:refund.MchRefundId,wx_order_id:refund.WxRefundId,env_type:1,status:8,order_type:8,refund_fee:2880,paid_time:Math.floor(+now/1000)};
responseById={[order.id]:payment,[refund.WxRefundId]:refunded};
const confirmed=await provider.queryOrder({order,notification:parsedRefund});
assert.equal(confirmed.normalizedEvent.eventType,'refunded');
assert.equal(confirmed.normalizedEvent.providerOrderId,order.providerOrderId);
assert.deepEqual(requests.at(-1),{openid:order.payerOpenid,env:0,wx_order_id:refund.WxRefundId});
for(const change of [{status:5},{status:7},{order_type:1},{refund_fee:1},{order_id:'wrong-refund'},{wx_order_id:'wrong-refund'},{env_type:2}]){
 responseById[refund.WxRefundId]={...refunded,...change};
 await assert.rejects(provider.queryOrder({order,notification:parsedRefund}),e=>e.code==='membership_payment_mismatch');
}
responseById[refund.WxRefundId]=refunded;
for(const change of [{payerOpenid:'other'},{providerOrderId:'other'},{refundId:''},{merchantRefundId:''},{amountFen:1},{authenticated:false}]){
 await assert.rejects(provider.queryOrder({order,notification:{...parsedRefund,...change}}));
}
responseById[order.id]={...payment,status:8,refund_fee:2880};
const ambiguous=await provider.queryOrder({order});
assert.equal(ambiguous.normalizedEvent,null,'A payment lookup cannot prove which refund completed');
assert.equal(ambiguous.state,'refund_verification_required');
console.log('Membership refund lifecycle: encrypted JSON/XML inquiry, bounded factual advice, no inquiry grants, final refund IDs/platform/amount and ambiguous status checks PASS');
