#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const dist = path.join(root, 'dist');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const expectedGuard = `// GHRAB – ochrana proti vložení aplikace do cizího rámu (GARP 2.8, kontrola S-BRW-12).
// GitHub Pages neumí poslat hlavičku frame-ancestors a meta CSP ji ignoruje; proto skript.
// Vložit jako PRVNÍ klasický skript v <head>, hned za CSP.
// Rám ze stejného původu (AI Studio) je povolen; cizí původ i sandbox bez allow-same-origin ne.
(function () {
  'use strict';
  if (window.top === window.self) return;
  var sameOrigin = false;
  try { sameOrigin = window.top.location.origin === window.location.origin; } catch (e) { sameOrigin = false; }
  if (sameOrigin) return;
  document.documentElement.setAttribute('data-ghrab-framed', 'blocked');
  document.documentElement.style.setProperty('display', 'none', 'important');
  if (typeof window.stop === 'function') window.stop();
  throw new Error('GHRAB_FRAMED_BY_FOREIGN_ORIGIN');
})();
`;
const fail = (message) => { console.error(`FAIL: ${message}`); process.exit(1); };
if (!fs.existsSync(dist)) fail('dist/ chybí; spusť nejdřív build.');
const sourceGuard = fs.readFileSync(path.join(root, 'public', 'frame-guard.js'), 'utf8');
if (sourceGuard !== expectedGuard) fail('public/frame-guard.js neodpovídá přesnému GARP 2.8 zadání.');
if (fs.readFileSync(path.join(dist, 'frame-guard.js'), 'utf8') !== expectedGuard) fail('dist/frame-guard.js se liší od zdroje.');
function exerciseGuard(topMode) {
  const attrs = new Map();
  const style = new Map();
  const self = {};
  let top;
  if (topMode === 'top') top = self;
  else if (topMode === 'same') top = { location: { origin: 'https://school.example' } };
  else top = Object.create(null, { location: { get() { throw new Error('opaque-or-cross-origin'); } } });
  const window = { top, self, location: { origin: 'https://school.example' }, stopped: false, stop() { this.stopped = true; } };
  const document = { documentElement: {
    setAttribute(name, value) { attrs.set(name, value); },
    style: { setProperty(name, value, priority) { style.set(name, `${value}:${priority}`); } },
  } };
  let thrown = null;
  try { vm.runInNewContext(sourceGuard, { window, document, Error }); } catch (error) { thrown = error; }
  return { attrs, style, window, thrown };
}
const topLevel = exerciseGuard('top');
if (topLevel.thrown || topLevel.attrs.size) fail('frame guard nesmí blokovat top-level spuštění.');
const sameOrigin = exerciseGuard('same');
if (sameOrigin.thrown || sameOrigin.attrs.size) fail('frame guard nesmí blokovat same-origin rám AI Studia.');
for (const mode of ['foreign', 'opaque']) {
  const blocked = exerciseGuard(mode);
  if (blocked.attrs.get('data-ghrab-framed') !== 'blocked' || blocked.style.get('display') !== 'none:important' || !blocked.window.stopped || blocked.thrown?.message !== 'GHRAB_FRAMED_BY_FOREIGN_ORIGIN') {
    fail(`frame guard neblokuje režim ${mode} podle kontraktu.`);
  }
}
function htmlFiles(dir) {
  const out=[];
  for (const entry of fs.readdirSync(dir,{withFileTypes:true})) {
    const target=path.join(dir,entry.name);
    if (entry.isDirectory()) out.push(...htmlFiles(target));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) out.push(target);
  }
  return out.sort();
}
const files=htmlFiles(dist);
if (files.length !== 13) fail(`očekáváno 13 HTML stránek v dist/, nalezeno ${files.length}`);
for (const file of files) {
  const rel=path.relative(dist,file).replaceAll(path.sep,'/');
  const html=fs.readFileSync(file,'utf8');
  const head=html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1];
  if (!head) fail(`${rel}: chybí <head>.`);
  const csp=head.match(/<meta\b[^>]*http-equiv=["']Content-Security-Policy["'][^>]*data-ghrab-csp-profile=["']static["'][^>]*>/i);
  if (!csp || csp.index === undefined) fail(`${rel}: chybí statická CSP meta.`);
  const scripts=[...head.matchAll(/<script\b[^>]*>/gi)];
  if (!scripts.length) fail(`${rel}: v <head> chybí skript.`);
  const first=scripts[0];
  const expectedSrc=rel==='index.html' ? `./frame-guard.js?v=${pkg.version}` : `../frame-guard.js?v=${pkg.version}`;
  if (!new RegExp(`\\bsrc=["']${expectedSrc.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}["']`,'i').test(first[0])) fail(`${rel}: frame guard není první skript nebo má chybnou cestu/verzi: ${first[0]}`);
  if (/\b(?:type|defer|async)\b/i.test(first[0])) fail(`${rel}: frame guard musí být klasický synchronní skript.`);
  const cspEnd=csp.index+csp[0].length;
  if (first.index < cspEnd || head.slice(cspEnd,first.index).trim() !== '') fail(`${rel}: frame guard není bezprostředně za CSP meta.`);
}
const sw=fs.readFileSync(path.join(root,'public','sw.js'),'utf8');
if (!sw.includes('"./frame-guard.js"')) fail('service worker nepředukládá frame-guard.js.');
const builder=fs.readFileSync(path.join(root,'src','index.html'),'utf8');
if (!builder.includes('script[src*="frame-guard.js"]')) fail('studentský export neodstraňuje deployment frame guard; sandbox náhled by se zablokoval.');
console.log(`PASS: frame guard GARP 2.8 — ${files.length}/13 HTML, top/same-origin/foreign/opaque behavior, CSP pořadí, SW precache a export compatibility.`);
