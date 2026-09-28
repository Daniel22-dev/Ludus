#!/usr/bin/env node
/** Local-only browser regression for About. Production access controls are not changed. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { stripStudioProtection } from './access-protection.mjs';

const root=process.cwd(),dist=path.join(root,'dist'),out=path.join(root,'qa-results','about');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
if(!fs.existsSync(path.join(dist,'index.html')))throw new Error('Run npm run build first.');
fs.mkdirSync(out,{recursive:true});
const checks=[],screenshots=[];
function check(id,ok,detail=''){checks.push({id,ok:Boolean(ok),detail});if(!ok)console.error('FAIL',id,detail);}
const prelude=`<script>window.__GHRAB_QA_RUNTIME__=true;window.__ABOUT_ERRORS__=[];addEventListener('error',e=>__ABOUT_ERRORS__.push(String(e.error?.stack||e.message)));addEventListener('unhandledrejection',e=>__ABOUT_ERRORS__.push(String(e.reason?.stack||e.reason)));localStorage.setItem('ludus_intro_done','true');localStorage.setItem('ghrab.ludus.intro_done','true');window.alert=()=>{};window.confirm=()=>true;<\/script>`;
const executable=[process.env.CHROMIUM_PATH,process.env.CHROME_PATH,'/usr/bin/chromium','/usr/bin/google-chrome'].find(p=>p&&fs.existsSync(p));
if(!executable)throw new Error('Chromium is required. Set CHROMIUM_PATH.');
const server=http.createServer((req,res)=>{
  try{
    const url=new URL(req.url,'http://127.0.0.1');let rel=decodeURIComponent(url.pathname).replace(/^\/+/, '');
    if(!rel||rel.endsWith('/'))rel+='index.html';
    const file=path.resolve(dist,rel);
    if(!file.startsWith(dist+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end('not found');return;}
    const ext=path.extname(file),mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml'}[ext]||'application/octet-stream';
    res.writeHead(200,{'Content-Type':mime+'; charset=utf-8','Cache-Control':'no-store','Access-Control-Allow-Origin':'*'});
    // Only the localhost test response is transformed. dist remains byte-identical.
    res.end(ext==='.html'?stripStudioProtection(fs.readFileSync(file,'utf8')).replace(/<head\b[^>]*>/i,m=>m+prelude):fs.readFileSync(file));
  }catch(error){res.writeHead(500);res.end(String(error));}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`;
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'ludus-about-'));
const chrome=spawn(executable,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--disable-background-networking','--no-first-run','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore'});
class CDP{
  constructor(url){this.ws=new WebSocket(url);this.id=0;this.pending=new Map();this.ready=new Promise((resolve,reject)=>{this.ws.onopen=resolve;this.ws.onerror=reject;});this.ws.onmessage=e=>{const m=JSON.parse(e.data);const p=this.pending.get(m.id);if(p){clearTimeout(p.timer);this.pending.delete(m.id);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result);}};}
  async call(method,params={}){await this.ready;return new Promise((resolve,reject)=>{const id=++this.id;const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error(`CDP timeout: ${method}`));},15000);this.pending.set(id,{resolve,reject,timer});this.ws.send(JSON.stringify({id,method,params}));});}
  async eval(expression){const r=await this.call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result?.value;}
  close(){this.ws.close();}
}
let client;
async function until(expression,timeout=10000){const start=Date.now();while(Date.now()-start<timeout){if(await client.eval(expression))return;await sleep(40);}throw new Error(`Timeout: ${expression}`);}
async function click(id){await client.eval(`(()=>{const e=document.getElementById(${JSON.stringify(id)});e.scrollIntoView({block:'center'});e.focus();e.click();})()`);}
async function key(key,shift=false){const code=key==='Tab'?9:27;await client.call('Input.dispatchKeyEvent',{type:'keyDown',key,code:key,windowsVirtualKeyCode:code,nativeVirtualKeyCode:code,modifiers:shift?8:0});await client.call('Input.dispatchKeyEvent',{type:'keyUp',key,code:key,windowsVirtualKeyCode:code,nativeVirtualKeyCode:code,modifiers:shift?8:0});await sleep(40);}
try{
  const portFile=path.join(profile,'DevToolsActivePort');for(let i=0;i<200&&!fs.existsSync(portFile);i++)await sleep(40);
  if(!fs.existsSync(portFile))throw new Error('Chromium did not start.');
  const port=fs.readFileSync(portFile,'utf8').split('\n')[0];let target;
  for(let i=0;i<120&&!target;i++){const targets=await(await fetch(`http://127.0.0.1:${port}/json`)).json();target=targets.find(x=>x.type==='page'&&x.webSocketDebuggerUrl);if(!target)await sleep(40);}
  if(!target)throw new Error('Chromium has no page target.');
  client=new CDP(target.webSocketDebuggerUrl);
  await client.call('Page.enable');await client.call('Runtime.enable');await client.call('Network.enable');
  await client.call('Network.setBlockedURLs',{urls:['https://*']});
  await client.call('Emulation.setDeviceMetricsOverride',{width:1366,height:768,deviceScaleFactor:1,mobile:false});
  const navigation=await client.call('Page.navigate',{url:base+'/'});
  if(navigation.errorText)throw new Error('Local navigation failed: '+navigation.errorText);
  await until("typeof openAbout==='function'&&typeof state==='object'&&document.querySelector('#stage .card')");await client.eval('applyEngineManifest()');await sleep(100);
  const initial=await client.eval(`({legacy:!!document.getElementById('openChangelog')||!!document.getElementById('showOwner'),entry:!!document.getElementById('openAbout')&&!!document.getElementById('openAboutTop'),lazy:performance.getEntriesByType('resource').some(x=>/ludus-about\.(js|css)/.test(x.name)),history:CHANGELOG.length+CHANGELOG_ARCHIVE.length,metadata:APP_ABOUT,version:APP_VERSION,tests:selfTests().map(x=>({name:x.name,pass:x.pass})),state:JSON.stringify(state)})`);
  check('navigation.unified',initial.entry&&!initial.legacy);
  check('performance.lazy-about',!initial.lazy);
  check('history.all-original-entries-preserved',initial.history===11);
  check('identity.release',initial.version===pkg.version&&initial.metadata.releaseDate===pkg.releaseDate);
  check('identity.platform',initial.metadata.platformVersion===JSON.parse(fs.readFileSync('ghrab-platform.consumer.json','utf8')).platform.version);
  check('identity.ai-core',initial.metadata.aiCoreVersion===JSON.parse(fs.readFileSync('ghrab-ai-core.consumer.json','utf8')).coreVersion);
  check('identity.garp',initial.metadata.garpVersion==='2.7'&&initial.metadata.shieldLive==='NOT TESTED');
  const historical=JSON.parse(fs.readFileSync('qa/behavior-baseline.json','utf8')).phases.A.selfTests;
  check('builder.self-tests-all-pass',initial.tests.length===historical.length&&initial.tests.every(x=>x.pass),{currentFailures:initial.tests.filter(x=>!x.pass)});
  for(const [width,height] of [[1366,768],[1024,768],[390,844],[320,740]]){
    for(const theme of ['dark','light']){
      const prefix=`${width}.${theme}`;
      await client.call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
      await client.eval(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);
      await click('openAboutTop');await until("document.querySelector('#infoModal.open .modal-about')&&document.querySelector('#aboutVersion')");
      const view=await client.eval(`(()=>{const d=document.querySelector('#infoModal .modal'),r=d.getBoundingClientRect();return{title:document.getElementById('modalTitle').textContent,version:document.getElementById('aboutVersion').textContent,closed:!document.getElementById('aboutHistory').open,inside:r.left>=-1&&r.right<=innerWidth+1&&r.top>=-1&&r.bottom<=innerHeight+1,reflow:d.scrollWidth<=d.clientWidth+1&&document.documentElement.scrollWidth<=innerWidth+1,inert:document.querySelector('.wrap').inert,focus:document.activeElement.id,text:document.getElementById('modalBody').innerText};})()`);
      check(prefix+'.content',view.title==='O aplikaci'&&view.version===pkg.version&&view.text.includes('Daniel Bal\u00e1\u017e')&&view.text.includes('Gymn\u00e1zium, Ostrava-Hrab\u016fvka'));
      check(prefix+'.viewport',view.inside&&view.reflow,view);
      check(prefix+'.collapsed-history',view.closed);
      check(prefix+'.initial-focus',view.inert&&view.focus==='modalClose');
      check(prefix+'.excluded-sections',!/(Podpora|Licence|Pr\u00e1ce s daty)/.test(view.text));
      const image=await client.call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});const name=`about-${width}-${theme}.png`;fs.writeFileSync(path.join(out,name),Buffer.from(image.data,'base64'));screenshots.push(name);
      await client.eval("document.getElementById('modalClose').focus()");await key('Tab',true);
      check(prefix+'.shift-tab-wrap',await client.eval("document.activeElement===document.querySelector('#aboutHistory>summary')"));
      await key('Tab');check(prefix+'.tab-wrap',await client.eval("document.activeElement.id==='modalClose'"));

      await client.eval("document.querySelector('#aboutHistory>summary').click();document.querySelector('#aboutOlderChanges>summary').click()");
      check(prefix+'.history-expand',await client.eval("document.getElementById('aboutHistory').open&&document.getElementById('aboutOlderChanges').open&&document.querySelector('#aboutOlderChanges').innerText.includes('1.14.6')"));
      await key('Escape');
      check(prefix+'.escape-and-return-focus',await client.eval("!document.querySelector('#infoModal.open')&&!document.querySelector('.wrap').inert&&document.activeElement.id==='openAboutTop'"));
      check(prefix+'.builder-state-preserved',(await client.eval('JSON.stringify(state)'))===initial.state);
    }
  }
  await click('openAbout');await until("document.querySelector('#infoModal.open .modal-about')");
  check('footer.entry',await client.eval("document.querySelector('.modal-about').scrollTop===0&&!document.getElementById('aboutHistory').open"));
  await client.call('Input.dispatchMouseEvent',{type:'mousePressed',x:2,y:2,button:'left',clickCount:1});await client.call('Input.dispatchMouseEvent',{type:'mouseReleased',x:2,y:2,button:'left',clickCount:1});
  check('dialog.backdrop-close',await client.eval("!document.querySelector('#infoModal.open')&&document.activeElement.id==='openAbout'"));
  await click('openGuide');
  check('guide.original-dialog',await client.eval("document.querySelector('#infoModal').classList.contains('open')&&!document.querySelector('#infoModal .modal').classList.contains('modal-about')"));await key('Escape');
  await click('runTests');await click('runDiag');await until("document.querySelector('#diagResults .test-summary')");
  check('diagnostics.no-new-failures',await client.eval("!document.getElementById('runDiag').disabled&&document.querySelectorAll('#diagResults .modal-row.fail').length==="+initial.tests.filter(x=>!x.pass).length));await key('Escape');
  check('browser.no-script-errors',await client.eval('__ABOUT_ERRORS__.length===0'),await client.eval('__ABOUT_ERRORS__'));
  const source=fs.readFileSync(path.join(dist,'index.html'),'utf8'),sw=fs.readFileSync(path.join(dist,'sw.js'),'utf8');
  check('production.access-gate-preserved',source.includes('data-ghrab-access="checking"')&&source.includes('data-ghrab-access-bootstrap'));
  check('pwa.about-precache',sw.includes('./runtime/ludus-about.js')&&sw.includes('./runtime/ludus-about.css')&&sw.includes('ghrab-ludus-v'+pkg.version));
  // Keep the original protected app build immutable; this test only serves local copies.
}catch(error){check('harness.completed',false,String(error.stack||error));}
finally{
  client?.close();chrome.kill('SIGTERM');server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
  await sleep(150);fs.rmSync(profile,{recursive:true,force:true});
  const failed=checks.filter(x=>!x.ok);
  const report={schema:'ludus-about-regression-v1',version:pkg.version,scope:'Local HTTP Chromium UI fixture; production access control tested separately. No live AI, school-server, GitHub deployment or live-access certification.',node:process.version,chromium:executable,total:checks.length,passed:checks.length-failed.length,failed:failed.length,screenshots,checks};
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({version:pkg.version,total:report.total,passed:report.passed,failed:report.failed,screenshots:screenshots.length},null,2));
  if(failed.length)process.exitCode=1;
}
