import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Worker} from 'node:worker_threads';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{DatabaseSync}=require('node:sqlite');
const {installMembershipSchema,createMembershipCheckout}=require('../server/membership');
const {readTestbuyerCanaryConfig,reserveTestbuyerCanary}=require('../server/membershipTestbuyerCanary');
const now=Date.now(),startsAt=new Date(now-60000).toISOString(),expiresAt=new Date(now+3600000).toISOString();
const env={MEMBERSHIP_TESTBUYER_CANARY_ENABLED:'1',MEMBERSHIP_TESTBUYER_CANARY_MODE:'single-real-payment',MEMBERSHIP_TESTBUYER_CANARY_ID:'race-android',MEMBERSHIP_TESTBUYER_CANARY_USER_ID:'ielts:42',MEMBERSHIP_TESTBUYER_CANARY_STARTS_AT:startsAt,MEMBERSHIP_TESTBUYER_CANARY_EXPIRES_AT:expiresAt,MEMBERSHIP_TESTBUYER_IOS_CANARY_ENABLED:'1',MEMBERSHIP_TESTBUYER_IOS_CANARY_MODE:'single-real-payment',MEMBERSHIP_TESTBUYER_IOS_CANARY_ID:'race-ios',MEMBERSHIP_TESTBUYER_IOS_CANARY_STARTS_AT:startsAt,MEMBERSHIP_TESTBUYER_IOS_CANARY_EXPIRES_AT:expiresAt};
function setup(db){db.exec('PRAGMA foreign_keys=ON;PRAGMA busy_timeout=5000;CREATE TABLE users(id INTEGER PRIMARY KEY);INSERT INTO users VALUES(42);CREATE TABLE memberships(user_id INTEGER PRIMARY KEY,plan TEXT,starts_at TEXT,expires_at TEXT,updated_at TEXT);');installMembershipSchema(db)}
for(const status of ['created','failed','pending']){
 const db=new DatabaseSync(':memory:');setup(db);
 db.exec('DROP INDEX idx_membership_orders_user_platform_created;ALTER TABLE membership_orders DROP COLUMN platform;');
 const insert=db.prepare(`INSERT INTO membership_orders(id,user_id,plan_id,product_id,provider,idempotency_key,out_trade_no,amount_fen,currency,duration_days,auto_renew,status,payer_app_id,payer_openid,created_at,updated_at,expires_at) VALUES(?,42,'all-access-month','membership','wechat_virtual',?,?,2880,'CNY',30,0,?,'wx-fixture','openid-fixture',?,?,?)`);
 const id='M'+'a'.repeat(30),unknown='M'+'b'.repeat(30);
 insert.run(id,'crash-before-bind',id,status,startsAt,startsAt,expiresAt);insert.run(unknown,'unrelated-legacy-key',unknown,status,startsAt,startsAt,expiresAt);
 db.prepare('INSERT INTO membership_testbuyer_canary(slot,canary_id,user_id,idempotency_key,order_id,starts_at,expires_at,reserved_at) VALUES(1,?,42,?,NULL,?,?,?)').run('race-android','crash-before-bind',startsAt,expiresAt,startsAt);
 const before=db.prepare('SELECT * FROM membership_testbuyer_canary').get();installMembershipSchema(db);
 assert.equal(db.prepare('SELECT platform FROM membership_orders WHERE id=?').get(id).platform,'android',`Legacy ${status} order reserved before binding must recover`);
 assert.equal(db.prepare('SELECT platform FROM membership_orders WHERE id=?').get(unknown).platform,null);
 assert.deepEqual(db.prepare('SELECT * FROM membership_testbuyer_canary').get(),before);
 const result=await createMembershipCheckout({db,userId:'ielts:42',payload:{planId:'all-access-month',idempotencyKey:'crash-before-bind',platform:'android'},env:{MEMBERSHIP_CHECKOUT_ENABLED:'1',MEMBERSHIP_COMMERCE_READY:'1'},providerRegistry:{wechat_virtual:{id:'wechat_virtual',productId:'membership',platforms:['android'],readiness:()=>({ready:true}),createCheckout:async()=>({parameters:{}})}},resolveWechatIdentity:async()=>({userId:42,appId:'wx-fixture',openid:'openid-fixture'})});
 assert.equal(result.order.id,id);db.close();
}
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'membership-platform-race-'));
try{
 const expiryDb=new DatabaseSync(':memory:');setup(expiryDb);let ticks=0;
 assert.throws(()=>reserveTestbuyerCanary(expiryDb,readTestbuyerCanaryConfig(env,now,'ios'),{userId:'ielts:42',idempotencyKey:'expiry-during-lock',platform:'ios',now:()=>++ticks===1?now:Date.parse(expiresAt)}),error=>error.code==='membership_canary_expired','A clock advancing across lock acquisition must not consume a slot');
 assert.equal(expiryDb.prepare('SELECT COUNT(*) AS n FROM membership_testbuyer_platform_canary').get().n,0);expiryDb.close();
 for(const distinct of [false,true]){
  const databasePath=path.join(temp,distinct?'distinct.sqlite':'same.sqlite'),db=new DatabaseSync(databasePath);setup(db);db.close();
  const barrier=new SharedArrayBuffer(8),view=new Int32Array(barrier),workers=['android','ios'].map(platform=>new Worker(`
   const {parentPort,workerData:d}=require('node:worker_threads'),{DatabaseSync}=require('node:sqlite'),{reserveTestbuyerCanary}=require(d.module);
   const db=new DatabaseSync(d.databasePath),v=new Int32Array(d.barrier);db.exec('PRAGMA foreign_keys=ON;PRAGMA busy_timeout=5000');Atomics.add(v,0,1);Atomics.notify(v,0);Atomics.wait(v,1,0);
   try{const result=reserveTestbuyerCanary(db,d.config,{userId:'ielts:42',platform:d.platform,idempotencyKey:d.key,now:d.now});parentPort.postMessage({ok:true,platform:d.platform,key:result.idempotencyKey})}catch(e){parentPort.postMessage({ok:false,platform:d.platform,code:e.code})}finally{db.close()}
  `,{eval:true,workerData:{module:require.resolve('../server/membershipTestbuyerCanary'),databasePath,barrier,platform,config:readTestbuyerCanaryConfig(env,now,platform),key:distinct?'cross-platform-key-'+platform:'cross-platform-same-key',now}}));
  const outcomes=workers.map(worker=>new Promise((resolve,reject)=>{worker.once('message',resolve);worker.once('error',reject)}));
  const deadline=Date.now()+5000;while(Atomics.load(view,0)<2&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,10));
  try{assert.equal(Atomics.load(view,0),2);Atomics.store(view,1,1);Atomics.notify(view,1,2);const results=await Promise.all(outcomes);
   assert.equal(results.filter(result=>result.ok).length,distinct?2:1,'Cross-platform same-key reservation must have one winner only');
   if(!distinct)assert.equal(results.find(result=>!result.ok).code,'membership_checkout_conflict');
   const verify=new DatabaseSync(databasePath);assert.equal(verify.prepare('SELECT (SELECT COUNT(*) FROM membership_testbuyer_canary)+(SELECT COUNT(*) FROM membership_testbuyer_platform_canary) AS n').get().n,distinct?2:1,'Rejected platform cannot leave a stranded durable slot');verify.close();
  }finally{Atomics.store(view,1,1);Atomics.notify(view,1,2);await Promise.all(workers.map(worker=>worker.terminate()))}
 }
}finally{const resolved=path.resolve(temp);if(path.dirname(resolved)!==path.resolve(os.tmpdir())||!path.basename(resolved).startsWith('membership-platform-race-'))throw Error('Refuse unexpected cleanup target');fs.rmSync(resolved,{recursive:true,force:true})}
console.log('Membership platform migration/crash recovery and two-connection same/different-key races PASS');
