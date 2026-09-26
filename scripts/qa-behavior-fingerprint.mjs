#!/usr/bin/env node
/*
 * LUDUS – otisk chování (charakterizační testy)
 * =============================================
 * Zaznamená, jak se sestavená aplikace (dist/) skutečně chová v prohlížeči, a při
 * další verzi ověří, že se chování nezměnilo. Netestuje text zdrojového kódu.
 *
 * Co se zaznamenává:
 *   A  dílna        – výsledky vestavěných selfTests(), registr enginů, obrazovka po startu
 *   B  exporty      – samostatné HTML hry pro každý exportovatelný engine a variantu
 *                     (safe / official), třídní kvíz a lesson pack
 *   C  hry z exportu – úvodní obrazovka a každá obrazovka dosažitelná z učitelského
 *                     panelu (každé tlačítko se klikne na čerstvě načtené stránce)
 *   D  nasazené hry  – chráněné enginy v dist/engines za přístupovou bránou: start
 *                     a učitelský režim (s --deep-deployed i všechny obrazovky)
 *   U každé hry navíc gesto trojího klepnutí na odznak LUDUS (zapnutí učitelského režimu).
 *   U každé stránky navíc: chyby JavaScriptu, neúspěšné požadavky, klíče v localStorage.
 *
 * Determinismus: Math.random je nahrazen semínkovým generátorem, Date má pevný čas,
 * snímky DOM se normalizují (bez inline stylů, bez obsahu <script>/<style>/<canvas>).
 *
 * Použití:
 *   node scripts/qa-behavior-fingerprint.mjs --record qa/behavior-baseline.json
 *   node scripts/qa-behavior-fingerprint.mjs --check  qa/behavior-baseline.json
 *   (npm run qa:behavior po npm run build – otisk nezávisí na čase sestavení;
 *    rychlá kontrola jedné hry: … --check qa/behavior-baseline.json --phases D --only matrix)
 *   node scripts/qa-behavior-fingerprint.mjs --stability      (2× záznam, musí být shodné)
 *   node scripts/qa-behavior-fingerprint.mjs --merge <výstup> <část1> <část2> …
 *   node scripts/qa-behavior-fingerprint.mjs --compare <očekávaný.json> <skutečný.json>   (bez prohlížeče)
 *   volitelně: --dist <adresář>  --phases A,B,C,D  --only <část názvu hry>[,…]
 *              --full <adresář pro plné snímky>
 *   Běh po částech (--phases/--only) + --merge umožní rozdělit dlouhý záznam.
 *
 * Prohlížeč: CHROME_PATH / CHROMIUM_PATH, jinak systémové Chromium.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';

const SCHEMA = 'ludus-behavior-fingerprint-v1';
const FIXED_TIME = '2026-01-15T09:00:00.000Z';
const SETTLE_MS = Number(process.env.LUDUS_FP_SETTLE_MS || 500);

// ---------------------------------------------------------------- argumenty
const args = process.argv.slice(2);
const opt = (name, fallback = '') => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};
const has = (name) => args.includes(name);
const MODE = has('--record') ? 'record' : has('--check') ? 'check' : has('--stability') ? 'stability' : has('--merge') ? 'merge' : has('--compare') ? 'compare' : '';
if (!MODE) {
  console.error('Použití: --record <soubor> | --check <soubor> | --stability | --merge <výstup> <části…> | --compare <očekávaný> <skutečný>');
  process.exit(2);
}
if (MODE === 'merge') {
  // Sloučení částečných otisků (stejné schéma); pozdější část nesmí přepsat existující záznam.
  const out = opt('--merge');
  const parts = args.slice(args.indexOf('--merge') + 2).filter((a) => !a.startsWith('--'));
  const merged = { schema: 'ludus-behavior-fingerprint-v1', recordedAt: '', dist: '', phases: {}, durationSec: 0, parts: [] };
  for (const file of parts) {
    const part = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (part.schema !== merged.schema) throw new Error(`${file}: neznámé schéma`);
    merged.recordedAt ||= part.recordedAt; merged.dist ||= part.dist; merged.durationSec += part.durationSec || 0;
    merged.parts.push(path.basename(file));
    for (const [ph, value] of Object.entries(part.phases)) {
      if (ph === 'A' || ph === 'B') {
        if (merged.phases[ph]) throw new Error(`${file}: fáze ${ph} už je obsažena`);
        merged.phases[ph] = value; continue;
      }
      merged.phases[ph] ||= {};
      for (const [k, v] of Object.entries(value)) {
        if (merged.phases[ph][k]) throw new Error(`${file}: ${ph} ${k} už je obsaženo`);
        merged.phases[ph][k] = v;
      }
    }
  }
  fs.writeFileSync(out, `${JSON.stringify(merged, null, 1)}\n`);
  console.log(JSON.stringify({ status: 'merged', file: out, parts: merged.parts.length }, null, 2));
  process.exit(0);
}
const BASELINE_FILE = opt('--record') || opt('--check');
const DIST = path.resolve(opt('--dist', 'dist'));
const COMPARE_FILES = MODE === 'compare' ? args.slice(args.indexOf('--compare') + 1, args.indexOf('--compare') + 3) : [];
const PHASES = new Set(opt('--phases', 'A,B,C,D').split(',').map((s) => s.trim().toUpperCase()));
const FULL_DIR = opt('--full');
const ONLY = opt('--only').split(',').map((x) => x.trim()).filter(Boolean);
const selected = (name) => !ONLY.length || ONLY.some((part) => name.includes(part));
if (MODE !== 'compare' && !fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error(`Chybí ${DIST}/index.html – nejprve spusťte npm run build.`);
  process.exit(2);
}

const sha = (value) => createHash('sha256').update(value).digest('hex');

function findChromium() {
  for (const candidate of [
    process.env.CHROME_PATH,
    process.env.CHROMIUM_PATH,
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
  ].filter(Boolean)) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error('Chromium není dostupné (nastavte CHROME_PATH).');
}

// ---------------------------------------------------------------- lokální server
// Servíruje dist/ pod /Ludus/, exporty pod /export/ a zástupnou bránu AI Studia,
// která přístup povolí (brána sama není předmětem tohoto testu).
const exportsInMemory = new Map();
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.webm': 'video/webm',
};
function startServer() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (/\/access\/app-guard\.js$/.test(url.pathname)) {
      res.writeHead(200, { 'content-type': 'text/javascript' });
      res.end("export async function protectApp(){document.documentElement.dataset.ghrabAccess='granted';return true;}");
      return;
    }
    if (url.pathname.startsWith('/export/')) {
      const body = exportsInMemory.get(decodeURIComponent(url.pathname.slice('/export/'.length)));
      if (!body) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(body);
      return;
    }
    let rel = decodeURIComponent(url.pathname.replace(/^\/Ludus\//, ''));
    if (!rel || rel.endsWith('/')) rel += 'index.html';
    const file = path.resolve(DIST, rel);
    if (!file.startsWith(DIST) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404); res.end(); return;
    }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(fs.readFileSync(file));
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

// ---------------------------------------------------------------- v prohlížeči
// Semínkový Math.random a pevný čas – vloženo před jakýkoli skript stránky.
const DETERMINISM = `(() => {
  let s = 0x9e3779b9;
  Math.random = function () { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const FIXED = Date.parse(${JSON.stringify(FIXED_TIME)});
  const RealDate = Date;
  class FixedDate extends RealDate { constructor(...a) { if (a.length) super(...a); else super(FIXED); } static now() { return FIXED; } }
  FixedDate.parse = RealDate.parse; FixedDate.UTC = RealDate.UTC;
  window.Date = FixedDate;
  // Časovače běží 8× rychleji: psací efekty a odpočty doběhnou před snímkem (stejně v obou verzích).
  const rawTimeout = window.setTimeout.bind(window), rawInterval = window.setInterval.bind(window);
  const fast = (ms) => Math.max(0, Math.floor((Number(ms) || 0) / 8));
  window.setTimeout = (fn, ms, ...rest) => rawTimeout(fn, fast(ms), ...rest);
  window.setInterval = (fn, ms, ...rest) => rawInterval(fn, Math.max(4, fast(ms)), ...rest);
  window.confirm = () => true; window.alert = () => {}; window.prompt = () => null;
  try { window.open = () => null; } catch (e) {}
})();`;

// Normalizovaný snímek DOM: struktura + viditelný text + stabilní atributy.
function snapshotInPage() {
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'CANVAS', 'VIDEO', 'AUDIO', 'IFRAME', 'LINK', 'META']);
  const KEEP_ATTR = /^(id|role|type|disabled|hidden|name|for|href|src|value|checked|selected|open|tabindex|aria-[\w-]+|data-[\w-]+)$/;
  const lines = [];
  const text = [];
  const clip = (v) => {
    v = String(v).replace(/^https?:\/\/127\.0\.0\.1:\d+/, ''); // náhodný port testovacího serveru
    if (/^data:/.test(v)) return 'data:' + v.length;
    if (/^blob:/.test(v)) return 'blob:';
    return v.length > 200 ? v.slice(0, 200) + '…' + v.length : v;
  };
  function walk(el, depth) {
    if (SKIP.has(el.tagName)) return;
    const cs = getComputedStyle(el);
    const shown = cs.display !== 'none' && cs.visibility !== 'hidden';
    const attrs = [];
    for (const a of Array.from(el.attributes)) {
      if (!KEEP_ATTR.test(a.name)) continue;
      if (a.name === 'data-ghrab-access') continue; // stav brány
      attrs.push(a.name + '=' + clip(a.value));
    }
    if ('value' in el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) attrs.push('~value=' + clip(el.value));
    const cls = Array.from(el.classList).sort().join('.');
    let own = '';
    for (const n of el.childNodes) if (n.nodeType === 3) own += n.nodeValue;
    own = own.replace(/\s+/g, ' ').trim();
    if (own && shown) text.push(own);
    lines.push(`${'  '.repeat(Math.min(depth, 40))}${el.tagName.toLowerCase()}${cls ? '.' + cls : ''}${shown ? '' : ' [skryto]'}${attrs.length ? ' {' + attrs.sort().join(' ') + '}' : ''}${own ? ' "' + clip(own) + '"' : ''}`);
    if (el.tagName === 'svg' || el.tagName === 'SVG') return; // obsah kreseb se nemění chováním
    for (const child of el.children) walk(child, depth + 1);
  }
  if (document.body) walk(document.body, 0);
  const storage = [];
  try { for (let i = 0; i < localStorage.length; i++) storage.push(localStorage.key(i)); } catch (e) {}
  return { lines, visibleText: text.join(' | '), storageKeys: storage.sort(), title: document.title };
}

// Tlačítka učitelského panelu (enginy nemají jednotnou strukturu, proto heuristika).
function teacherButtonsInPage() {
  const PANEL = '[id*="teacher" i],[class*="teacher" i],[id^="tp"],[id*="tpanel" i],[id="t-banner"],[class*="ludus-teacher" i],[data-ludus-teacher]';
  const SKIP_LABEL = /celá obrazovka|fullscreen|zvuk|sound|zavřít|close|export|kopírovat|copy|stáhnout|download|tisk|print/i;
  const out = [];
  document.querySelectorAll(PANEL).forEach((panel) => {
    panel.querySelectorAll('button,[role="button"]').forEach((b) => {
      const cs = getComputedStyle(b);
      if (cs.display === 'none' || cs.visibility === 'hidden' || b.disabled) return;
      const label = (b.getAttribute('aria-label') || b.textContent || b.title || b.id || '').replace(/\s+/g, ' ').trim().slice(0, 60);
      if (!label || SKIP_LABEL.test(label) || SKIP_LABEL.test(b.id || '')) return;
      if (!out.includes(b)) out.push(b);
    });
  });
  // Stabilní pořadí a identita: pořadí v dokumentu + text.
  return out.map((b, i) => {
    b.setAttribute('data-fp-teacher-index', String(i));
    return (b.getAttribute('aria-label') || b.textContent || b.title || b.id || '').replace(/\s+/g, ' ').trim().slice(0, 60);
  });
}

// ---------------------------------------------------------------- záznam
let sharedBrowser = null;
const LAUNCH = { headless: true, args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required', '--mute-audio'] };
async function ensureBrowser() {
  if (!sharedBrowser || !sharedBrowser.isConnected()) {
    if (sharedBrowser) process.stderr.write('  (prohlížeč spadl – nové spuštění)\n');
    sharedBrowser = await chromium.launch({ executablePath: findChromium(), ...LAUNCH });
  }
  return sharedBrowser;
}
async function openPage(_unused, url, { settle = SETTLE_MS } = {}) {
  const browser = await ensureBrowser();
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1280, height: 800 } });
  await context.addInitScript(DETERMINISM);
  const page = await context.newPage();
  const issues = { pageErrors: [], consoleErrors: [], failedRequests: [] };
  page.on('pageerror', (e) => issues.pageErrors.push(String(e.message || e).slice(0, 300)));
  page.on('console', (m) => { if (m.type() === 'error') issues.consoleErrors.push(m.text().slice(0, 300)); });
  page.on('response', (r) => { if (r.status() >= 400) issues.failedRequests.push(`${r.status()} ${new URL(r.url()).pathname}`); });
  page.on('dialog', (d) => d.accept().catch(() => {}));
  await page.goto(url, { waitUntil: 'load' });
  for (let i = 0; i < 200; i++) {
    const ready = await page.evaluate(() => document.documentElement.dataset.ghrabAccess !== 'checking' && !document.querySelector('script[data-ghrab-protected]'));
    if (ready) break;
    await page.waitForTimeout(25);
  }
  await page.waitForTimeout(settle);
  return { context, page, issues };
}

// Snímek se opakuje, dokud se dva po sobě jdoucí neshodují (doběhlé animace, počítadla).
// Pokud se stránka neustálí, obrazovka se označí jako nestabilní a porovná se jen chybovost.
async function stableSnapshot(page) {
  let previous = await page.evaluate(snapshotInPage);
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(250);
    const current = await page.evaluate(snapshotInPage);
    if (current.lines.join('\n') === previous.lines.join('\n') && current.visibleText === previous.visibleText) return current;
    previous = current;
  }
  previous.unstable = true;
  return previous;
}

function pack(snapshot, issues, fullKey) {
  const body = snapshot.lines.join('\n');
  if (FULL_DIR) {
    fs.mkdirSync(FULL_DIR, { recursive: true });
    fs.writeFileSync(path.join(FULL_DIR, fullKey.replace(/[^a-z0-9._-]+/gi, '_') + '.txt'), `${snapshot.title}\n${body}\n`);
  }
  return {
    domHash: sha(body),
    nodes: snapshot.lines.length,
    textHash: sha(snapshot.visibleText),
    text: snapshot.visibleText.slice(0, 3000),
    storageKeys: snapshot.storageKeys,
    ...(snapshot.unstable ? { unstable: true } : {}),
    pageErrors: [...new Set(issues.pageErrors)].sort(),
    failedRequests: [...new Set(issues.failedRequests)].sort(),
  };
}

// Stránka + všechny obrazovky dosažitelné z učitelského panelu.
async function fingerprintGame(browser, key, url, { walkTeacher = true } = {}) {
  const result = { url: url.replace(/^http:\/\/127\.0\.0\.1:\d+/, ''), screens: {} };
  try {
    const { context, page, issues } = await openPage(browser, url);
    result.screens['start'] = pack(await stableSnapshot(page), issues, `${key}__start`);
    await context.close();
  } catch (error) { result.screens['start'] = { failure: String(error.message || error).split('\n')[0].slice(0, 160) }; }
  // Gesto: trojí klepnutí na odznak LUDUS přepíná učitelský režim (jediná cesta bez ?teacher=1).
  try {
    const { context, page, issues } = await openPage(browser, url);
    const tapped = await page.evaluate(() => {
      const badge = document.querySelector('#ludusBadge');
      if (!badge) return false;
      for (let i = 0; i < 3; i++) badge.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      return true;
    });
    const snap = await stableSnapshot(page);
    result.screens['gesture:tripletap'] = { ...pack(snap, issues, `${key}__tripletap`), badge: tapped,
      teacherMode: await page.evaluate(() => document.body.classList.contains('teacher') || document.body.classList.contains('ludus-teacher-mode')) };
    await context.close();
  } catch (error) { result.screens['gesture:tripletap'] = { failure: String(error.message || error).split('\n')[0].slice(0, 160) }; }
  const teacherUrl = url + (url.includes('?') ? '&' : '?') + 'teacher=1';
  let labels = [];
  {
    const { context, page, issues } = await openPage(browser, teacherUrl);
    labels = await page.evaluate(teacherButtonsInPage);
    result.screens['teacher'] = pack(await stableSnapshot(page), issues, `${key}__teacher`);
    await context.close();
  }
  result.teacherButtons = labels;
  for (let i = 0; walkTeacher && i < labels.length; i++) {
    const screenKey = `teacher:${i}:${labels[i]}`;
    let context = null;
    try {
      const opened = await openPage(browser, teacherUrl);
      context = opened.context;
      const again = await opened.page.evaluate(teacherButtonsInPage);
      const index = again.indexOf(labels[i]) >= 0 ? again.indexOf(labels[i]) : i;
      await opened.page.evaluate((n) => document.querySelector(`[data-fp-teacher-index="${n}"]`)?.click(), index);
      await opened.page.waitForTimeout(SETTLE_MS);
      result.screens[screenKey] = pack(await stableSnapshot(opened.page), opened.issues, `${key}__t${i}`);
      if (process.env.LUDUS_FP_VERBOSE) process.stderr.write(`    ${key} ${i + 1}/${labels.length} ${labels[i]}\n`);
    } catch (error) {
      // Stránka se zavřela / spadla – i to je chování, které se musí zachovat.
      result.screens[screenKey] = { failure: String(error.message || error).split('\n')[0].slice(0, 160) };
    } finally {
      await context?.close().catch(() => {});
    }
  }
  return result;
}

// Export: nestálé části (čas sestavení) se před hashováním odstraní.
function normalizeExport(html) {
  return String(html)
    .replace(/<!-- BUILD: [^>]*-->/g, '<!-- BUILD -->')
    .replace(/"generatedAt":"[^"]*"/g, '"generatedAt":"*"')
    .replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/gi, '<meta csp>');
}

async function record(browser, base) {
  const out = { schema: SCHEMA, recordedAt: new Date().toISOString(), dist: path.relative(process.cwd(), DIST) || '.', phases: {} };
  const t0 = Date.now();

  // A + B: dílna a exporty
  if (PHASES.has('A') || PHASES.has('B') || PHASES.has('C')) {
    const { context, page, issues } = await openPage(browser, `${base}/Ludus/index.html`, { settle: 1500 });
    if (PHASES.has('A')) {
      const selfTests = await page.evaluate(() => (typeof selfTests === 'function' ? selfTests() : []).map((r) => ({
        group: String(r.cat ?? r.group ?? ''), name: String(r.name ?? ''), ok: Boolean(r.pass ?? r.ok),
      })));
      const registry = await page.evaluate(() => Object.entries(GAME_ENGINES).map(([k, e]) => `${k} → ${e.engine || '-'} | ${normalizeEngineStatus(e.status)} | build=${engineCanBuild(e)}`).sort());
      out.phases.A = { builderStart: pack(await stableSnapshot(page), issues, 'builder__start'), selfTests, registry };
    }
    if (PHASES.has('B') || PHASES.has('C')) {
      const exports = await page.evaluate(async () => {
        const rows = [];
        const topic = TOPICS.find((t) => t.id === 'relclauses') || TOPICS[0];
        const engines = Object.values(GAME_ENGINES).filter((e) => engineCanBuild(e));
        for (const e of engines) {
          const sk = SKINS.find((s) => s.id === e.skinId);
          for (const branded of sk && sk.twin ? [false, true] : [false]) {
            Object.assign(state, { skin: e.skinId, frame: e.mechanicId, topic, branded, exportTarget: branded ? 'internal' : 'public', contentLang: 'en', supportLang: 'cs', uiLang: 'cs' });
            let html = null; let error = '';
            try { await assembleExample(); html = window.__lastGame; } catch (err) { error = String(err && err.message || err); }
            rows.push({ key: `${e.skinId}:${e.mechanicId}:${branded ? 'official' : 'safe'}`, engine: e.engine, name: window.__lastGameName || '', html, error });
          }
        }
        const tasks = [{ prompt: 'Otázka', options: ['A', 'B'], answer: 'A', explain: 'Vysvětlení', block: 'select', clue: 'Pravidlo' }];
        const quiz = buildClassQuizHtml('Test', 'Podtitul', 'Svět', '#123456', {}, tasks);
        return { rows, quiz };
      });
      const B = { games: {}, classQuiz: { hash: sha(normalizeExport(exports.quiz)), bytes: exports.quiz.length } };
      for (const row of exports.rows) {
        const norm = row.html ? normalizeExport(row.html) : '';
        B.games[row.key] = { engine: row.engine, fileName: row.name, bytes: row.html ? row.html.length : 0, hash: row.html ? sha(norm) : null, error: row.error,
          leftovers: row.html ? { accessLayer: /data-ghrab-access|ghrab-protected/.test(row.html), externalRuntime: /src="\.\.\/runtime\//.test(row.html) } : null };
        if (row.html) exportsInMemory.set(`${row.key.replace(/:/g, '_')}.html`, row.html);
        if (FULL_DIR && row.html) { fs.mkdirSync(FULL_DIR, { recursive: true }); fs.writeFileSync(path.join(FULL_DIR, `export__${row.key.replace(/:/g, '_')}.html`), norm); }
      }
      if (PHASES.has('B')) out.phases.B = B;
    }
    await context.close();
  }

  // C: exportované hry (to, co dostanou žáci) – jen varianta safe
  if (PHASES.has('C')) {
    out.phases.C = {};
    for (const name of [...exportsInMemory.keys()].filter((n) => n.endsWith('_safe.html') && selected(n)).sort()) {
      out.phases.C[name] = await fingerprintGame(browser, `export_${name}`, `${base}/export/${encodeURIComponent(name)}`);
      process.stderr.write(`  C ${name} (${Object.keys(out.phases.C[name].screens).length} obrazovek)\n`);
    }
  }

  // D: nasazené chráněné enginy
  if (PHASES.has('D')) {
    out.phases.D = {};
    const catalog = JSON.parse(fs.readFileSync(path.join(DIST, 'engines', 'manifest.json'), 'utf8'));
    const exportable = new Set((Array.isArray(catalog) ? catalog : catalog.engines || []).filter((e) => e.file && e.builderCompatible === true).map((e) => e.file));
    for (const file of fs.readdirSync(path.join(DIST, 'engines')).filter((f) => f.endsWith('.html') && selected(f)).sort()) {
      // Nasazené enginy: start + učitelský režim za přístupovou bránou (ověřuje odemčení a runtime).
      // Úplný průchod obrazovkami se dělá nad exporty (fáze C) – je to tentýž engine s obsahem.
      // Enginy, které dílna neexportuje (builderCompatible:false), se projdou celé, jinak by zůstaly nepokryté.
      const walkTeacher = has('--deep-deployed') || !exportable.has(file);
      out.phases.D[file] = await fingerprintGame(browser, `engine_${file}`, `${base}/Ludus/engines/${file}`, { walkTeacher });
      process.stderr.write(`  D ${file} (${Object.keys(out.phases.D[file].screens).length} obrazovek)\n`);
    }
  }
  out.durationSec = Math.round((Date.now() - t0) / 1000);
  return out;
}

// ---------------------------------------------------------------- porovnání
function compare(expected, actual) {
  const diffs = [];
  const unstableScreens = [];
  const add = (where, what) => diffs.push(`${where}: ${what}`);
  const eqList = (where, a = [], b = []) => {
    const A = JSON.stringify(a); const B = JSON.stringify(b);
    if (A !== B) add(where, `bylo ${A.slice(0, 300)} → je ${B.slice(0, 300)}`);
  };
  const cmpScreen = (where, e, a) => {
    if (!a) return add(where, 'obrazovka chybí');
    if (e.failure || a.failure) { if (e.failure !== a.failure) add(where, `selhání „${e.failure || '-'}“ → „${a.failure || '-'}“`); return; }
    if (e.unstable || a.unstable) {
      unstableScreens.push(where);
      eqList(`${where} chyby JS`, e.pageErrors, a.pageErrors);
      return;
    }
    if (e.domHash !== a.domHash) add(where, `DOM se změnil (uzlů ${e.nodes} → ${a.nodes})${e.textHash !== a.textHash ? '; změnil se i viditelný text' : '; viditelný text beze změny'}`);
    if (e.textHash !== a.textHash) {
      const ew = new Set(e.text.split(' | ')); const aw = new Set(a.text.split(' | '));
      const gone = [...ew].filter((x) => !aw.has(x)).slice(0, 5); const added = [...aw].filter((x) => !ew.has(x)).slice(0, 5);
      add(where, `text – zmizelo: ${JSON.stringify(gone)} / přibylo: ${JSON.stringify(added)}`);
    }
    if (e.teacherMode !== a.teacherMode) add(where, `učitelský režim ${e.teacherMode} → ${a.teacherMode}`);
    eqList(`${where} localStorage`, e.storageKeys, a.storageKeys);
    eqList(`${where} chyby JS`, e.pageErrors, a.pageErrors);
    // Neúspěšné požadavky závisí na načasování (líné obrázky) – porovnávají se souhrnně za celou hru.
  };
  const failedUnion = (g) => [...new Set(Object.values(g.screens).flatMap((x) => x.failedRequests || []))].sort();
  const cmpGame = (where, e, a) => {
    if (!a) return add(where, 'hra chybí');
    eqList(`${where} tlačítka učitelského panelu`, e.teacherButtons, a.teacherButtons);
    eqList(`${where} neúspěšné požadavky (celá hra)`, failedUnion(e), failedUnion(a));
    for (const [k, s] of Object.entries(e.screens)) cmpScreen(`${where} › ${k}`, s, a.screens[k]);
    for (const k of Object.keys(a.screens)) if (!e.screens[k]) add(`${where} › ${k}`, 'nová obrazovka');
  };
  const E = expected.phases; const A = actual.phases;
  if (E.A && A.A) {
    cmpScreen('A dílna › start', E.A.builderStart, A.A.builderStart);
    eqList('A selfTests', E.A.selfTests, A.A.selfTests);
    eqList('A registr enginů', E.A.registry, A.A.registry);
  }
  if (E.B && A.B) {
    if (E.B.classQuiz.hash !== A.B.classQuiz.hash) add('B třídní kvíz', 'výstup se změnil');
    for (const [k, g] of Object.entries(E.B.games)) {
      const a = A.B.games[k];
      if (!a) { add(`B export ${k}`, 'chybí'); continue; }
      if (g.hash !== a.hash) add(`B export ${k}`, `soubor hry se změnil (${g.bytes} → ${a.bytes} B)`);
      if (g.error !== a.error) add(`B export ${k}`, `chyba „${g.error}“ → „${a.error}“`);
      eqList(`B export ${k} zbytky`, g.leftovers, a.leftovers);
    }
    for (const k of Object.keys(A.B.games)) if (!E.B.games[k]) add(`B export ${k}`, 'nový export');
  }
  for (const ph of ['C', 'D']) {
    if (!E[ph] || !A[ph]) continue;
    for (const [k, g] of Object.entries(E[ph])) cmpGame(`${ph} ${k}`, g, A[ph][k]);
    for (const k of Object.keys(A[ph])) if (!E[ph][k]) add(`${ph} ${k}`, 'nová hra');
  }
  diffs.unstable = unstableScreens;
  return diffs;
}

// ---------------------------------------------------------------- běh
if (MODE === 'compare') {
  const [expected, actual] = COMPARE_FILES.map((file) => JSON.parse(fs.readFileSync(file, 'utf8')));
  if (expected.schema !== SCHEMA || actual.schema !== SCHEMA) throw new Error('Neznámé schéma otisku.');
  const diffs = compare(expected, actual);
  console.log(JSON.stringify({ schema: SCHEMA, status: diffs.length ? 'failed' : 'passed', expected: COMPARE_FILES[0], actual: COMPARE_FILES[1], differences: diffs.length, details: diffs.slice(0, 200), unstableScreens: diffs.unstable.length, unstable: diffs.unstable }, null, 2));
  process.exit(diffs.length ? 1 : 0);
}
const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = null; // prohlížeč spravuje ensureBrowser()
let exitCode = 0;
try {
  if (MODE === 'record') {
    const data = await record(browser, base);
    fs.mkdirSync(path.dirname(path.resolve(BASELINE_FILE)), { recursive: true });
    fs.writeFileSync(BASELINE_FILE, `${JSON.stringify(data, null, 1)}\n`);
    const screens = ['C', 'D'].reduce((n, p) => n + Object.values(data.phases[p] || {}).reduce((m, g) => m + Object.keys(g.screens).length, 0), 0);
    console.log(JSON.stringify({ schema: SCHEMA, status: 'recorded', file: BASELINE_FILE, exports: Object.keys(data.phases.B?.games || {}).length, screens, selfTests: data.phases.A?.selfTests?.length || 0, durationSec: data.durationSec }, null, 2));
  } else if (MODE === 'check') {
    const expected = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
    if (expected.schema !== SCHEMA) throw new Error(`Neznámé schéma otisku: ${expected.schema}`);
    for (const p of [...PHASES]) if (!expected.phases[p]) PHASES.delete(p);
    // --only při kontrole: porovnají se jen vybrané hry (rychlá kontrola jedné hry).
    if (ONLY.length) for (const p of ['C', 'D']) if (expected.phases[p]) expected.phases[p] = Object.fromEntries(Object.entries(expected.phases[p]).filter(([k]) => selected(k)));
    const actual = await record(browser, base);
    const diffs = compare(expected, actual);
    const report = { schema: SCHEMA, status: diffs.length ? 'failed' : 'passed', baseline: BASELINE_FILE, differences: diffs.length, details: diffs.slice(0, 200), unstableScreens: diffs.unstable.length, unstable: diffs.unstable, durationSec: actual.durationSec };
    console.log(JSON.stringify(report, null, 2));
    if (diffs.length) exitCode = 1;
  } else {
    const first = await record(browser, base);
    exportsInMemory.clear();
    const second = await record(browser, base);
    const diffs = compare(first, second);
    console.log(JSON.stringify({ schema: SCHEMA, status: diffs.length ? 'unstable' : 'stable', differences: diffs.length, details: diffs.slice(0, 200) }, null, 2));
    if (diffs.length) exitCode = 1;
  }
} finally {
  await sharedBrowser?.close().catch(() => {});
  server.close();
}
process.exit(exitCode);
