#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve('.');
const manifestPath=path.join(root,'public','config','data-manifest.json');
const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
const privacy=fs.readFileSync(path.join(root,'runtime','ludus-privacy.js'),'utf8');
const builder=fs.readFileSync(path.join(root,'src','index.html'),'utf8');
const engineRuntime=fs.readFileSync(path.join(root,'runtime','ludus-engine-runtime.js'),'utf8');
const checks=[];
const add=(id,ok,detail='')=>checks.push({id,ok:Boolean(ok),detail:String(detail||'')});
const stores=manifest.stores||[];
const by=(kind,category)=>stores.find(s=>s.kind===kind&&s.category===category);
const local=by('localStorage','application-data');
const session=by('sessionStorage','session-data');
const localCredential=by('localStorage','credential');
const sessionCredential=by('sessionStorage','credential');
const localLifecycle=by('localStorage','security-lifecycle-control');
const sessionLifecycle=by('sessionStorage','security-lifecycle-control');
const cache=stores.find(s=>s.kind==='cacheStorage');
const manual=by('localStorage','nonpersonal-settings');
const match=(key,patterns=[])=>patterns.some(p=>p.endsWith('*')?key.startsWith(p.slice(0,-1)):key===p);
const covered=(store,key)=>Boolean(store&&match(key,store.patterns||[])&&!match(key,store.excludePatterns||[]));

const expectedEngineKeys=[
  'hga_v2','laughworks_save_v1','ludus.laughworks.img.poster','kostka_osudu_save_v1','lotr_quest_v1',
  'ludus_case_save_v1','ludus_case_snd','ludus_case_imgs_v1','ludus_frostline_save','ludus_frostline_images',
  'ludus_escape_v1','ludus_escape_imgs','chronos_demo','chronos_demo_img_cover','jumanji_arena_save_v1','jumanji_snd','jumanji_img_board',
  'relic_hunter_save_v1','relic_hunter_mute_v1','relic_hunter_skin_v1','relic_hunter_img_v1_map',
  'hvezdni_rytiri_save_v1','hvezdni_rytiri_mute_v1','hvezdni_rytiri_skin_v1','hvezdni_rytiri_img_v1_map'
];
const expectedBuilderLocal=['ludus_gemini_model','ludus_langs','ludus_sound','ludus_theme','ludus_intro_done','ludus_ui_lang'];
const expectedSession=['ludusTeacherMode',...expectedEngineKeys];
for(const key of [...expectedBuilderLocal,...expectedEngineKeys])add(`pc01.manifest.local.${key}`,covered(local,key),JSON.stringify(local?.patterns||[]));
for(const key of expectedSession)add(`pc01.manifest.session.${key}`,covered(session,key),JSON.stringify(session?.patterns||[]));
for(const key of ['ludus_gemini_key','ghrab.ludus.gemini_key'])add(`pc01.credentials.local.${key}`,covered(localCredential,key));
for(const key of ['ludus_gemini_key_session','ghrab.ludus.gemini_key_session'])add(`pc01.credentials.session.${key}`,covered(sessionCredential,key));
add('pc01.cache.noncontent-not-cleared',cache?.clearOnEndWork===false,JSON.stringify(cache||{}));
add('pc01.manual.nonpersonal-not-cleared',manual?.clearOnEndWork===false&&match('ghrab-manual-progress-ludus-1.16.24',manual.patterns||[])&&match('ghrab-manual-theme',manual.patterns||[]),JSON.stringify(manual||{}));
add('pc01.lifecycle.local-not-cleared',localLifecycle?.clearOnEndWork===false&&['ghrab.ludus.suite-session-seen.v1','ghrab.ludus.suite-session-status.v1','ghrab.ludus.migration.p2-storage-namespace-v1.done'].every(k=>match(k,localLifecycle.patterns||[])));
add('pc01.lifecycle.session-not-cleared',sessionLifecycle?.clearOnEndWork===false&&match('ghrab.ludus.suite-session-tab-seen.v1',sessionLifecycle?.patterns||[]));
add('pc01.suite.generation-read-only',manifest.sessionLifecycle?.ownership?.generationKey==='platform-global-read-only-for-ludus');
add('pc01.suite.platform-ack-owner',manifest.sessionLifecycle?.ownership?.platformAcknowledgementKey==='platform');
add('pc01.shared.handoff-v2-not-owned',(manifest.sharedStateNotOwnedByLudus||[]).some(x=>x.key==='ghrab.platform.handoff.v2'));
add('pc01.shared.handoff-v1-not-owned',(manifest.sharedStateNotOwnedByLudus||[]).some(x=>x.key==='ghrab.handoff.v1'));
add('pc01.shared.pilot-events-not-owned',(manifest.sharedStateNotOwnedByLudus||[]).some(x=>x.key==='ghrab.pilot.events.v2'));
add('pc01.runtime.verified-delete',privacy.includes('function clearStoreVerified(')&&privacy.includes('still-present')&&privacy.includes(':residual'));
add('pc01.runtime.fail-closed-handler',privacy.includes("return {ok:false,generation,reason:'cleanup-failed'")||privacy.includes("reason:'cleanup-failed'"));
add('pc01.runtime.no-manual-platform-ack',!privacy.includes('.session.acknowledge(')&&!privacy.includes('session.acknowledge('));
add('pc01.runtime.no-global-generation-write',!/rawSet\([^\n]*SUITE_GENERATION_KEY|setItem\([^\n]*ghrab\.platform\.suite-session-generation/.test(privacy));
add('pc01.runtime.builder-credential-writer',builder.includes('sessionStorage.setItem(G_KEY_SESSION_SK')&&builder.includes('localStorage.removeItem(G_KEY_SK)'));
add('pc01.runtime.builder-settings-writers',['G_MODEL_SK','G_LANG_SK','SOUND_SK','THEME_SK','INTRO_SK'].every(k=>builder.includes(k)));
add('pc01.runtime.engine-teacher-session',engineRuntime.includes("sessionStorage.setItem('ludusTeacherMode'"));
add('pc01.runtime.no-indexeddb-writer',!/(?:indexedDB|IDBDatabase|IDBObjectStore)\s*\./.test([privacy,builder,engineRuntime,...fs.readdirSync(path.join(root,'engines')).filter(f=>f.endsWith('.html')).map(f=>fs.readFileSync(path.join(root,'engines',f),'utf8'))].join('\n')),'No application IndexedDB writer found in builder/runtime/engines.');
add('pc01.runtime.cache-content-writer-absent',!/(?:caches\.open|CacheStorage)/.test([privacy,builder,engineRuntime].join('\n')),'Application runtime does not write user content to Cache Storage; service worker cache is static/app cache.');
add('pc01.runtime.export-not-storage-dump',!builder.includes('localStorage.entries')&&!builder.includes('sessionStorage.entries'));
add('pc01.runtime.prompt-debug-not-persisted',!/(?:localStorage|sessionStorage)\.setItem\([^\n]*(?:prompt|debug)/i.test(builder),'No AI prompt/debug storage writer found.');

const engines=fs.readdirSync(path.join(root,'engines')).filter(f=>f.endsWith('.html')).sort();
for(const file of engines){
  const html=fs.readFileSync(path.join(root,'engines',file),'utf8');
  add(`pc01.engine.privacy-runtime.${file}`,html.includes('data-ludus-privacy-scope="engine"'));
}
add('pc01.engine.count',engines.length===11,String(engines.length));

const inventory={
  localStorageOwnedClearOnEndWork:[...new Set([...(local?.patterns||[]),...(localCredential?.patterns||[])])],
  localStorageOwnedExcludedFromCleanup:[...(local?.excludePatterns||[]),...(localLifecycle?.patterns||[]),...(manual?.patterns||[])],
  sessionStorageOwnedClearOnEndWork:[...new Set([...(session?.patterns||[]),...(sessionCredential?.patterns||[])])],
  sessionStorageOwnedExcludedFromCleanup:[...(session?.excludePatterns||[]),...(sessionLifecycle?.patterns||[])],
  sharedStateNotOwnedByLudus:manifest.sharedStateNotOwnedByLudus||[],
  indexedDB:'no application writer found',
  cacheStorage:'service-worker/static application cache only; clearOnEndWork=false',
  aiPromptDebug:'no persistence writer found',
  exportImport:'explicit user action; export does not serialize browser storage',
  suiteSession:manifest.sessionLifecycle
};
const failed=checks.filter(c=>!c.ok);
const report={schema:'ghrab-pc01-suite-session-audit-v1',appId:manifest.appId,appVersion:manifest.appVersion,platformVersion:'1.1.2',generatedAt:new Date().toISOString(),sourceScope:['src/index.html','runtime/ludus-privacy.js','runtime/ludus-engine-runtime.js','engines/*.html','public/config/data-manifest.json'],inventory,checks,summary:{total:checks.length,passed:checks.length-failed.length,failed:failed.length},status:failed.length?'failed':'passed'};
fs.mkdirSync(path.join(root,'qa-results'),{recursive:true});
fs.writeFileSync(path.join(root,'qa-results','pc01-suite-session.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({schema:report.schema,appVersion:report.appVersion,summary:report.summary,status:report.status},null,2));
for(const f of failed)console.error(`FAIL ${f.id}: ${f.detail}`);
if(failed.length)process.exit(1);
