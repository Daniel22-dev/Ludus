(function(global){
  'use strict';

  const VERSION='1.16.29';
  const APP_ID='ludus';
  const SUITE_CONTRACT='ghrab-suite-session-v1';
  const SUITE_GENERATION_KEY='ghrab.platform.suite-session-generation.v1';
  const PLATFORM_ACK_KEY='ghrab.ludus.suite-session-seen.v1';
  const CHILD_STATUS_KEY='ghrab.ludus.suite-session-status.v1';
  const TAB_SEEN_KEY='ghrab.ludus.suite-session-tab-seen.v1';
  const MIGRATION_DONE_KEY='ghrab.ludus.migration.p2-storage-namespace-v1.done';
  const TAB_NONE='@none';
  const script=global.document&&global.document.currentScript;
  const SCOPE=(script&&script.dataset&&script.dataset.ludusPrivacyScope)||'builder';

  /* Storage ownership mirrors public/config/data-manifest.json.  Lifecycle
     tombstones/ACKs are deliberately excluded from content cleanup. */
  const LOCAL_EXACT=Object.freeze([
    'hga_v2','laughworks_save_v1','kostka_osudu_save_v1',
    'ludus_case_save_v1','ludus_case_snd','ludus_case_imgs_v1',
    'ludus_frostline_save','ludus_frostline_images','lotr_quest_v1',
    'ludus_escape_v1','ludus_escape_imgs'
  ]);
  const LOCAL_PREFIX=Object.freeze([
    'ghrab.ludus.','ludus_','ludus.','chronos_','jumanji_',
    'relic_hunter_','hvezdni_rytiri_'
  ]);
  const LOCAL_EXCLUDE=Object.freeze([PLATFORM_ACK_KEY,CHILD_STATUS_KEY,MIGRATION_DONE_KEY]);
  const ENGINE_EXACT=LOCAL_EXACT;
  const ENGINE_PREFIX=Object.freeze(['ludus_','ludus.','chronos_','jumanji_','relic_hunter_','hvezdni_rytiri_']);
  const SESSION_EXACT=Object.freeze([...LOCAL_EXACT,'ludusTeacherMode']);
  const SESSION_PREFIX=Object.freeze(['ghrab.ludus.',...ENGINE_PREFIX]);
  const SESSION_EXCLUDE=Object.freeze([TAB_SEEN_KEY]);

  let quarantineGeneration='';
  let cleanupRuns=0;
  let suiteAttached=false;
  let suiteUnsubscribe=null;
  let inFlight=null;
  let inFlightGeneration='';
  let engineIsolation=false;

  function matches(key,exact,prefixes,excludes=[]){
    key=String(key||'');
    if(excludes.includes(key))return false;
    return exact.includes(key)||prefixes.some(prefix=>key.startsWith(prefix));
  }
  function matchesLocal(key){return matches(key,LOCAL_EXACT,LOCAL_PREFIX,LOCAL_EXCLUDE);}
  function matchesSession(key){return matches(key,SESSION_EXACT,SESSION_PREFIX,SESSION_EXCLUDE);}
  function isEngineKey(key){return matches(String(key||''),ENGINE_EXACT,ENGINE_PREFIX);}
  function storeKind(store){
    try{if(store===global.localStorage)return 'localStorage';if(store===global.sessionStorage)return 'sessionStorage';}catch(_){}
    return '';
  }
  function isClearOwned(store,key){
    const kind=storeKind(store);
    return kind==='localStorage'?matchesLocal(key):(kind==='sessionStorage'?matchesSession(key):false);
  }
  function nowIso(){try{return new Date().toISOString();}catch(_){return '';}}
  function generationTimestamp(generation){
    const n=Number(String(generation||'').split('-')[0]);
    return Number.isFinite(n)&&n>0?n:0;
  }
  function contextStartedBefore(generation){
    const ts=generationTimestamp(generation);
    if(!ts)return false;
    try{return Number(global.performance?.timeOrigin||Date.now())<ts;}catch(_){return false;}
  }

  /* Capture the storage methods that exist when privacy boots.  In protected
     Studio builds these may already be Platform namespace aliases; that is
     intentional.  We verify every deletion afterwards, so an alias/migration
     anomaly fails closed instead of being acknowledged. */
  const proto=global.Storage&&global.Storage.prototype;
  const baseStorage=Object.freeze({
    getItem:proto&&proto.getItem,
    setItem:proto&&proto.setItem,
    removeItem:proto&&proto.removeItem,
    key:proto&&proto.key
  });
  function rawGet(store,key){
    if(!store||!baseStorage.getItem)throw new Error('storage-get-unavailable');
    return baseStorage.getItem.call(store,String(key));
  }
  function rawSet(store,key,value){
    if(!store||!baseStorage.setItem)throw new Error('storage-set-unavailable');
    baseStorage.setItem.call(store,String(key),String(value));
    return rawGet(store,key)===String(value);
  }
  function rawRemove(store,key){
    if(!store||!baseStorage.removeItem)throw new Error('storage-remove-unavailable');
    baseStorage.removeItem.call(store,String(key));
  }
  function rawKeys(store){
    if(!store||!baseStorage.key)throw new Error('storage-key-unavailable');
    const out=[];
    for(let i=0;i<store.length;i++){
      const k=baseStorage.key.call(store,i);
      if(k!==null&&k!==undefined)out.push(String(k));
    }
    return out;
  }
  function safeGet(store,key){try{return rawGet(store,key);}catch(_){return null;}}
  function safeSetVerified(store,key,value){try{return rawSet(store,key,value);}catch(_){return false;}}

  function installStoragePolicy(){
    if(!proto||!baseStorage.getItem||proto.__ludusPrivacyPolicyInstalled)return false;
    const isLocal=store=>{try{return store===global.localStorage;}catch(_){return false;}};
    Object.defineProperty(proto,'__ludusPrivacyPolicyInstalled',{value:true,configurable:false,enumerable:false,writable:false});
    proto.getItem=function(key){
      const k=String(key);
      if(quarantineGeneration&&isClearOwned(this,k))return null;
      if(SCOPE==='engine'&&isLocal(this)&&isEngineKey(k))return baseStorage.getItem.call(global.sessionStorage,k);
      return baseStorage.getItem.call(this,k);
    };
    proto.setItem=function(key,value){
      const k=String(key);
      if(quarantineGeneration&&isClearOwned(this,k))throw new Error(`LUDUS suite-session write blocked after cleanup (${quarantineGeneration}).`);
      if(SCOPE==='engine'&&isLocal(this)&&isEngineKey(k)){
        try{baseStorage.removeItem.call(global.localStorage,k);}catch(_){}
        return baseStorage.setItem.call(global.sessionStorage,k,String(value));
      }
      return baseStorage.setItem.call(this,k,String(value));
    };
    proto.removeItem=function(key){
      const k=String(key);
      if(SCOPE==='engine'&&isLocal(this)&&isEngineKey(k)){
        try{baseStorage.removeItem.call(global.localStorage,k);}catch(_){}
        return baseStorage.removeItem.call(global.sessionStorage,k);
      }
      return baseStorage.removeItem.call(this,k);
    };
    return true;
  }

  function scrubLegacyEngineLocal(){
    if(SCOPE!=='engine'||!global.localStorage)return true;
    try{
      const targets=rawKeys(global.localStorage).filter(isEngineKey);
      for(const key of targets)rawRemove(global.localStorage,key);
      return rawKeys(global.localStorage).every(key=>!isEngineKey(key));
    }catch(_){return false;}
  }

  engineIsolation=installStoragePolicy()&&SCOPE==='engine';
  const legacyEngineScrubbed=scrubLegacyEngineLocal();

  function clearStoreVerified(store,matcher,label){
    const failures=[];
    let removed=0;
    let targets=[];
    try{targets=rawKeys(store).filter(matcher);}catch(error){return {ok:false,removed,failures:[`${label}:enumerate:${error?.message||error}`]};}
    for(const key of targets){
      try{
        rawRemove(store,key);
        if(rawGet(store,key)!==null)failures.push(`${label}:${key}:still-present`);
        else removed+=1;
      }catch(error){failures.push(`${label}:${key}:${error?.message||error}`);}
    }
    try{
      for(const key of rawKeys(store))if(matcher(key))failures.push(`${label}:${key}:residual`);
    }catch(error){failures.push(`${label}:verify-enumerate:${error?.message||error}`);}
    return {ok:failures.length===0,removed,failures};
  }

  function cleanupOwnedData(){
    cleanupRuns+=1;
    try{global.LUDUS_PROGRESS?.clearProgress?.();}catch(_){}
    const local=clearStoreVerified(global.localStorage,matchesLocal,'localStorage');
    const session=clearStoreVerified(global.sessionStorage,matchesSession,'sessionStorage');
    const failures=[...local.failures,...session.failures];
    return Object.freeze({ok:failures.length===0,localCount:local.removed,sessionCount:session.removed,failures});
  }

  function statusPayload(generation,stage,extra={}){
    let previous={};
    try{previous=JSON.parse(safeGet(global.localStorage,CHILD_STATUS_KEY)||'{}')||{};}catch(_){}
    const base=previous.generation===generation?previous:{};
    return {
      schema:'ghrab-suite-session-child-ack-v1',contract:SUITE_CONTRACT,appId:APP_ID,appVersion:VERSION,
      generation:String(generation||''),stage,scope:SCOPE,updatedAt:nowIso(),...base,...extra,stage
    };
  }
  function writeStatus(generation,stage,extra={}){
    const payload=statusPayload(generation,stage,extra);
    return safeSetVerified(global.localStorage,CHILD_STATUS_KEY,JSON.stringify(payload));
  }
  function setTabSeen(generation){return safeSetVerified(global.sessionStorage,TAB_SEEN_KEY,String(generation||TAB_NONE));}
  function tabSeen(){return safeGet(global.sessionStorage,TAB_SEEN_KEY)||'';}
  function suiteGeneration(){return safeGet(global.localStorage,SUITE_GENERATION_KEY)||'';}
  function platformSeen(){
    try{return String(global.GHRAB_PLATFORM?.session?.seen?.()||safeGet(global.localStorage,PLATFORM_ACK_KEY)||'');}
    catch(_){return safeGet(global.localStorage,PLATFORM_ACK_KEY)||'';}
  }
  function enterQuarantine(generation){quarantineGeneration=String(generation||`manual-${Date.now()}`);}

  function lockFailure(detail){
    try{
      const root=global.document?.documentElement;
      if(root){root.setAttribute('data-ghrab-suite-cleanup','failed');root.setAttribute('data-ghrab-suite-generation',String(detail?.generation||''));}
    }catch(_){}
  }
  function dispatchLifecycle(type,detail){try{global.dispatchEvent(new CustomEvent(type,{detail}));}catch(_){} }

  function scheduleAckObservation(generation,reloadOnAck){
    try{global.setTimeout(()=>{
      const acknowledged=platformSeen()===String(generation);
      if(acknowledged){
        writeStatus(generation,'acknowledged',{acknowledgedAt:nowIso()});
        dispatchLifecycle('ludus:suite-session-acknowledged',{generation,scope:SCOPE});
        if(reloadOnAck!==false){try{global.location?.reload?.();}catch(_){} }
      }else{
        dispatchLifecycle('ludus:suite-session-ack-pending',{generation,scope:SCOPE});
      }
    },0);}catch(_){}
  }

  async function handleSuiteSessionEnd(detail={},options={}){
    const generation=String(detail.generation||suiteGeneration()||'');
    if(!generation)return {ok:false,reason:'missing-generation'};
    if(detail.clearApplicationData===false){
      const ok=setTabSeen(generation)&&writeStatus(generation,'cleanup-not-requested',{signalSeenAt:nowIso()});
      return {ok,reason:ok?'cleanup-not-requested':'status-write-failed',generation};
    }
    if(tabSeen()===generation){
      scheduleAckObservation(generation,options.reloadOnAck!==false);
      return {ok:true,generation,idempotent:true};
    }
    if(inFlight&&inFlightGeneration===generation)return inFlight;
    inFlightGeneration=generation;
    inFlight=(async()=>{
      const signalSeenAt=nowIso();
      if(!writeStatus(generation,'signal-seen',{signalSeenAt,reason:String(detail.reason||'suite-end'),replay:Boolean(detail.replay)})){
        enterQuarantine(generation);lockFailure(detail);
        return {ok:false,generation,reason:'signal-status-write-failed'};
      }
      enterQuarantine(generation);
      const cleanup=cleanupOwnedData();
      if(!cleanup.ok){
        writeStatus(generation,'cleanup-failed',{signalSeenAt,cleanupAttemptedAt:nowIso(),failures:cleanup.failures,localCount:cleanup.localCount,sessionCount:cleanup.sessionCount});
        lockFailure(detail);
        dispatchLifecycle('ludus:suite-session-cleanup-failed',{generation,scope:SCOPE,failures:cleanup.failures});
        return {ok:false,generation,reason:'cleanup-failed',...cleanup};
      }
      if(!setTabSeen(generation)){
        writeStatus(generation,'cleanup-failed',{signalSeenAt,cleanupAttemptedAt:nowIso(),failures:['sessionStorage:tab-seen-write-failed'],localCount:cleanup.localCount,sessionCount:cleanup.sessionCount});
        lockFailure(detail);
        return {ok:false,generation,reason:'tab-seen-write-failed',...cleanup};
      }
      const cleanupCompletedAt=nowIso();
      if(!writeStatus(generation,'cleanup-complete',{signalSeenAt,cleanupCompletedAt,localCount:cleanup.localCount,sessionCount:cleanup.sessionCount,failures:[]})){
        lockFailure(detail);
        return {ok:false,generation,reason:'cleanup-status-write-failed',...cleanup};
      }
      dispatchLifecycle('ludus:suite-session-cleanup-complete',{generation,scope:SCOPE,localCount:cleanup.localCount,sessionCount:cleanup.sessionCount});
      scheduleAckObservation(generation,options.reloadOnAck!==false);
      return {ok:true,generation,...cleanup};
    })();
    try{return await inFlight;}finally{if(inFlightGeneration===generation){inFlight=null;inFlightGeneration='';}}
  }

  function endWork(options={}){
    const generation=String(options.generation||suiteGeneration()||`manual-${Date.now()}`);
    enterQuarantine(generation);
    const cleanup=cleanupOwnedData();
    const localCount=cleanup.localCount,sessionCount=cleanup.sessionCount;
    dispatchLifecycle('ludus:end-work',{generation,localCount,sessionCount,scope:SCOPE,ok:cleanup.ok,failures:cleanup.failures});
    const result=Object.freeze({cleared:cleanup.ok,ok:cleanup.ok,generation,localCount,sessionCount,failures:cleanup.failures,scope:SCOPE,engineIsolation,version:VERSION});
    if(cleanup.ok&&options.reload!==false){try{global.location.reload();}catch(_) {}}
    if(!cleanup.ok)lockFailure({generation});
    return result;
  }

  function attachPlatform(){
    const session=global.GHRAB_PLATFORM?.session;
    if(suiteAttached||session?.contract!==SUITE_CONTRACT||typeof session.onEnd!=='function')return false;
    suiteAttached=true;
    suiteUnsubscribe=session.onEnd((detail)=>handleSuiteSessionEnd(detail,{reloadOnAck:true}),{replay:true});
    return true;
  }

  function reconcileSuiteSession(reason){
    const generation=suiteGeneration();
    const seen=platformSeen();
    const tab=tabSeen();
    if(!generation){if(!tab)setTabSeen(TAB_NONE);return;}
    if(!tab){
      /* New context after a completed suite end has no stale session state.  A
         context whose navigation predates the tombstone is treated as stale. */
      if(seen===generation&&!contextStartedBefore(generation)){setTabSeen(generation);return;}
    }
    if(tab===generation)return;
    if(seen!==generation||tab||contextStartedBefore(generation)){
      void handleSuiteSessionEnd({schema:SUITE_CONTRACT,generation,reason,replay:true,clearApplicationData:true},{reloadOnAck:true});
    }else setTabSeen(generation);
  }

  function installLifecycleListeners(){
    try{global.document?.addEventListener?.('ghrab:platform-ready',()=>{attachPlatform();reconcileSuiteSession('platform-ready');});}catch(_){}
    try{global.addEventListener?.('storage',(event)=>{
      if(event?.key===SUITE_GENERATION_KEY&&event.newValue&&String(event.newValue)!==tabSeen()){
        void handleSuiteSessionEnd({schema:SUITE_CONTRACT,generation:String(event.newValue),reason:'child-storage-reconcile',clearApplicationData:true},{reloadOnAck:true});
      }
    });}catch(_){}
    try{global.addEventListener?.('pageshow',()=>reconcileSuiteSession('pageshow'));}catch(_){}
    try{global.addEventListener?.('focus',()=>reconcileSuiteSession('focus'));}catch(_){}
    try{global.document?.addEventListener?.('visibilitychange',()=>{if(global.document.visibilityState==='visible')reconcileSuiteSession('visibilitychange');});}catch(_){}
  }

  installLifecycleListeners();
  attachPlatform();
  reconcileSuiteSession('startup');

  const api=Object.freeze({
    version:VERSION,scope:SCOPE,engineIsolation,legacyEngineScrubbed,
    endWork,handleSuiteSessionEnd,cleanupOwnedData,
    matchesLocalKey:key=>matchesLocal(String(key||'')),
    matchesSessionKey:key=>matchesSession(String(key||'')),
    localExact:LOCAL_EXACT,localPrefixes:LOCAL_PREFIX,localExcludes:LOCAL_EXCLUDE,
    engineExact:ENGINE_EXACT,enginePrefixes:ENGINE_PREFIX,
    sessionExact:SESSION_EXACT,sessionPrefixes:SESSION_PREFIX,sessionExcludes:SESSION_EXCLUDE,
    lifecycle:Object.freeze({contract:SUITE_CONTRACT,generationKey:SUITE_GENERATION_KEY,platformAckKey:PLATFORM_ACK_KEY,childStatusKey:CHILD_STATUS_KEY,tabSeenKey:TAB_SEEN_KEY,get quarantineGeneration(){return quarantineGeneration;},get cleanupRuns(){return cleanupRuns;},get attached(){return suiteAttached;}})
  });
  global.LUDUSPrivacy=api;
})(window);
