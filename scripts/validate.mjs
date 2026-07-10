import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve('.');
const VERSION = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
const errors = [];
const need = (ok, msg) => { if (!ok) errors.push(msg); };
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

const manifest = JSON.parse(read('engines/manifest.json'));
need(manifest.schemaVersion, 'manifest: chybí schemaVersion');
need(Array.isArray(manifest.engines), 'manifest: engines není pole');

const ids = new Set(), gameKeys = new Set(), existingFiles = new Set();
for (const e of manifest.engines || []) {
  need(e && typeof e === 'object', 'manifest: neplatný záznam');
  need(e.id && !ids.has(e.id), `manifest: duplicitní nebo chybějící id ${e.id || '?'}`); if (e.id) ids.add(e.id);
  need(e.gameKey && !gameKeys.has(e.gameKey), `manifest: duplicitní nebo chybějící gameKey ${e.gameKey || e.id || '?'}`); if (e.gameKey) gameKeys.add(e.gameKey);
  need(e.title && e.title.cs && e.title.en, `manifest: ${e.id || '?'} nemá titul cs/en`);
  need(Array.isArray(e.uiLanguages) && e.uiLanguages.includes('cs') && e.uiLanguages.includes('en'), `manifest: ${e.id || '?'} musí podporovat UI cs/en`);
  need(typeof e.builderCompatible === 'boolean', `manifest: ${e.id || '?'} musí mít boolean builderCompatible`);
  need(typeof e.builderCompatibilityNote === 'string' && e.builderCompatibilityNote.trim(), `manifest: ${e.id || '?'} musí popsat builderCompatibilityNote`);
  if (e.status === 'ready') need(e.builderCompatible === true, `manifest: hotový engine ${e.id} musí být builderCompatible`);
  if (e.file) { need(!existingFiles.has(e.file), `manifest: duplicitní soubor ${e.file}`); existingFiles.add(e.file); }
  if (e.status === 'planned') need(!e.file && !e.url, `manifest: plánovaný engine ${e.id} nesmí ukazovat na hotový soubor`);
}
need(ids.has('lara-croft-quest-planned'), 'manifest: chybí plánovaná Lara Croft');

const requiredExisting = [
  'id', 'gameKey', 'skinId', 'gameId', 'mechanicId', 'title', 'file', 'url', 'status',
  'flowModel', 'engineKind', 'supportedExerciseTypes', 'uiLanguages', 'contentLanguages',
  'supportLanguages', 'brandModes', 'builderCompatible', 'builderCompatibilityNote', 'capabilities', 'contract', 'progressApi'
];
const contractKeys = ['manifest', 'supportedExerciseTypes', 'i18n', 'themeVariants', 'adapter', 'contentV2', 'flowModel', 'capabilities', 'progressApi'];
const progressMethods = ['saveProgress', 'loadProgress', 'resumeProgress', 'clearProgress', 'getProgressSummary', 'hasProgress'];
const htmlFiles = [];

for (const e of manifest.engines) {
  if (e.file) {
    for (const k of requiredExisting) need(Object.prototype.hasOwnProperty.call(e, k), `manifest: ${e.id || e.file} chybí ${k}`);
    need(fs.existsSync(path.join(ROOT, 'engines', e.file)), `manifest: soubor neexistuje ${e.file}`);
    need(e.url === 'engines/' + e.file, `manifest: url neodpovídá souboru u ${e.id}`);
    need(e.progressApi && e.progressApi.version === 'ludus-progress-api-v1', `manifest: progressApi verze u ${e.id}`);
    for (const m of progressMethods) need(e.progressApi && Array.isArray(e.progressApi.methods) && e.progressApi.methods.includes(m), `manifest: ${e.id} progressApi chybí metoda ${m}`);
    for (const k of contractKeys) need(e.contract && Object.prototype.hasOwnProperty.call(e.contract, k), `manifest: ${e.id} contract chybí ${k}`);
    htmlFiles.push(e.file);
  }
}

need(read('README.md').includes(`Verze: **${VERSION}**`), 'README.md: nesedí verze');
need(read('README_PWA.md').includes(`ludus-pwa-v${VERSION}`), 'README_PWA.md: nesedí cache verze');
need(read('public/sw.js').includes(`ludus-pwa-v${VERSION}`), 'public/sw.js: nesedí cache verze');

const uniqueHtml = [...new Set(htmlFiles)];
for (const file of uniqueHtml) {
  const rel = 'engines/' + file;
  const txt = read(rel);
  need(txt.includes('LUDUS STANDARD BLOCK START'), `${rel}: chybí standardní LUDUS blok`);
  need(txt.includes('LUDUS STANDARD BLOCK START v1.14.0'), `${rel}: standardní blok nemá verzi 1.14.0`);
  need(txt.includes('ludusLangSwitch') && txt.includes('window.LUDUS_I18N'), `${rel}: chybí jednotný přepínač CZ/EN`);
  need(txt.includes('id="ludusBadge"') || txt.includes("id='ludusBadge'") || txt.includes('id=\"ludusBadge\"'), `${rel}: chybí #ludusBadge`);
  need(/teacher=1/.test(txt), `${rel}: chybí ?teacher=1`);
  need(/collectReport|downloadReport/.test(txt), `${rel}: chybí report export`);
  need(!/AIza[0-9A-Za-z_\-]{20,}/.test(txt), `${rel}: podezření na hardcoded Gemini API key`);
  need(!/(if|while|switch)\s*\([^)]*Daniel\s+Bal[aá]ž[^)]*\)/i.test(txt), `${rel}: podezření na starou aktivaci učitele jménem`);

  const scripts = [...txt.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)];
  scripts.forEach((m, i) => {
    const attrs = m[1] || '';
    if (/type\s*=\s*["'](?:application\/json|importmap|text\/plain)/i.test(attrs)) return;
    const js = m[2].replace(/<\\\//g, '</');
    try { new vm.Script(js, { filename: `${rel}#script${i + 1}` }); }
    catch (e) { errors.push(`${rel}: JS syntax script ${i + 1}: ${e.message}`); }
  });
}

const src = read('src/index.html');
need(src.includes('const TEMPLATE_LIBRARY'), 'src/index.html: chybí TEMPLATE_LIBRARY');
need(src.includes('templateSelect'), 'src/index.html: chybí UI pro knihovnu šablon');
need(src.includes('applyTemplate'), 'src/index.html: chybí applyTemplate');
need(src.includes(`const APP_VERSION='${VERSION}'`), `src/index.html: APP_VERSION není ${VERSION}`);
need(src.includes('function engineCanBuild'), 'src/index.html: chybí oddělení stavu enginu od kompatibility exportu');
need(src.includes('builderCompatible'), 'src/index.html: builderCompatible se nepoužívá');
need(!/AIza[0-9A-Za-z_\-]{20,}/.test(src), 'src/index.html: podezření na hardcoded Gemini API key');
const srcScripts = [...src.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)];
srcScripts.forEach((m, i) => {
  const attrs = m[1] || '';
  if (/type\s*=\s*["'](?:application\/json|importmap|text\/plain)/i.test(attrs)) return;
  const js = m[2].replace(/<\\\//g, '</');
  try { new vm.Script(js, { filename: `src/index.html#script${i + 1}` }); }
  catch (e) { errors.push(`src/index.html: JS syntax script ${i + 1}: ${e.message}`); }
});

if (errors.length) {
  console.error('❌ LUDUS validation failed');
  for (const e of errors) console.error(' - ' + e);
  process.exit(1);
}
console.log('✅ LUDUS validation OK');
console.log(`   manifest records: ${manifest.engines.length}`);
console.log(`   html engines checked: ${uniqueHtml.length}`);
console.log(`   version: ${VERSION}`);
