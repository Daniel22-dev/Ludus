import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

// This is a strict compiled-output gate. Do not turn missing build into SKIP.
const root=path.resolve('.');
const htmlPath=path.join(root,'dist','index.html');
const jsPath=path.join(root,'dist','runtime','stage07-outbound.js');
const sourcePath=path.join(root,'runtime','stage07-outbound.js');
const buildExists=()=>fs.existsSync(htmlPath)&&fs.existsSync(jsPath);
const read=path=>fs.readFileSync(path,'utf8');
const cfg=()=>{
 const html=read(htmlPath);
 const m=html.match(/<script id="ghrab-platform-config" type="application\/json">([\s\S]*?)<\/script>/);
 assert.ok(m,'Built Studio Platform config was not emitted');
 return JSON.parse(m[1]);
};
const consumer=JSON.parse(read(path.join(root,'ghrab-platform.consumer.json')));

// This validates the actual signed-access configuration, not the synthetic
// grant used by the isolated outbound UI tests.
test('full built builder and external Stage07 sender module are present',()=>{
 assert.ok(buildExists(),'Compile LUDUS before certifying Stage07: missing dist runtime');
 assert.equal(read(jsPath),read(sourcePath),'Built sender differs from audited source');
});
test('teacher export UI is lazy and does not add E7 mapper to entry HTML',()=>{
 const html=read(htmlPath);
 const lazyImport = ['import', '(', "'./runtime/stage07-outbound.js?v=1.16.32'", ')'].join('');
 assert.ok(html.includes(lazyImport));
 assert.ok(!html.includes('function mapPackToMaterial'));
 assert.ok(html.includes('data-ghrab-app-version="1.16.32"'));
});
test('published runtime uses exact signed LUDUS grant and forbids legacy output',()=>{
 const html=read(htmlPath);
 assert.ok(html.includes('Object.freeze({appId:APP_ID,granted:true})'));
 const c=cfg();
 assert.equal(c.appId,'ludus');
 assert.equal(c.appVersion,'1.16.32');
 assert.equal(c.bridgeWriteLegacy,false,'LUDUS outbound must emit Bridge v2 only');
 assert.equal(c.requiredPlatformRange,'>=1.1.3 <2.0.0');
 assert.ok(read(jsPath).includes("access?.appId !== 'ludus' || access.granted !== true"));
});
test('the exported UI imports only exact allowlisted Studio modules',()=>{
 const js=read(jsPath);
 assert.ok(js.includes("import('/AI-Studio-GHRAB/integration/save-to-studio.js')"));
 assert.ok(js.includes("import('/ai-studio/integration/save-to-studio.js')"));
 assert.ok(!js.includes('import(new URL('));
 assert.ok(!js.includes('/generator-testu/') && !js.includes('/diferenciator/'));
});
test('perf and delivery limits are real output checks, not waived by build',()=>{
 const htmlBytes=fs.statSync(htmlPath).size;
 const jsBytes=fs.statSync(jsPath).size;
 assert.ok(htmlBytes<=consumer.quality.performanceBudget.entryHtmlBytes);
 assert.ok(jsBytes>15000&&jsBytes<40000,'Check dynamic outbound module size');
 assert.ok(htmlBytes+jsBytes<380000,'Export should not inflate initial builder load');
});
test('current authoring path must not contain teacher or pupil runtime data',()=>{
 const source=read(jsPath);
 const forbiddenPersistence = ['localStorage','.setItem'].join('');
 for(const marker of ['window.__lastWorld','sessionStorage',forbiddenPersistence,'fetch('])
  assert.ok(!source.includes(marker),'Unexpected runtime persistence or native content: '+marker);
 assert.ok(source.includes('provenance: { sourceAppId:'));
 assert.equal(createHash('sha256').update(fs.readFileSync(jsPath)).digest('hex'),
   createHash('sha256').update(fs.readFileSync(sourcePath)).digest('hex'));
});
