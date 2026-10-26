// Staged integration tests against the actual, vendored Platform runtime.
// In the standalone offline package these are skipped (the complete LUDUS repo
// is intentionally not present). In an applied local checkout they are REQUIRED.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createHash,webcrypto} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const modern=path.join(root,'vendor/ghrab-platform-1.1.3/ghrab-platform.js');
const legacy=path.join(root,'vendor/ghrab-platform-1.1.2/ghrab-platform.js');
const available=fs.existsSync(modern)&&fs.statSync(modern).size>50000;
class FakeStorage{
 constructor(){this.map=new Map()}
 get length(){return this.map.size}
 key(i){return [...this.map.keys()][i]||null}
 getItem(k){return this.map.get(String(k))??null}
 setItem(k,v){this.map.set(String(k),String(v))}
 removeItem(k){this.map.delete(String(k))}
 clear(){this.map.clear()}
}
class FakeClassList{constructor(){this.values=new Set()}
 contains(x){return this.values.has(x)}
 toggle(x,force){if(force===true)this.values.add(x);else if(force===false)this.values.delete(x);else this.values.has(x)?this.values.delete(x):this.values.add(x);return this.values.has(x)}
 add(...values){values.forEach(v=>this.values.add(v))}}
const elt=()=>({dataset:{},style:{},classList:new FakeClassList(),children:[],attributes:[],
 hasAttribute(){return false},setAttribute(){},getAttribute(){return null},
 remove(){},replaceWith(){},replaceChildren(){},append(){},prepend(){},addEventListener(){},
 querySelectorAll(){return[]},querySelector(){return null},click(){}});
function runtime(source,appId,appVersion,storage){
 const doc={currentScript:{src:`https://daniel22-dev.github.io/${appId}/ghrab/ghrab-platform.js`},
  documentElement:elt(),body:elt(),readyState:'loading',getElementById(){return null},
  addEventListener(){},dispatchEvent(){},querySelector(){return null},querySelectorAll(){return[]},
  createElement:()=>elt(),createTextNode:text=>({textContent:text})};
 const context={console,URL,URLSearchParams,TextEncoder,TextDecoder,Blob,setTimeout,clearTimeout,
  location:new URL(`https://daniel22-dev.github.io/${appId}/index.html`),document:doc,crypto:webcrypto,
  localStorage:storage,sessionStorage:new FakeStorage(),Storage:FakeStorage,
  navigator:{},MutationObserver:class{observe(){}disconnect(){}},
  CustomEvent:class{constructor(type,init){this.type=type;this.detail=init?.detail}},
  matchMedia:()=>({matches:false,addEventListener(){},removeEventListener(){}}),
  GHRAB_PLATFORM_CONFIG:{schema:'ghrab-platform-app-config-v1',appId,appName:appId,
   appVersion,requiredPlatformRange:source.includes("PLATFORM_VERSION = '1.1.3'") ? '>=1.1.3 <2.0.0' : '>=1.1.2 <2.0.0',autoFooter:false,
   bridgeWriteLegacy:false,bridgeMaxBytes:500000,theme:{supported:['dark','light'],default:'dark'},
   storageMigration:{mappings:[]}},
 };
 context.window=context;context.globalThis=context;
 vm.runInNewContext(source,context,{filename:'ghrab-platform.js',timeout:10000});
 assert.equal(context.GHRAB_PLATFORM?.version,source.includes("PLATFORM_VERSION = '1.1.3'")?'1.1.3':'1.1.2');
 return context.GHRAB_PLATFORM;
}
function material(){return{schema:'ghrab-material-v1',id:'e7-synthetic-material',title:'Fictional lesson',
 subject:'English',version:1,objectives:['Practice examples'],
 content:{sourceText:'Synthetic only',vocabulary:[],tasks:[{id:'q1',type:'select',prompt:'Select',options:['a','b'],answer:0}]},
 quality:{status:'ai-draft'},provenance:{containsPersonalData:false}}}
const checkedSource = (path,expectedSha256) => {
 const raw=fs.readFileSync(path);
 assert.equal(createHash('sha256').update(raw).digest('hex'),expectedSha256,'Vendored Platform SHA-256 mismatch');
 return raw.toString('utf8');
};
const options=()=>({target:'ai-studio',targetVersionRange:'>=0.21.6 <1.0.0',
 sourceAppId:'ludus',sourceAppVersion:'1.16.32',
 studioUrl:'https://daniel22-dev.github.io/AI-Studio-GHRAB/',
 material:material(),writeLegacy:false,ttlMs:600000});

test('actual Platform 1.1.3 permits LUDUS-to-Studio outbound with a receiver version range',
 {skip:!available&&'requires complete pinned LUDUS checkout'},()=>{
 const storage=new FakeStorage();const source=checkedSource(modern,'97972aa79fa420e10549b16a46a59d8a99fd13d066b037a2d2fd56e537b225c4');
 const ludus=runtime(source,'ludus','1.16.32',storage);
 const packet=ludus.bridge.create(options());
 assert.equal(packet.schema,'ghrab-studio-handoff-v2');
 assert.equal(packet.target,'ai-studio');
 assert.ok(storage.getItem('ghrab.platform.handoff.v2'));
 assert.equal(storage.getItem('ghrab.handoff.v1'),null);
 const studio=runtime(source,'ai-studio','0.21.256',storage);
 const received=studio.bridge.take({target:'ai-studio',maxBytes:500000});
 assert.equal(received?.material?.id,'e7-synthetic-material');
 assert.equal(received?.sourceAppId,'ludus');
 assert.equal(storage.getItem('ghrab.platform.handoff.v2'),null);
 assert.equal(studio.bridge.take({target:'ai-studio'}),null);
 const events=JSON.parse(storage.getItem('ghrab.pilot.events.v2')||'[]');
 assert.equal(events.filter(e=>e.type==='handoff-consumed'&&e.sourceAppId==='ludus').length,1);
});
test('Platform 1.1.2 reproduces original sender/receiver-version bug',
 {skip:!available&&'requires complete pinned LUDUS checkout'},()=>{
 const storage=new FakeStorage();const source=checkedSource(legacy,'199d03d9dc9263a9e74ed1f1102df0324f3b63e78704f1c70aeacec5feec530c');
 const ludus=runtime(source,'ludus','1.16.31',storage);
 assert.throws(()=>ludus.bridge.create(options()),/version-range/);
 assert.equal(storage.getItem('ghrab.platform.handoff.v2'),null);
});
test('Platform 1.1.3 refuses an altered payload with the canonical checksum',
 {skip:!available&&'requires complete pinned LUDUS checkout'},()=>{
 const storage=new FakeStorage();const source=checkedSource(modern,'97972aa79fa420e10549b16a46a59d8a99fd13d066b037a2d2fd56e537b225c4');
 runtime(source,'ludus','1.16.32',storage).bridge.create(options());
 const raw=JSON.parse(storage.getItem('ghrab.platform.handoff.v2'));
 raw.payload.value.title='Tampered after creation';
 storage.setItem('ghrab.platform.handoff.v2',JSON.stringify(raw));
 const studio=runtime(source,'ai-studio','0.21.256',storage);
 assert.equal(studio.bridge.take({target:'ai-studio'}),null);
 assert.equal(storage.getItem('ghrab.platform.handoff.v2'),null);
});


test('outbound sender forbids legacy v1 even when canonical Studio helper requests it',
 {skip:!available&&'requires complete pinned LUDUS checkout'},()=>{
 const config=fs.readFileSync(path.join(root,'scripts','apply-ghrab-platform.mjs'),'utf8');
 assert.ok(config.includes('bridgeWriteLegacy: false'));
 const storage=new FakeStorage();
 const source=checkedSource(modern,'97972aa79fa420e10549b16a46a59d8a99fd13d066b037a2d2fd56e537b225c4');
 const ludus=runtime(source,'ludus','1.16.32',storage);
 const packet=ludus.bridge.create({...options(),writeLegacy:true});
 assert.equal(packet.schema,'ghrab-studio-handoff-v2');
 assert.equal(storage.getItem('ghrab.handoff.v1'),null);
 assert.ok(storage.getItem('ghrab.platform.handoff.v2'));
 const studio=runtime(source,'ai-studio','0.21.256',storage);
 assert.equal(studio.bridge.take({target:'ai-studio'})?.material?.id,'e7-synthetic-material');
 assert.equal(storage.getItem('ghrab.platform.handoff.v2'),null);
});
