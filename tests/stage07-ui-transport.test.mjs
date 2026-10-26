import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const integrated=path.join(here,'..','src','index.html');
const file=path.join(here,'..','modules','stage07-outbound.js');
const runtime=path.join(here,'..','runtime','stage07-outbound.js');
const code=fs.existsSync(integrated) ? fs.readFileSync(runtime,'utf8') : fs.readFileSync(file,'utf8');
assert.ok(code && code.includes('mapPackToMaterial'), 'reviewed Stage07 implementation must exist');
const url='https://daniel22-dev.github.io/Ludus/';
const studio='https://daniel22-dev.github.io/AI-Studio-GHRAB/';
const validPack=()=>({schema:1,meta:{teacher:'ANONYMITY-TEACHER-SECRET',extraFixtureData:'FAKE-TEST-METADATA'},
  houses:[{name:'HIDDEN-TEAM',score:99}],stations:[
    {ex:{type:'mc4',qs:[{t:'What is correct?',opts:['A','B'],a:0,exp:'Because A'}]}},
    {ex:{type:'mc4',qs:[{t:'Which is correct?',opts:['A','B'],a:1}]}}
  ]});
const values=()=>({pack:validPack(),topic:'Fictional lesson',subject:'English',objectives:['Practice examples'],
 level:'B1',yearGroup:'2A8',confirmed:true,version:'1.16.32'});
const ID='12345678-1234-4234-8234-123456789012';
class Element{
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.id='';this.className='';
    this.type='';this.textContent='';this.style={};this.hidden=false;this.disabled=false;this.listeners=new Map();
    this.attributes=new Map();this.value='';this.checked=false;this.open=false;}
  append(...nodes){this.children.push(...nodes)}
  insertAdjacentElement(_position,node){this.children.push(node)}
  setAttribute(name,value){this.attributes.set(name,String(value))}
  removeAttribute(name){this.attributes.delete(name)}
  addEventListener(name,fn){this.listeners.set(name,fn)}
  async click(){return this.listeners.get('click')?.()}
  showModal(){this.open=true}
  close(){this.open=false}
}
function fixture({access=null,onImport=null}={}){
  const body=new Element('body');const lesson=new Element('button');lesson.id='dlLesson';body.append(lesson);
  const locate=(root,id)=>{if(root?.id===id)return root;for(const child of root?.children||[]){const x=locate(child,id);if(x)return x;}return null};
  const document={body,readyState:'complete',documentElement:{dataset:{ghrabAppVersion:'1.16.32'}},
    getElementById:id=>locate(body,id),createElement:tag=>new Element(tag),
    createTextNode:value=>({tagName:'#TEXT',textContent:value,children:[]})};
  let imported=0, received=null;
  const global={document,location:{href:url},crypto:{randomUUID:()=>ID},
    __GHRAB_DEPLOYMENT_CONFIG__:{studioBaseUrl:'/AI-Studio-GHRAB/'},
    __GHRAB_STUDIO_ACCESS__:access,
    __lastPack:null,__lastTopic:'',__lastSpec:{}};
  const context=vm.createContext({window:global,document,URL,TextEncoder,console,module:{exports:{}}});
  const script=new vm.Script(code,{filename:'stage07-outbound.js',importModuleDynamically:async request=>{
    assert.equal(new URL(request,studio).href,studio+'integration/save-to-studio.js');
    imported++;
    await onImport?.(global);
    const mod=new vm.SyntheticModule(['saveMaterialToStudio'],function(){
      this.setExport('saveMaterialToStudio',args=>{
        received=args;
        assert.equal(args.navigate,false);
        assert.equal(args.studioUrl,studio);
        assert.equal(args.sourceAppId,'ludus');
        return {ok:true,targetUrl:studio+'library/?studioHandoff=1'};
      });
    },{context});
    await mod.link(()=>{});await mod.evaluate();return mod;
  }});
  script.runInContext(context,{timeout:5000});
  return {document,global,context,api:context.module.exports,received:()=>received,imported:()=>imported};
}
const hasCode=(code)=>(e)=>e?.code===code;

test('UI is inaccessible before lesson pack exists, then displays truthful warning and preview',async()=>{
  const f=fixture();const button=f.document.getElementById('stage07Save');
  assert.ok(button);assert.equal(button.disabled,true);
  f.global.__lastPack=validPack();f.global.__lastTopic='Irregular verbs';
  f.global.__lastSpec={subject:'English',level:'B1',objectives:['Practice']};
  // Real LUDUS injectAndStore unlocks the button after setting __lastPack.
  button.disabled=false;
  await button.click();
  const dialog=f.document.getElementById('stage07Dialog');
  assert.equal(dialog.open,true);
  assert.match(f.document.getElementById('stage07Info').textContent,/Přenositelných úloh: 2/);
  assert.match(dialog.children.find(x=>String(x.textContent||'').includes('Herní engine')).textContent,/neukládají/);
  assert.ok(!dialog.children.find(x=>String(x.textContent||'').includes('Herní engine')).textContent.includes('HIDDEN-TEAM'));
  assert.equal(f.document.getElementById('stage07Topic').value,'Irregular verbs');
});
test('actual immutable school bootstrap grant shape is recognized',async()=>{
  const source=fs.readFileSync(path.join(here,'..','scripts','access-protection.mjs'),'utf8');
  assert.ok(source.includes('Object.freeze({appId:APP_ID,granted:true})'));
  const f=fixture({access:Object.freeze({appId:'ludus',granted:true})});
  const result=await f.api.sendPack(values());
  assert.equal(f.imported(),1);
  assert.equal(result.targetUrl,studio+'library/?studioHandoff=1');
});
test('invented permit flag cannot impersonate signed school activation',async()=>{
  const f=fixture({access:{appId:'ludus',permit:true}});
  await assert.rejects(f.api.sendPack(values()),hasCode('SCHOOL_ACCESS_REQUIRED'));
  assert.equal(f.imported(),0);
});
test('send refuses absent school grant without importing helper',async()=>{
  const f=fixture();await assert.rejects(f.api.sendPack(values()),hasCode('SCHOOL_ACCESS_REQUIRED'));
  assert.equal(f.imported(),0);
});
test('send refuses missing consent before any bridge import',async()=>{
  const f=fixture({access:{appId:'ludus',granted:true}});
  await assert.rejects(f.api.sendPack({...values(),confirmed:false}),hasCode('ANONYMITY_NOT_CONFIRMED'));
  assert.equal(f.imported(),0);
});
test('authorized synthetic send calls only canonical same-origin helper with whitelisted material',async()=>{
  const f=fixture({access:{appId:'ludus',granted:true}});
  const res=await f.api.sendPack(values());
  assert.equal(f.imported(),1);
  assert.equal(res.targetUrl,studio+'library/?studioHandoff=1');
  assert.equal(f.received().material.schema,'ghrab-material-v1');
  assert.equal(f.received().material.provenance.containsPersonalData,false);
  assert.equal(f.received().material.provenance.sourceAppVersion,'1.16.32');
  const wire=JSON.stringify(f.received().material);
  for(const forbidden of ['HIDDEN-TEAM','ANONYMITY-TEACHER-SECRET','FAKE-TEST-METADATA'])assert.ok(!wire.includes(forbidden));
});
test('revoke real granted flag in-place during helper import fails closed',async()=>{
  const grant={appId:'ludus',granted:true};const f=fixture({access:grant,onImport:()=>{grant.granted=false;}});
  await assert.rejects(f.api.sendPack(values()),hasCode('SCHOOL_ACCESS_REVOKED'));
  assert.equal(f.received(),null);
});
test('replace access grant while helper loads fails closed even if both were true',async()=>{
  const grant={appId:'ludus',granted:true};
  const f=fixture({access:grant,onImport:win=>{win.__GHRAB_STUDIO_ACCESS__={appId:'ludus',granted:true};}});
  await assert.rejects(f.api.sendPack(values()),hasCode('SCHOOL_ACCESS_REVOKED'));
  assert.equal(f.received(),null);
});
test('malicious sibling Studio path cannot reach transport',async()=>{
  const f=fixture({access:{appId:'ludus',granted:true}});
  f.global.__GHRAB_DEPLOYMENT_CONFIG__.studioBaseUrl='/generator-testu/';
  await assert.rejects(f.api.sendPack(values()),hasCode('STUDIO_URL_UNTRUSTED'));
  assert.equal(f.imported(),0);
});
test('transport is built for offline QA only, no independent real grant claims',()=>{
  assert.ok(code.includes("sourceAppId: 'ludus'"));
  assert.ok(!code.includes('fetch('));
  assert.ok(!code.includes('localStorage'));
});

test('dialog refuses to silently export a different game than the reviewed pack',async()=>{
 const f=fixture({access:{appId:'ludus',granted:true}});
 f.global.__lastPack=validPack();f.global.__lastTopic='First lesson';
 const button=f.document.getElementById('stage07Save');button.disabled=false;
 await button.click();
 f.global.__lastPack=validPack();f.global.__lastTopic='Second lesson';
 const dialog=f.document.getElementById('stage07Dialog');
 const send=dialog.children.find(e=>e.tagName==='DIV').children.find(e=>e.textContent==='Připravit předání');
 await send.click();
 const status=dialog.children.find(e=>e.attributes.get('role')==='status');
 assert.match(status.textContent,/CONTENT_CHANGED_REOPEN_PREVIEW/);
 assert.equal(f.imported(),0);
});

test('nonportable preview disables transmit action instead of suggesting it is ready',async()=>{
 const f=fixture({access:{appId:'ludus',granted:true}});
 f.global.__lastPack={schema:1,stations:[{ex:{type:'unsupported',qs:[{t:'No export'}]}}]};
 const button=f.document.getElementById('stage07Save');button.disabled=false;
 await button.click();
 const dialog=f.document.getElementById('stage07Dialog');
 const send=dialog.children.find(e=>e.tagName==='DIV').children.find(e=>e.textContent==='Připravit předání');
 assert.equal(send.disabled,true);
 assert.match(f.document.getElementById('stage07Info').textContent,/NO_PORTABLE_TASKS/);
 assert.equal(f.imported(),0);
});
