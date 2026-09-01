(function(global){
  'use strict';

  const VERSION='1.16.18';
  const script=global.document&&global.document.currentScript;
  const SCOPE=(script&&script.dataset&&script.dataset.ludusPrivacyScope)||'builder';

  /* Historical and current client-side namespaces owned by LUDUS.  These are
     intentionally broader than the canonical ghrab.ludus.* namespace because
     older standalone engines predate the platform storage migration. */
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
  const ENGINE_EXACT=LOCAL_EXACT;
  const ENGINE_PREFIX=Object.freeze(['ludus_','ludus.','chronos_','jumanji_','relic_hunter_','hvezdni_rytiri_']);
  const SESSION_EXACT=Object.freeze([...LOCAL_EXACT,'ludusTeacherMode']);
  const SESSION_PREFIX=Object.freeze(['ghrab.ludus.',...ENGINE_PREFIX]);

  function matches(key,exact,prefixes){
    key=String(key||'');
    return exact.includes(key)||prefixes.some(prefix=>key.startsWith(prefix));
  }
  function keys(store){
    const out=[];
    try{for(let i=0;i<store.length;i++){const k=store.key(i);if(k)out.push(String(k));}}catch(_){}
    return out;
  }
  function clearStore(store,exact,prefixes){
    let removed=0;
    for(const key of keys(store)){
      if(!matches(key,exact,prefixes))continue;
      try{store.removeItem(key);removed+=1;}catch(_){}
    }
    return removed;
  }

  /* Engines are shared-device content.  Their player identity/progress must not
     survive into another tab or a later browser session.  The engine source still
     uses localStorage for backwards compatibility, so in engine scope we
     transparently redirect LUDUS-owned keys to sessionStorage before any engine
     code runs.  Old persistent copies are deleted, never imported into the new
     tab, because importing would itself expose the previous user's state. */
  function installEngineSessionIsolation(){
    if(SCOPE!=='engine'||!global.Storage||!global.localStorage||!global.sessionStorage)return false;
    const proto=global.Storage.prototype;
    if(proto.__ludusSessionIsolationInstalled)return true;
    const nativeGet=proto.getItem;
    const nativeSet=proto.setItem;
    const nativeRemove=proto.removeItem;
    const isSensitive=key=>matches(String(key||''),ENGINE_EXACT,ENGINE_PREFIX);
    const isLocal=store=>store===global.localStorage;

    /* Remove legacy persistent student/player state before the engine can read it. */
    try{
      const legacy=[];
      for(let i=0;i<global.localStorage.length;i++){
        const k=global.localStorage.key(i);
        if(k&&isSensitive(k))legacy.push(String(k));
      }
      legacy.forEach(k=>{try{nativeRemove.call(global.localStorage,k);}catch(_){}});
    }catch(_){}

    Object.defineProperty(proto,'__ludusSessionIsolationInstalled',{value:true,configurable:false,enumerable:false,writable:false});
    proto.getItem=function(key){
      if(isLocal(this)&&isSensitive(key))return nativeGet.call(global.sessionStorage,String(key));
      return nativeGet.call(this,key);
    };
    proto.setItem=function(key,value){
      if(isLocal(this)&&isSensitive(key)){
        nativeRemove.call(global.localStorage,String(key));
        return nativeSet.call(global.sessionStorage,String(key),String(value));
      }
      return nativeSet.call(this,key,value);
    };
    proto.removeItem=function(key){
      if(isLocal(this)&&isSensitive(key)){
        nativeRemove.call(global.localStorage,String(key));
        return nativeRemove.call(global.sessionStorage,String(key));
      }
      return nativeRemove.call(this,key);
    };
    return true;
  }

  const engineIsolation=installEngineSessionIsolation();

  function endWork(options={}){
    try{global.LUDUS_PROGRESS?.clearProgress?.();}catch(_){}
    const localCount=clearStore(global.localStorage,LOCAL_EXACT,LOCAL_PREFIX);
    const sessionCount=clearStore(global.sessionStorage,SESSION_EXACT,SESSION_PREFIX);
    try{global.dispatchEvent(new CustomEvent('ludus:end-work',{detail:{localCount,sessionCount,scope:SCOPE}}));}catch(_){}
    const result=Object.freeze({cleared:true,localCount,sessionCount,scope:SCOPE,engineIsolation,version:VERSION});
    if(options.reload!==false){try{global.location.reload();}catch(_) {}}
    return result;
  }

  const api=Object.freeze({
    version:VERSION,
    scope:SCOPE,
    engineIsolation,
    endWork,
    matchesLocalKey:key=>matches(String(key||''),LOCAL_EXACT,LOCAL_PREFIX),
    matchesSessionKey:key=>matches(String(key||''),SESSION_EXACT,SESSION_PREFIX),
    localExact:LOCAL_EXACT,
    localPrefixes:LOCAL_PREFIX,
    engineExact:ENGINE_EXACT,
    enginePrefixes:ENGINE_PREFIX,
    sessionExact:SESSION_EXACT,
    sessionPrefixes:SESSION_PREFIX
  });
  global.LUDUSPrivacy=api;
})(window);
