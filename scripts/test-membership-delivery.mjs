import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {createWechatVirtualProvider}=require('../server/membershipWechatVirtual.js');
const config={enabled:true,appId:'wxdeliverytest',offerId:'1234567890',productId:'membership',appKey:'synthetic-key',token:'SyntheticToken123',encodingAesKey:Buffer.alloc(32,5).toString('base64').slice(0,-1),callbackFormat:'json',getAccessToken:async()=>'synthetic-access'};
const now=new Date(),order={id:'M'+'a'.repeat(30),outTradeNo:'M'+'a'.repeat(30),userId:42,planId:'all-access-month',productId:'membership',provider:'wechat_virtual',platform:'ios',amountFen:2880,currency:'CNY',durationDays:30,autoRenew:false,status:'fulfilled',payerAppId:config.appId,payerOpenid:'fixture-payer',providerOrderId:'fixture-provider-order',createdAt:now.toISOString(),updatedAt:now.toISOString(),expiresAt:new Date(+now+600000).toISOString()};
let calls=[],response={statusCode:200,body:'{"errcode":0}'};
const provider=createWechatVirtualProvider({config,httpClient:async input=>{calls.push(input);return response;}});
assert.equal(typeof provider.notifyDelivered,'function','Query-based fulfillment must acknowledge delivery to WeChat');
await provider.notifyDelivered({order});
const request=calls.at(-1),url=new URL(request.url);
assert.equal(url.pathname,'/xpay/notify_provide_goods');
assert.deepEqual(JSON.parse(request.body),{order_id:order.outTradeNo,env:0});
assert.equal(url.searchParams.get('pay_sig'),crypto.createHmac('sha256',config.appKey).update(url.pathname+'&'+request.body).digest('hex'));
for(const status of ['created','pending','refunded','failed'])await assert.rejects(provider.notifyDelivered({order:{...order,status}}));
assert.equal(calls.length,1,'Unfulfilled local orders cannot be acknowledged');
for(const body of ['{}','{"errcode":1}','garbled']){response={statusCode:200,body};await assert.rejects(provider.notifyDelivered({order}));}
console.log('Membership delivery acknowledgement: exact official payload, signed request, local fulfilled prerequisite and failure handling PASS');
