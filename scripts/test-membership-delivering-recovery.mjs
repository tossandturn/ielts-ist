import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {DatabaseSync}=require('node:sqlite');
const {installMembershipSchema,createMembershipCheckout,refreshMembershipOrder,applyVerifiedProviderResult,membershipStatus}=require('../server/membership.js');
const {createMembershipWechatRuntime}=require('../server/membershipWechatRuntime.js');

// Synthetic fixtures preserve the observed protocol shape, never real identities.
async function fixture(platform='android') {
  const now=Date.now(),db=new DatabaseSync(':memory:');
  db.exec("CREATE TABLE users(id INTEGER PRIMARY KEY,username TEXT); INSERT INTO users VALUES(42,'synthetic'); CREATE TABLE memberships(user_id INTEGER PRIMARY KEY,plan TEXT,starts_at TEXT,expires_at TEXT,updated_at TEXT);");
  installMembershipSchema(db);
  const aes=Buffer.alloc(32,6),token='SyntheticDeliverToken123',appId='wxdeliveringfixture';
  const env={MEMBERSHIP_WECHAT_VIRTUAL_ENABLED:'1',MEMBERSHIP_WECHAT_VIRTUAL_PRODUCTION_READY:'1',MEMBERSHIP_WECHAT_VIRTUAL_PRODUCT_PUBLISHED:'1',MEMBERSHIP_WECHAT_VIRTUAL_MODE:'production',MEMBERSHIP_WECHAT_VIRTUAL_APP_ID:appId,MEMBERSHIP_WECHAT_VIRTUAL_OFFER_ID:'1234567890',MEMBERSHIP_WECHAT_VIRTUAL_PRODUCT_ID:'membership',MEMBERSHIP_WECHAT_VIRTUAL_APP_KEY:'synthetic-app-key',MEMBERSHIP_WECHAT_VIRTUAL_APP_SECRET:'synthetic-secret',MEMBERSHIP_WECHAT_VIRTUAL_ANDROID_READY:'1',MEMBERSHIP_WECHAT_VIRTUAL_IOS_ENABLED:'1',MEMBERSHIP_WECHAT_VIRTUAL_IOS_IAP_READY:'1',WECHAT_VIRTUAL_CALLBACK_READY:'1',WECHAT_VIRTUAL_CALLBACK_MODE:'safe',WECHAT_VIRTUAL_CALLBACK_TOKEN:token,WECHAT_VIRTUAL_CALLBACK_AES_KEY:aes.toString('base64').slice(0,-1),WECHAT_VIRTUAL_CALLBACK_FORMAT:'json'};
  const control={reply:null,ackCalls:0,failAck:false,queries:0};
  const runtime=createMembershipWechatRuntime({env,fetchImpl:async(url,options)=>{
    const route=new URL(url).pathname;
    if(route==='/cgi-bin/stable_token')return new Response(JSON.stringify({access_token:'synthetic-token',expires_in:7200}));
    if(route==='/xpay/query_order'){control.queries++;return new Response(JSON.stringify({errcode:0,order:control.reply}));}
    assert.equal(route,'/xpay/notify_provide_goods','No payment creation/refund HTTP endpoint is allowed');
    const body=JSON.parse(options.body);
    assert.equal(db.prepare('SELECT status FROM membership_orders WHERE out_trade_no=?').get(body.order_id).status,'fulfilled','Acknowledge only after durable fulfillment');
    assert.equal(db.prepare('SELECT COUNT(*) n FROM membership_grants').get().n,1);
    control.ackCalls++;
    return new Response(JSON.stringify({errcode:control.failAck?1:0}));
  }});
  const registry=runtime.recoveryProviderRegistry;
  const created=await createMembershipCheckout({db,userId:'ielts:42',payload:{planId:'all-access-month',idempotencyKey:'synthetic-delivering-key',wxCode:'synthetic-code',platform,clientCapability:{requestVirtualPayment:true,iosVirtualPayment:true}},env,providerRegistry:registry,serverAuthorizedCheckout:true,assertCheckoutAuthorized:()=>true,resolveWechatIdentity:async()=>({userId:42,appId,openid:'synthetic-payer',sessionContext:{sessionKey:'synthetic-session',codeVerifiedAt:new Date().toISOString()}})});
  const sign=JSON.parse(created.payment.parameters.signData);
  control.reply={order_id:sign.outTradeNo,wx_order_id:'synthetic-wechat-order',status:3,env_type:1,order_type:platform==='android'?0:7,order_fee:2880,paid_fee:2880,left_fee:2880,paid_time:Math.floor(now/1000),biz_meta:JSON.stringify({attach:sign.attach})};
  const getRow=()=>db.prepare('SELECT * FROM membership_orders WHERE id=?').get(created.order.id);
  const refresh=()=>refreshMembershipOrder({db,userId:'ielts:42',orderId:created.order.id,providerRegistry:registry,env});
  function envelope() {
    const seconds=Math.floor(Date.now()/1000),message={ToUserName:'gh_synthetic',FromUserName:'synthetic-payer',CreateTime:seconds,MsgType:'event',Event:'xpay_goods_deliver_notify',OpenId:'synthetic-payer',OutTradeNo:sign.outTradeNo,Env:0,GoodsInfo:{ProductId:'membership',Quantity:1,OrigPrice:2880,ActualPrice:2880,Attach:sign.attach},WeChatPayInfo:{MchOrderNo:'synthetic-wechat-order',TransactionId:'synthetic-transaction',PaidTime:seconds}};
    const bytes=Buffer.from(JSON.stringify(message)),size=Buffer.alloc(4);size.writeUInt32BE(bytes.length);
    const plain=Buffer.concat([Buffer.alloc(16,4),size,bytes,Buffer.from(appId)]),padding=32-plain.length%32;
    const cipher=crypto.createCipheriv('aes-256-cbc',aes,aes.subarray(0,16));cipher.setAutoPadding(false);
    const Encrypt=Buffer.concat([cipher.update(Buffer.concat([plain,Buffer.alloc(padding,padding)])),cipher.final()]).toString('base64');
    const timestamp=String(seconds),nonce='synthetic-delivery';
    return {rawBody:JSON.stringify({ToUserName:'gh_synthetic',Encrypt}),query:{timestamp,nonce,encrypt_type:'aes',msg_signature:crypto.createHash('sha1').update([token,timestamp,nonce,Encrypt].sort().join('')).digest('hex')}};
  }
  const notify=()=>runtime.processNotification({...envelope(),lookupOrder:getRow,applyVerifiedEvent:event=>applyVerifiedProviderResult(db,event)});
  return {db,control,refresh,notify,getRow,registry,created,env};
}

{
  const f=await fixture();
  const results=await Promise.all([f.refresh(),f.notify(),f.notify()]);
  assert.equal(results[0].order.status,'fulfilled','Status 3 must recover a fully verified paid order');
  assert.equal(results[1].durable,true,'Encrypted delivery callback must not wait for status 4');
  assert.equal(f.db.prepare('SELECT COUNT(*) n FROM membership_grants').get().n,1);
  assert.equal(f.db.prepare('SELECT COUNT(*) n FROM membership_order_events').get().n,1);
  assert.ok(f.getRow().provider_delivered_at,'Status 3 query recovery must acknowledge delivery');
  const expiry=results[0].entitlement.expiresAt,acks=f.control.ackCalls;
  f.control.reply.status=4;
  await f.refresh();await f.notify();
  assert.equal(membershipStatus(f.db,'ielts:42').entitlement.expiresAt,expiry);
  assert.equal(f.control.ackCalls,acks);
  assert.equal(f.db.prepare('SELECT COUNT(*) n FROM membership_orders').get().n,1);
  f.db.close();
}
{
  const f=await fixture('ios');f.control.failAck=true;
  const first=await f.refresh();assert.equal(first.entitlement.active,true);
  assert.equal(f.getRow().provider_delivered_at,null);
  const expiry=first.entitlement.expiresAt;
  f.control.failAck=false;await f.refresh();
  assert.equal(f.control.ackCalls,2);assert.ok(f.getRow().provider_delivered_at);
  assert.equal(membershipStatus(f.db,'ielts:42').entitlement.expiresAt,expiry);
  f.db.close();
}
for(const status of [0,1]) {
  const f=await fixture();Object.assign(f.control.reply,{status,paid_fee:0,paid_time:0});
  assert.equal((await f.refresh()).entitlement.active,false);
  assert.equal(f.control.ackCalls,0);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM membership_grants').get().n,0);f.db.close();
}
for(const change of [{paid_fee:0},{paid_fee:2879},{order_fee:2879},{left_fee:0},{refund_fee:1},{biz_meta:'incorrect'},{order_type:7},{env_type:2},{wx_order_id:''},{paid_time:0}]) {
  const f=await fixture();Object.assign(f.control.reply,change);
  await assert.rejects(f.refresh(),error=>error.code==='membership_payment_mismatch');
  await assert.rejects(f.notify());
  assert.equal(f.db.prepare('SELECT COUNT(*) n FROM membership_grants').get().n,0);assert.equal(f.control.ackCalls,0);f.db.close();
}
{
  const f=await fixture();await f.refresh();
  const row=f.getRow();
  applyVerifiedProviderResult(f.db,{provider:'wechat_virtual',verified:true,eventId:'synthetic-refund-event',eventType:'refunded',outTradeNo:row.out_trade_no,providerOrderId:row.provider_order_id,payerAppId:row.payer_app_id,payerOpenid:row.payer_openid,productId:row.product_id,amountFen:2880,currency:'CNY',occurredAt:new Date().toISOString(),rawDigestSha256:'b'.repeat(64)});
  await f.notify();await f.refresh();
  assert.equal(f.getRow().status,'refunded');assert.equal(membershipStatus(f.db,'ielts:42').entitlement.active,false);
  assert.equal(f.db.prepare('SELECT COUNT(*) n FROM membership_grants').get().n,1);f.db.close();
}
console.log('Delivering recovery PASS: real adapter + encrypted callback + ledger, duplicate/concurrent callbacks, Android/iOS, durable ACK retry, unpaid/invalid rejection, refund replay.');
