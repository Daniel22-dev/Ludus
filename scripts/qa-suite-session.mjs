#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto, { webcrypto } from 'node:crypto';

const root=path.resolve('.');
const consumer=JSON.parse(fs.readFileSync(path.join(root,'ghrab-platform.consumer.json'),'utf8'));
const platformSource=fs.readFileSync(path.join(root,'vendor',`ghrab-platform-${consumer.platform.version}`,'ghrab-platform.js'),'utf8');
const privacyPath=path.join(root,'runtime','ludus-privacy.js');
const privacySource=fs.readFileSync(privacyPath,'utf8');
const checks=[];
const evidence={};
const add=(id,ok,detail='')=>checks.push({id,ok:Boolean(ok),detail:String(detail||'')});
const wait=(ms=15)=>new Promise(resolve=>setTimeout(resolve,ms));
const sha=text=>crypto.createHash('sha256').update(text).digest('hex');
const SUITE_KEY='ghrab.platform.suite-session-generation.v1';
const ACK_KEY='ghrab.ludus.suite-session-seen.v1';
const STATUS_KEY='ghrab.ludus.suite-session-status.v1';
const TAB_KEY='ghrab.ludus.suite-session-tab-seen.v1';
const CANARY='GARP-STUDENT-CANARY-LUDUS-SUITE-112';

function element(){return {dataset:{},style:{},classList:{contains(){return false},toggle(){return false},add(){}},children:[],attributes:[],hasAttribute(){return false},setAttribute(){},getAttribute(){return null},remove(){},replaceWith(){},replaceChildren(){},append(){},prepend(){},addEventListener(){},querySelectorAll(){return[]},querySelector(){return null},click(){}};}

function makeContext({label,appId='ludus',sharedLocal=new Map(),session=new Map(),privacy=true,privacyCode=privacySource,timeOrigin=Date.now(),failRemove=new Set(),scope='builder'}={}){
  const globalListeners=new Map();
  const docListeners=new Map();
  class Storage{
    constructor(map,name){this.map=map;this.name=name;}
    get length(){return this.map.size;}
    key(i){return [...this.map.keys()][i]??null;}
    getItem(k){k=String(k);return this.map.has(k)?this.map.get(k):null;}
    setItem(k,v){this.map.set(String(k),String(v));}
    removeItem(k){k=String(k);if(failRemove.has(`${this.name}:${k}`)||failRemove.has(k))throw new Error(`synthetic-remove-failure:${k}`);this.map.delete(k);}
    clear(){this.map.clear();}
  }
  const localStorage=new Storage(sharedLocal,'localStorage');
  const sessionStorage=new Storage(session,'sessionStorage');
  const rootEl=element(),body=element();
  const document={
    currentScript:{src:'https://example.test/app/ghrab/ghrab-platform.js',dataset:{}},documentElement:rootEl,body,readyState:'complete',visibilityState:'visible',
    getElementById(){return null;},querySelector(){return null;},querySelectorAll(){return[]},createElement(){return element();},createTextNode(text){return{textContent:text}},
    addEventListener(type,fn){if(!docListeners.has(type))docListeners.set(type,[]);docListeners.get(type).push(fn);},
    dispatchEvent(event){for(const fn of docListeners.get(event.type)||[])fn(event);return true;}
  };
  const config={schema:'ghrab-platform-app-config-v1',appId,appName:appId==='ludus'?'LUDUS':'AI Studio',appVersion:appId==='ludus'?consumer.appVersion:'0.21.40',requiredPlatformRange:consumer.platform.requiredRange,autoFooter:false,bridgeWriteLegacy:true,bridgeMaxBytes:500000,theme:{contract:'ghrab-theme-v1',...consumer.theme},storageMigration:appId==='ludus'?consumer.storageMigration:{mappings:[]}};
  const sandbox={console,Map,Set,Object,Array,String,Number,Boolean,JSON,Date,Math,Promise,URL,URLSearchParams,TextEncoder,TextDecoder,Blob,crypto:webcrypto,Storage,localStorage,sessionStorage,document,MutationObserver:class{observe(){}disconnect(){}},CustomEvent:class{constructor(type,init){this.type=type;this.detail=init?.detail}},matchMedia:()=>({matches:false,addEventListener(){},removeEventListener(){}}),navigator:{},location:new URL('https://example.test/app/index.html'),performance:{timeOrigin,mark(){},measure(){},getEntriesByName(){return[]}},setTimeout,clearTimeout,GHRAB_PLATFORM_CONFIG:config};
  sandbox.location.reload=()=>{sandbox.__reloads=(sandbox.__reloads||0)+1;};
  sandbox.addEventListener=(type,fn)=>{if(!globalListeners.has(type))globalListeners.set(type,[]);globalListeners.get(type).push(fn);};
  sandbox.dispatchEvent=(event)=>{for(const fn of globalListeners.get(event.type)||[])fn(event);return true;};
  sandbox.window=sandbox;sandbox.globalThis=sandbox;
  const ctx=vm.createContext(sandbox);
  vm.runInContext(platformSource,ctx,{filename:'ghrab-platform.js'});
  if(privacy){
    document.currentScript={src:'https://example.test/app/runtime/ludus-privacy.js',dataset:{ludusPrivacyScope:scope}};
    vm.runInContext(privacyCode,ctx,{filename:'ludus-privacy.js'});
  }
  return {label,ctx,sharedLocal,session,failRemove,dispatch(type,event={}){sandbox.dispatchEvent({type,...event});},run(code){return vm.runInContext(code,ctx);}};
}
function parseStatus(shared){try{return JSON.parse(shared.get(STATUS_KEY)||'{}');}catch{return{};}}
function seed(c,suffix='work'){
  c.run(`localStorage.setItem('ghrab.ludus.${suffix}',${JSON.stringify(CANARY)});sessionStorage.setItem('hga_v2',${JSON.stringify(CANARY)});`);
}

// 1. Open child suite end: handler -> verified cleanup -> platform ACK.
{
  const shared=new Map(),session=new Map();
  const c=makeContext({label:'open',sharedLocal:shared,session});seed(c,'open-canary');
  const end=c.run(`GHRAB_PLATFORM.session.end({reason:'qa-open-child'})`);await wait();
  const st=parseStatus(shared);
  add('suite.open.signal-created',end?.ok===true&&shared.get(SUITE_KEY)===end.generation,end?.generation);
  add('suite.open.local-cleared',!shared.has('ghrab.ludus.open-canary'));
  add('suite.open.session-cleared',!session.has('hga_v2'));
  add('suite.open.ack-after-cleanup',shared.get(ACK_KEY)===end.generation&&['cleanup-complete','acknowledged'].includes(st.stage),`${shared.get(ACK_KEY)} / ${st.stage}`);
  add('suite.open.child-status-distinguishable',st.generation===end.generation&&Boolean(st.signalSeenAt)&&Boolean(st.cleanupCompletedAt),JSON.stringify(st));
  add('suite.open.write-quarantine',c.run(`(()=>{try{localStorage.setItem('ghrab.ludus.after-end','${CANARY}');return false}catch(_){return true}})()`));
  evidence.open={generation:end.generation,status:st,reloads:c.ctx.__reloads||0};
}

// 2. Delayed-open replay and no redundant cleanup on reload.
{
  const shared=new Map();
  const coordinator=makeContext({label:'studio',appId:'ai-studio',sharedLocal:shared,privacy:false});
  const end=coordinator.run(`GHRAB_PLATFORM.session.end({reason:'qa-delayed-open'})`);
  const session=new Map();
  // App is closed during suite end; persistent content exists from the previous session.
  shared.set('ghrab.ludus.delayed-canary',CANARY);
  const child=makeContext({label:'delayed',sharedLocal:shared,session,timeOrigin:Date.now()+10});
  await wait();
  // Explicit reconcile also covers protected scripts becoming active after the pending tombstone.
  child.dispatch('focus');await wait();
  const st1=parseStatus(shared);const completedAt=st1.cleanupCompletedAt;
  add('suite.delayed.pending-replayed',shared.get(ACK_KEY)===end.generation,`${shared.get(ACK_KEY)} / ${end.generation}`);
  add('suite.delayed.cleanup',!shared.has('ghrab.ludus.delayed-canary')&&!session.has('hga_v2'));
  const reload=makeContext({label:'reload',sharedLocal:shared,session,timeOrigin:Date.now()+100});await wait();
  const st2=parseStatus(shared);
  add('suite.delayed.reload-no-repeat',st2.cleanupCompletedAt===completedAt,`${completedAt} / ${st2.cleanupCompletedAt}`);
  add('suite.delayed.tab-seen-persists',session.get(TAB_KEY)===end.generation,session.get(TAB_KEY));
  evidence.delayed={generation:end.generation,statusBeforeReload:st1,statusAfterReload:st2,reloadCleanupRuns:reload.run('LUDUSPrivacy.lifecycle.cleanupRuns')};
}

// 3. Multi-tab: app-wide ACK from A must not make B skip its own session cleanup.
{
  const shared=new Map(),sa=new Map(),sb=new Map();
  const a=makeContext({label:'A',sharedLocal:shared,session:sa,timeOrigin:Date.now()-1000});
  const b=makeContext({label:'B',sharedLocal:shared,session:sb,timeOrigin:Date.now()-1000});
  seed(a,'multi-local');a.run(`sessionStorage.setItem('jumanji_snd','${CANARY}-A')`);b.run(`sessionStorage.setItem('jumanji_snd','${CANARY}-B')`);
  const coordinator=makeContext({label:'studio-multi',appId:'ai-studio',sharedLocal:shared,privacy:false});
  const end=coordinator.run(`GHRAB_PLATFORM.session.end({reason:'qa-multitab'})`);
  a.dispatch('storage',{key:SUITE_KEY,newValue:end.generation,oldValue:null});await wait();
  const ackAfterA=shared.get(ACK_KEY);
  b.dispatch('storage',{key:SUITE_KEY,newValue:end.generation,oldValue:null});await wait();
  add('suite.multitab.a-acknowledged',ackAfterA===end.generation,ackAfterA);
  add('suite.multitab.a-session-cleared',!sa.has('jumanji_snd'));
  add('suite.multitab.b-session-cleared-despite-shared-ack',!sb.has('jumanji_snd'));
  add('suite.multitab.b-tab-seen',sb.get(TAB_KEY)===end.generation,sb.get(TAB_KEY));
  add('suite.multitab.no-resurrection',b.run(`(()=>{try{sessionStorage.setItem('jumanji_snd','${CANARY}-OLD');return false}catch(_){return true}})()`));
  evidence.multitab={generation:end.generation,ackAfterA,aTab:sa.get(TAB_KEY),bTab:sb.get(TAB_KEY)};
}

// 4. Browser Back/Forward equivalent: stale pre-end context gets no storage event, then pageshow must clean it.
{
  const shared=new Map(),staleSession=new Map();
  const stale=makeContext({label:'stale-bfcache',sharedLocal:shared,session:staleSession,timeOrigin:Date.now()-5000});
  stale.run(`sessionStorage.setItem('hga_v2','${CANARY}-BF')`);
  const coordinator=makeContext({label:'studio-bf',appId:'ai-studio',sharedLocal:shared,privacy:false});
  const end=coordinator.run(`GHRAB_PLATFORM.session.end({reason:'qa-bfcache'})`);
  const helperSession=new Map();const helper=makeContext({label:'helper',sharedLocal:shared,session:helperSession,timeOrigin:Date.now()+5});await wait();
  // Helper's replay creates app-wide ACK; stale context intentionally never got the storage event.
  add('suite.bfcache.helper-acked',shared.get(ACK_KEY)===end.generation,shared.get(ACK_KEY));
  stale.dispatch('pageshow',{persisted:true});await wait();
  add('suite.bfcache.pageshow-cleans-stale',!staleSession.has('hga_v2'));
  add('suite.bfcache.stale-tab-seen',staleSession.get(TAB_KEY)===end.generation,staleSession.get(TAB_KEY));
  evidence.bfcache={generation:end.generation,helperCleanupRuns:helper.run('LUDUSPrivacy.lifecycle.cleanupRuns')};
}

// 5. Fail-closed: synthetic deletion failure must leave platform ACK pending.
{
  const shared=new Map(),session=new Map(),failRemove=new Set();
  const c=makeContext({label:'failure',sharedLocal:shared,session,failRemove});
  shared.set('ghrab.ludus.fail-canary',CANARY);session.set('hga_v2',CANARY);failRemove.add('ghrab.ludus.fail-canary');
  const end=c.run(`GHRAB_PLATFORM.session.end({reason:'qa-fail-closed'})`);await wait();
  const st=parseStatus(shared);
  add('suite.failclosed.residual-really-present',shared.get('ghrab.ludus.fail-canary')===CANARY);
  add('suite.failclosed.no-false-ack',shared.get(ACK_KEY)!==end.generation,`${shared.get(ACK_KEY)||''} / ${end.generation}`);
  add('suite.failclosed.status-failed',st.generation===end.generation&&st.stage==='cleanup-failed',JSON.stringify(st));
  add('suite.failclosed.quarantine-active',c.run(`LUDUSPrivacy.lifecycle.quarantineGeneration===${JSON.stringify(end.generation)}`));
  evidence.failClosed={generation:end.generation,status:st,residual:shared.get('ghrab.ludus.fail-canary')};
}

// 6. Mandatory negative control: disposable privacy copy ACKs without cleanup; the same open-child assertion must fail.
{
  const anchor="suiteUnsubscribe=session.onEnd((detail)=>handleSuiteSessionEnd(detail,{reloadOnAck:true}),{replay:true});";
  if(!privacySource.includes(anchor))throw new Error('Negative-control mutation anchor not found.');
  const mutated=privacySource.replace(anchor,"suiteUnsubscribe=session.onEnd(()=>({ok:true,negativeControl:true}),{replay:true});");
  const tempDir=path.join(root,'qa-results','negative-control-disposable');fs.mkdirSync(tempDir,{recursive:true});
  const tempFile=path.join(tempDir,'ludus-privacy.js');fs.writeFileSync(tempFile,mutated);
  const shared=new Map(),session=new Map();const c=makeContext({label:'negative',sharedLocal:shared,session,privacyCode:mutated});seed(c,'negative-canary');
  const end=c.run(`GHRAB_PLATFORM.session.end({reason:'qa-negative-control'})`);await wait();
  const sameTestWouldPass=!shared.has('ghrab.ludus.negative-canary')&&!session.has('hga_v2')&&shared.get(ACK_KEY)===end.generation;
  add('suite.negative-control.same-test-fails',sameTestWouldPass===false,`sameTestWouldPass=${sameTestWouldPass}`);
  add('suite.negative-control.demonstrates-false-ack-risk',shared.has('ghrab.ludus.negative-canary')&&shared.get(ACK_KEY)===end.generation,`residual=${shared.has('ghrab.ludus.negative-canary')} ack=${shared.get(ACK_KEY)===end.generation}`);
  evidence.negativeControl={mutation:'suite onEnd handler replaced by unconditional success in disposable copy',sourceSha256:sha(privacySource),mutatedSha256:sha(mutated),sameTestWouldPass,residualCanary:shared.has('ghrab.ludus.negative-canary'),acknowledged:shared.get(ACK_KEY)===end.generation};
  fs.rmSync(tempDir,{recursive:true,force:true});
}

// F-03 local boundary assertions: LUDUS observes global tombstone, it never owns/writes it or another app ACK.
add('suite.f03.no-global-generation-write',!/rawSet\([^\n]*SUITE_GENERATION_KEY|setItem\([^\n]*ghrab\.platform\.suite-session-generation/.test(privacySource));
add('suite.f03.no-other-app-ack-write',!/(ghrab\.(?!ludus\.)[a-z0-9-]+\.suite-session-seen\.v1)/i.test(privacySource));
add('suite.platform.exact-contract',consumer.platform.version==='1.1.2'&&consumer.suiteSession?.contract==='ghrab-suite-session-v1',`${consumer.platform.version}/${consumer.suiteSession?.contract}`);

const failures=checks.filter(x=>!x.ok);
const report={schema:'ghrab-suite-session-qa-v1',appId:'ludus',appVersion:consumer.appVersion,platformVersion:consumer.platform.version,contract:'ghrab-suite-session-v1',syntheticCanary:CANARY,generatedAt:new Date().toISOString(),checks,summary:{total:checks.length,passed:checks.length-failures.length,failed:failures.length},evidence,status:failures.length?'failed':'passed',limitations:['Deterministic VM harness exercises the exact vendored Platform 1.1.2 and LUDUS privacy runtime. Real-browser coverage is reported separately by qa:browser/qa:runtime and environment-limited tests must not be promoted to PASS.','Same-origin trust cannot cryptographically prevent another compromised first-party app/XSS from writing the global tombstone or another app ACK; this remains an ecosystem trust-boundary follow-up.']};
fs.mkdirSync(path.join(root,'qa-results'),{recursive:true});
fs.writeFileSync(path.join(root,'qa-results','suite-session-1.1.2.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({schema:report.schema,appVersion:report.appVersion,platformVersion:report.platformVersion,summary:report.summary,status:report.status},null,2));
for(const f of failures)console.error(`FAIL ${f.id}: ${f.detail}`);
if(failures.length)process.exit(1);
