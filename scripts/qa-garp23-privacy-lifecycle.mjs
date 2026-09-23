#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve('.');
const privacySource=fs.readFileSync(path.join(root,'runtime/ludus-privacy.js'),'utf8');
const sharedLocal=new Map();
const checks=[];
const evidence={};
const add=(id,ok,detail='')=>checks.push({id,ok:Boolean(ok),detail:String(detail||'')});
const A='GARP-STUDENT-CANARY-LUDUS-C1-A';
const B='GARP-STUDENT-CANARY-LUDUS-C1-B';

function context(label,{scope='engine',shared=sharedLocal,session=new Map()}={}){
  class Storage{
    constructor(map){this._map=map;}
    get length(){return this._map.size;}
    key(i){return Array.from(this._map.keys())[i]??null;}
    getItem(k){k=String(k);return this._map.has(k)?this._map.get(k):null;}
    setItem(k,v){this._map.set(String(k),String(v));}
    removeItem(k){this._map.delete(String(k));}
    clear(){this._map.clear();}
  }
  const sandbox={console,Map,Set,Object,Array,String,Number,Boolean,JSON,Storage};
  sandbox.window=sandbox;
  sandbox.globalThis=sandbox;
  sandbox.localStorage=new Storage(shared);
  sandbox.sessionStorage=new Storage(session);
  sandbox.document={currentScript:{dataset:{ludusPrivacyScope:scope}}};
  sandbox.location={reload(){sandbox.__reloaded=true;}};
  sandbox.CustomEvent=class{constructor(type,init){this.type=type;this.detail=init?.detail}};
  sandbox.dispatchEvent=()=>true;
  sandbox.__label=label;
  const ctx=vm.createContext(sandbox);
  vm.runInContext(privacySource,ctx,{filename:'runtime/ludus-privacy.js'});
  return {ctx,session};
}
function run(c,code){return vm.runInContext(code,c.ctx);}

// Seed pre-1.16.23 persistent player data plus a canonical builder preference.
sharedLocal.set('hga_v2',JSON.stringify({name:A,score:7}));
sharedLocal.set('ghrab.ludus.theme','dark');
const a=context('A');
add('privacy.legacy-player-scrubbed-before-engine',!sharedLocal.has('hga_v2'));
add('privacy.builder-canonical-preference-preserved-on-engine-load',sharedLocal.get('ghrab.ludus.theme')==='dark');
add('privacy.engine-isolation-enabled',run(a,'LUDUSPrivacy.engineIsolation===true'));

// Student A writes through legacy localStorage API; it must land only in A session.
run(a,`localStorage.setItem('hga_v2',JSON.stringify({name:${JSON.stringify(A)},score:1}));localStorage.setItem('ludus_dynamic_progress',${JSON.stringify(A)});`);
evidence.a={local:[...sharedLocal.entries()],session:[...a.session.entries()]};
add('privacy.a-not-persistent',!sharedLocal.has('hga_v2')&&!sharedLocal.has('ludus_dynamic_progress'));
add('privacy.a-session-only',String(a.session.get('hga_v2')||'').includes(A)&&a.session.get('ludus_dynamic_progress')===A);

// New tab B shares localStorage but has independent sessionStorage.
const b=context('B');
add('sim03-new-session-no-a',run(b,"localStorage.getItem('hga_v2')===null && localStorage.getItem('ludus_dynamic_progress')===null"));
run(b,`localStorage.setItem('hga_v2',JSON.stringify({name:${JSON.stringify(B)},score:2}));localStorage.setItem('ludus_dynamic_progress',${JSON.stringify(B)});`);
add('sim04-concurrent-tabs-a-still-a',String(run(a,"localStorage.getItem('hga_v2')" )||'').includes(A));
add('sim04-concurrent-tabs-b-still-b',String(run(b,"localStorage.getItem('hga_v2')" )||'').includes(B));
add('sim04-shared-persistent-store-has-no-player',!sharedLocal.has('hga_v2')&&!sharedLocal.has('ludus_dynamic_progress'));

// endWork clears all owned keys in the current session and stale local namespaces, but not unrelated data.
run(a,"sessionStorage.setItem('unrelated-control','keep');localStorage.setItem('unrelated-local','keep');LUDUSPrivacy.endWork({reload:false});");
add('rt20-endwork-clears-a-exact',!a.session.has('hga_v2'));
add('rt20-endwork-clears-a-dynamic',!a.session.has('ludus_dynamic_progress'));
add('rt20-endwork-keeps-unrelated-session',a.session.get('unrelated-control')==='keep');
add('rt20-endwork-keeps-unrelated-local',sharedLocal.get('unrelated-local')==='keep');
add('rt17-endwork-a-does-not-delete-b-session',String(run(b,"localStorage.getItem('hga_v2')")||'').includes(B));

// Browser restart / later user C: fresh session cannot see A or B.
const c=context('C');
add('rt17-reopen-no-a-or-b',run(c,"localStorage.getItem('hga_v2')===null && localStorage.getItem('ludus_dynamic_progress')===null"));

// Exported engine protection: builder must inline both shared runtimes into standalone HTML.
const index=fs.readFileSync(path.join(root,'src/index.html'),'utf8');
add('sim08-export-inlines-privacy-runtime',index.includes('inlineLudusRuntimeScripts')&&index.includes("script[data-ludus-privacy-runtime],script[data-ludus-shared-runtime]")&&index.includes("data-ludus-export-inline"));
add('sim08-export-does-not-serialize-browser-storage',!index.includes('localStorage.entries')&&!index.includes('sessionStorage.entries'));

// Every engine must execute privacy before its own game scripts.
for(const file of fs.readdirSync(path.join(root,'engines')).filter(f=>f.endsWith('.html'))){
  const html=fs.readFileSync(path.join(root,'engines',file),'utf8');
  const privacyAt=html.indexOf('data-ludus-privacy-scope="engine"');
  const firstInline=html.search(/<script(?![^>]*ludus-privacy)[^>]*>/i);
  add(`engine-privacy-early:${file}`,privacyAt>=0&&(firstInline<0||privacyAt<firstInline),`${privacyAt}/${firstInline}`);
}

const failures=checks.filter(x=>!x.ok);
const report={schema:'ghrab-garp23-privacy-lifecycle-v1',appId:'ludus',appVersion:'1.16.27',mode:'deterministic-browser-storage-equivalent',syntheticCanaries:{A,B},checks,total:checks.length,passed:checks.length-failures.length,failed:failures.length,evidence,status:failures.length?'failed':'passed',limitations:['This Platform 1.1.2 wave environment cannot navigate local HTTP because Chromium has managed URLBlocklist=["*"].','Independent Claude review must repeat A/B/new-tab/restart/multi-tab/export-open in an unblocked real browser.']};
fs.mkdirSync(path.join(root,'qa-results'),{recursive:true});
fs.writeFileSync(path.join(root,'qa-results/garp23-privacy-lifecycle.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({schema:report.schema,total:report.total,passed:report.passed,failed:report.failed,status:report.status},null,2));
for(const f of failures)console.error(`FAIL ${f.id}: ${f.detail}`);
if(failures.length)process.exit(1);
