#!/usr/bin/env node
/** Offline tests of the actual catalog, diagnostics and build click handler.
 * AI generation, downloads and the DOM button are test doubles. No network.
 * Optional first argument: a second source tree for baseline reproduction.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(process.argv[2] || '.');
const html = fs.readFileSync(path.join(root, 'src/index.html'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'engines/manifest.json'), 'utf8'));
const checks = [];
const check = (id, ok, detail = '') => checks.push({ id, ok: Boolean(ok), detail });
function section(start, end) {
  const a = html.indexOf(start), b = html.indexOf(end, a + start.length);
  if (a < 0 || b < 0 || html.indexOf(start, a + start.length) >= 0) {
    throw new Error(`Source boundary not unique or absent: ${start}`);
  }
  return html.slice(a, b);
}
const button = { dataset: {}, innerHTML: 'Build', onclick: null };
const events = [];
let generated = 0, downloaded = 0;
const context = vm.createContext({
  window: { __lastGame: '' },
  $: selector => selector === '#build' ? button : null,
  toast: text => events.push(['toast', text]),
  recordLudusTelemetry: (...args) => events.push(['telemetry', ...args]),
  beep: () => {},
  gErr: error => String(error.message || error),
  downloadGame: () => { downloaded += 1; },
  generateAndAssemble: async () => {
    generated += 1;
    return vm.runInContext(`({world:'Fixture',count:1,hasEngine:engineCanBuild(selectedEngine()),previewOnly:!!selectedEngine()&&!engineCanBuild(selectedEngine())})`, context);
  },
  // Only the checked-in catalog can be fetched; unexpected IO fails the test.
  fetch: async url => {
    if (url !== 'engines/manifest.json') throw new Error(`Unexpected test IO: ${url}`);
    return { ok: true, json: async () => structuredClone(manifest) };
  },
  ALL_EX_TYPES: ['mc4', 'mc2', 'wordbank', 'yesno', 'classify'],
  C: { game: 'game', gen: 'general' },
  add: (category, name, fn) => check(`diagnostic.${name}`, fn()),
});
function run(code) { return vm.runInContext(code, context, { timeout: 2000 }); }
run(section("const ENGINE_BASE='engines/';", '/* ============================ GEMINI'));
run(section('const FRAMES = {', 'const TOPICS = ['));
run("const state={frame:'lab',skin:'forensic',topic:{id:'fixture',cz:'Fixture'},branded:false,exportTarget:'internal'};");
run(section('function precheck(){', 'function packMeta('));
run(section("$('#build').onclick=async()=>{", "$('#example').onclick=async()=>{"));
await run('applyEngineManifest()');
const diagnostics = html.split('\n').filter(line =>
  line.includes("add(C.game,'GAME_ENGINES: flowModel, capabilities a smlouva hotov") ||
  line.includes("add(C.gen,'Mechanika bez enginu nevy"));
check('diagnostics.source-lines', diagnostics.length === 2);
for (const line of diagnostics) run(line);
for (const entry of manifest.engines) {
  const key = entry.gameKey || `${entry.skinId}:${entry.mechanicId}`;
  const engine = run(`getGameEngine(${JSON.stringify(entry.skinId)},${JSON.stringify(entry.mechanicId)})`);
  check(`catalog.${key}`, engine && engine.gameId === entry.gameId && engine.flowModel === entry.flowModel);
  check(`flow-label.${entry.flowModel}`, run(`typeof FLOW_MODELS[${JSON.stringify(entry.flowModel)}]==='string'`));
  check(`contract.${key}`, run(`READY_CONTRACT.every(k=>k in GAME_ENGINES[${JSON.stringify(key)}].contract)`));
}
check('catalog.no-cross-mechanic-substitution', run("getGameEngine('arcanum','quest')===null"));
check('lab.connected-engine-retained', run("!!getGameEngine('laughworks','lab')"));
check('lab.engine-less-pair-retained', run("getGameEngine('forensic','lab')===null&&SKINS.find(s=>s.id==='forensic').frames.includes('lab')"));
check('fallback.precheck-accepts-content', run('!!precheckContent()&&precheckContent().eng===null'));
check('fallback.playable-precheck-refuses', run('precheck()===null'));
await button.onclick();
check('fallback.handler-generated-content', generated === 1 && events.some(e => e[0] === 'telemetry' && e[1] === 'content-pack' && e[2] === 'success'));
check('fallback.handler-never-downloaded-game', downloaded === 0);
check('fallback.handler-restores-button', button.innerHTML === 'Build' && button.dataset.busy === '');
run("state.skin='tombraider';state.frame='quest';");
check('planned.precheck-accepts-content', run('!!precheckContent()&&!engineCanBuild(precheckContent().eng)'));
check('planned.playable-precheck-refuses', run('precheck()===null'));
await button.onclick();
check('planned.handler-content-only', generated === 2 && downloaded === 0);
run("state.skin='arcanum';state.frame='academy';window.__lastGame='<html>fixture</html>'; ");
await button.onclick();
check('ready.handler-still-downloads-game', generated === 3 && downloaded === 1 && events.some(e => e[0] === 'telemetry' && e[1] === 'game' && e[2] === 'success'));
run('state.topic=null');
await button.onclick();
check('incomplete.handler-refuses-generation', generated === 3 && downloaded === 1);
const failed = checks.filter(row => !row.ok);
const result = {
  schema: 'ludus-engine-catalog-regression-v1',
  source: root,
  node: process.version,
  scope: 'Offline Node VM tests; real catalog, diagnostic predicates, prechecks and click handler; AI and DOM are test doubles. Not browser or LIVE certification.',
  total: checks.length, passed: checks.length - failed.length, failed: failed.length, checks,
};
fs.mkdirSync('qa-results', { recursive: true });
fs.writeFileSync('qa-results/engine-catalog.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ total: result.total, passed: result.passed, failed: result.failed, failures: failed }, null, 2));
if (failed.length) process.exitCode = 1;
