import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { stripStudioProtection } from './access-protection.mjs';

const ROOT = path.resolve('.');
const VERSION = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
const errors = [];
const warnings = [];
const warn = msg => warnings.push(msg);
const need = (ok, msg) => { if (!ok) errors.push(msg); };
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function findChromium() {
  for (const candidate of [
    process.env.CHROMIUM_PATH,
    process.env.CHROME_PATH,
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
  ].filter(Boolean)) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error('Chromium není dostupné pro behaviorální validaci.');
}

async function waitJson(url) {
  for (let attempt = 0; attempt < 160; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return await response.json();
    } catch {}
    await sleep(100);
  }
  throw new Error('Chromium remote debugging se nespustil.');
}

async function findPageTarget(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const targets = await response.json();
    return targets.find((item) => item.type === 'page' && item.webSocketDebuggerUrl) || null;
  } catch {
    return null;
  }
}

async function waitPageTarget(listUrl, browserWebSocketDebuggerUrl) {
  const deadline = Date.now() + 12000;
  let createAttempts = 0;
  let nextCreateAt = 0;
  while (Date.now() < deadline) {
    const page = await findPageTarget(listUrl);
    if (page) return page;
    if (browserWebSocketDebuggerUrl && createAttempts < 4 && Date.now() >= nextCreateAt) {
      createAttempts += 1;
      nextCreateAt = Date.now() + 500;
      let browserClient;
      try {
        browserClient = new CdpClient(browserWebSocketDebuggerUrl);
        await browserClient.call('Target.createTarget', { url: 'about:blank' });
      } catch {} finally {
        try { browserClient?.close(); } catch {}
      }
    }
    await sleep(75);
  }
  throw new Error(`Chromium nemá stránkový target ani po čekání (pokusy o vytvoření: ${createAttempts}).`);
}

class CdpClient {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.seq = 0;
    this.pending = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });
    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (!message.id || !this.pending.has(message.id)) return;
      const pending = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(JSON.stringify(message.error)));
      else pending.resolve(message.result);
    };
  }
  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = ++this.seq;
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async evaluate(expression) {
    const result = await this.call('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'Runtime.evaluate failed');
    }
    return result.result?.value;
  }
  close() { try { this.ws.close(); } catch {} }
}

const BROWSER_PRELUDE = `<script>
window.__LUDUS_TEST_ERRORS__ = [];
window.addEventListener('error', (event) => window.__LUDUS_TEST_ERRORS__.push(String(event.error?.stack || event.message || 'error')));
window.addEventListener('unhandledrejection', (event) => window.__LUDUS_TEST_ERRORS__.push(String(event.reason?.stack || event.reason || 'rejection')));
window.fetch = async () => ({ ok: false, status: 404, text: async () => '', json: async () => ({}), blob: async () => new Blob([]) });
window.matchMedia = window.matchMedia || ((query) => ({ matches: false, media: query, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
window.alert = () => {};
window.confirm = () => true;
window.prompt = () => '';
window.scrollTo = () => {};
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || function() {};
URL.createObjectURL = () => 'blob:ludus-test';
URL.revokeObjectURL = () => {};
try { Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => {} }, configurable: true }); } catch {}
try { Object.defineProperty(navigator, 'serviceWorker', { value: { register: async () => ({}) }, configurable: true }); } catch {}
window.ResizeObserver = window.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} };
window.AudioContext = class {
  constructor() { this.destination = {}; this.currentTime = 0; }
  createOscillator() { return { connect() {}, start() {}, stop() {}, frequency: { setValueAtTime() {} }, type: '' }; }
  createGain() { return { connect() {}, gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} } }; }
};
window.webkitAudioContext = window.AudioContext;
HTMLMediaElement.prototype.play = async function() {};
</script>`;

function browserDocument(html, baseUrl) {
  const base = `<base href="${baseUrl}">`;
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head([^>]*)>/i, `<head$1>${base}${BROWSER_PRELUDE}`);
  return `<!doctype html><html><head>${base}${BROWSER_PRELUDE}</head><body>${html}</body></html>`;
}

async function createBrowserSession() {
  const port = 9580 + (process.pid % 300);
  const profile = path.join('/tmp', `ludus-validate-${process.pid}`);
  fs.rmSync(profile, { recursive: true, force: true });
  const chrome = spawn(findChromium(), [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--disable-default-apps', '--no-first-run', `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`, 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'ignore'] });
  const browserInfo = await waitJson(`http://127.0.0.1:${port}/json/version`);
  const page = await waitPageTarget(
    `http://127.0.0.1:${port}/json`,
    browserInfo?.webSocketDebuggerUrl || null,
  );
  const client = new CdpClient(page.webSocketDebuggerUrl);
  await client.call('Runtime.enable');
  await client.call('Page.enable');
  const tree = await client.call('Page.getFrameTree');
  const frameId = tree.frameTree.frame.id;
  return {
    client,
    async setContent(html, baseUrl, delay = 0) {
      // Start each fixture in a fresh Window/global lexical environment. document.open()
      // alone keeps top-level const/let bindings from the previous fixture and would
      // produce false duplicate-identifier failures between the builder and an engine.
      try { await client.call('Page.navigate', { url: 'about:blank' }); } catch {}
      await sleep(120);
      // Page.setDocumentContent updates markup but does not execute inline scripts
      // reliably in all Chromium builds. document.write creates a real parsed page
      // while keeping the payload off the URL length limit.
      const documentSource = browserDocument(html, baseUrl);
      const expression = `document.open();document.write(${JSON.stringify(documentSource)});document.close();`;
      try {
        await client.call('Runtime.evaluate', { expression, returnByValue: true });
      } catch (error) {
        // Navigation can destroy the originating execution context after document.close().
        if (!/context|navigation|destroyed/i.test(String(error?.message || error))) throw error;
      }
      if (delay) await sleep(delay);
    },
    async close() {
      client.close();
      chrome.kill('SIGKILL');
      await sleep(200);
      fs.rmSync(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    },
  };
}

async function runChromiumBehaviorChecks({ src, representative, need, errors }) {
  const session = await createBrowserSession();
  try {
    // The platform runtime is verified by the shared conformance suite. This isolated
    // builder behavior test must not depend on resolving an external test-domain URL.
    const behaviorDocument = src
      .replace(/<script\b[^>]*data-ghrab-platform-loader[^>]*><\/script>\s*/gi, '')
      .replace(/<link\b[^>]*data-ghrab-platform-style[^>]*>\s*/gi, '');
    await session.setContent(behaviorDocument, 'https://ludus.test/', 1000);
    let ready = false;
    let runtimeState = null;
    for (let attempt = 0; attempt < 80; attempt += 1) {
      runtimeState = await session.client.evaluate(`({ readyState: document.readyState, href: location.href.slice(0,80), engine: typeof getGameEngine, tests: typeof selfTests, scripts: document.scripts.length, body: document.body?.textContent?.length || 0 })`);
      ready = runtimeState?.engine === 'function' && runtimeState?.tests === 'function';
      if (ready) break;
      await sleep(100);
    }
    if (!ready) throw new Error(`LUDUS builder runtime se v Chromiu neinicializoval: ${JSON.stringify(runtimeState)}`);
    const builder = await session.client.evaluate(`(async () => {
      const rows = typeof selfTests === 'function' ? selfTests() : [];
      const mismatches = [['arcanum','quest'],['arcanum','escape'],['arcanum','lab'],['knights','quest'],['sundered','academy']]
        .map(([skin, mechanic]) => ({ skin, mechanic, value: getGameEngine(skin, mechanic) }));
      const tasks = [{ prompt: 'Otázka', options: ['A','B'], answer: 'A', explain: 'Vysvětlení', block: 'select', clue: 'Pravidlo' }];
      const quiz = buildClassQuizHtml('Test', 'Podtitul', 'Svět', '#123456', {}, tasks);
      const textareaSource = quiz.match(/<textarea id="teamNames">([\\s\\S]*?)<\\/textarea>/)?.[1] || '';
      const slash = String.fromCharCode(92);
      const quizSplit = quiz.includes('.split(/' + slash + 'r?' + slash + 'n+/)');
      const quizFrame = document.createElement('iframe');
      document.body.appendChild(quizFrame);
      const frameReady = new Promise((resolve) => {
        quizFrame.onload = resolve;
        setTimeout(resolve, 500);
      });
      quizFrame.srcdoc = quiz;
      await frameReady;
      const quizDoc = quizFrame.contentDocument;
      const quizInput = quizDoc?.querySelector('#teamNames');
      const quizButton = quizDoc?.querySelector('#startGame');
      if (quizInput) quizInput.value = 'Alfa\\nBeta\\nGama';
      quizButton?.click();
      await new Promise((resolve) => setTimeout(resolve, 60));
      const quizTeamResult = {
        count: quizDoc?.querySelectorAll('.team').length || 0,
        hasInput: Boolean(quizInput),
        hasButton: Boolean(quizButton),
        inputValue: quizInput?.value || '',
        gameText: quizDoc?.querySelector('#game')?.textContent?.slice(0, 180) || '',
      };
      quizFrame.remove();

      const mediaDoc = new DOMParser().parseFromString('<!doctype html><html><body><video><source data-ludus-media="intro" data-ludus-src-official="../media/test.mp4" data-ludus-src-safe="../media/safe.mp4" type="video/mp4"></video></body></html>', 'text/html');
      const oldFetch = window.fetch;
      window.fetch = async (url) => ({ ok: true, status: 200, blob: async () => new Blob([String(url)], { type: 'video/mp4' }) });
      await inlineLudusMedia(mediaDoc, 'https://ludus.test/engines/hogwarts.html', 'official');
      window.fetch = oldFetch;
      const mediaSource = mediaDoc.querySelector('source');

      const safeDoc = new DOMParser().parseFromString('<!doctype html><html><body><audio><source data-ludus-media="soundtrack" data-ludus-src-official="../media/official.mp3" data-ludus-src-safe="" type="audio/mpeg"></audio></body></html>', 'text/html');
      await inlineLudusMedia(safeDoc, 'https://ludus.test/engines/hogwarts.html', 'safe');
      const safeSource = safeDoc.querySelector('source');
      return {
        rowCount: rows.length,
        failedRows: rows.filter((item) => !item.pass).map((item) => ({ name: item.name, detail: item.detail })),
        mismatches: mismatches.map((item) => ({ ...item, isNull: item.value === null })),
        textareaSource,
        quizSplit,
        quizTeamResult,
        media: {
          src: mediaSource?.getAttribute('src') || '',
          safeRemoved: !mediaSource?.hasAttribute('data-ludus-src-safe'),
          marker: mediaDoc.documentElement.getAttribute('data-ludus-media-export'),
        },
        safeMedia: {
          hasSrc: safeSource?.hasAttribute('src') || false,
          officialRemoved: !safeSource?.hasAttribute('data-ludus-src-official'),
          marker: safeDoc.documentElement.getAttribute('data-ludus-media-export'),
        },
      };
    })()`);
    need(builder.rowCount >= 30, `in-app self-testy: očekáváno alespoň 30 testů, nalezeno ${builder.rowCount}`);
    for (const row of builder.failedRows || []) errors.push(`in-app self-test selhal: ${row.name} — ${row.detail}`);
    for (const item of builder.mismatches || []) need(item.isNull, `getGameEngine: ${item.skin}+${item.mechanic} vrací cizí engine`);
    need(builder.textareaSource === 'Tým 1\\nTým 2\\nTým 3', 'třídní kvíz: generovaný skript nemá bezpečné escapované konce řádků');
    need(builder.quizSplit, 'třídní kvíz: týmy se nedělí podle konců řádků');
    need(/^data:video\/mp4;base64,/i.test(builder.media.src), 'media export: oficiální médium nebylo vloženo jako data URL');
    need(builder.media.safeRemoved, 'media export: do oficiálního exportu pronikla safe varianta');
    need(builder.media.marker === 'embedded-official', 'media export: chybí značka vložené varianty');
    need(!builder.safeMedia.hasSrc, 'media export: prázdná safe varianta nemá obsahovat oficiální soundtrack');
    need(builder.safeMedia.officialRemoved, 'media export: safe export obsahuje odkaz na oficiální médium');
    need(builder.safeMedia.marker === 'embedded-safe', 'media export: chybí značka safe varianty');

    need(builder.quizTeamResult.count === 3, `třídní kvíz: tři řádky nevytvořily tři týmy (${JSON.stringify(builder.quizTeamResult)})`);

    // A fresh document global avoids collisions between top-level lexical names in the
    // builder and the representative standalone engine.
    await session.client.call('Page.navigate', { url: 'about:blank' });
    await sleep(250);
    await session.setContent(representative, 'https://ludus.test/engines/laughworks.html', 1150);
    const engine = await session.client.evaluate(`(async () => {
      const footer = document.querySelector('.ludus-owner-footer');
      let mutations = 0;
      const observer = new MutationObserver(() => { mutations += 1; });
      if (footer) observer.observe(footer, { childList: true, subtree: true, characterData: true });
      await new Promise((resolve) => setTimeout(resolve, 500));
      observer.disconnect();
      const i18n = window.LUDUS_I18N;
      const translations = i18n ? {
        legend: i18n.translateString('Legenda o draku', 'en', 'cs'),
        lives: i18n.translateString('Zbývají 3 životy', 'en', 'cs'),
        mistakes: i18n.translateString('5 chyb v souboji', 'en', 'cs'),
        protected: i18n.translateString('JONES CONSOLE NOON OFFLINE OKLAHOMA', 'cs', 'en'),
        tokens: i18n.translateString('ON OFF', 'cs', 'en'),
      } : null;
      let roundTrip = '';
      if (i18n) {
        const probe = document.createElement('div');
        probe.textContent = 'Mapa kobky';
        document.body.appendChild(probe);
        await new Promise((resolve) => setTimeout(resolve, 40));
        i18n.setLanguage('en');
        await new Promise((resolve) => setTimeout(resolve, 80));
        i18n.setLanguage('cs');
        await new Promise((resolve) => setTimeout(resolve, 80));
        roundTrip = probe.textContent;
      }
      return { hasFooter: Boolean(footer), mutations, hasI18n: Boolean(i18n && typeof i18n.setLanguage === 'function'), translations, roundTrip, errors: window.__LUDUS_TEST_ERRORS__ || [], scripts: [...document.scripts].map((node) => ({ src: node.src, length: node.textContent.length, runtime: node.hasAttribute('data-ludus-shared-runtime') })), readyState: document.readyState, bodyChildren: [...document.body.children].slice(-12).map((node) => ({tag:node.tagName,id:node.id,cls:node.className})), htmlTail: document.documentElement.outerHTML.slice(-3500) };
    })()`);
    need(engine.hasFooter, `engine behavior: chybí vlastnický footer (${JSON.stringify({errors:engine.errors,scripts:engine.scripts,readyState:engine.readyState,bodyChildren:engine.bodyChildren,htmlTail:engine.htmlTail})})`);
    need(engine.mutations === 0, `engine behavior: footer se v klidu přepsal ${engine.mutations}× za 0,5 s`);
    need(engine.hasI18n, `engine behavior: LUDUS_I18N není dostupné (${JSON.stringify({errors:engine.errors,scripts:engine.scripts,readyState:engine.readyState,bodyChildren:engine.bodyChildren,htmlTail:engine.htmlTail})})`);
    if (engine.translations) {
      need(engine.translations.legend === 'Legend of the dragon', 'i18n: Legenda o draku se překládá neúplně');
      need(engine.translations.lives === '3 lives remaining', 'i18n: dynamický počet životů se překládá neúplně');
      need(engine.translations.mistakes === '5 mistakes in battle', 'i18n: dynamický počet chyb se překládá chybně');
      need(engine.translations.protected === 'JONES CONSOLE NOON OFFLINE OKLAHOMA', 'i18n: krátké tokeny ON/OFF/OK/NO nesmějí poškodit vlastní jména a delší slova');
      need(engine.translations.tokens.includes('ZAPNUTO') && engine.translations.tokens.includes('VYPNUTO'), 'i18n: samostatné krátké tokeny se stále překládají');
      need(engine.roundTrip === 'Mapa kobky', `i18n: CZ → EN → CZ nevrátilo původní text (${engine.roundTrip})`);
    }
  } finally {
    await session.close();
  }
}

async function main() {
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
  need(!ids.has('lotr-grammar-quest-en'), 'manifest: redundantní lotr-grammar-quest-en se vrátil');
  need(!fs.existsSync(path.join(ROOT, 'engines', 'middle-earth-en.html')), 'engines: redundantní middle-earth-en.html se vrátil');

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
      for (const method of progressMethods) need(e.progressApi && Array.isArray(e.progressApi.methods) && e.progressApi.methods.includes(method), `manifest: ${e.id} progressApi chybí metoda ${method}`);
      for (const key of contractKeys) need(e.contract && Object.prototype.hasOwnProperty.call(e.contract, key), `manifest: ${e.id} contract chybí ${key}`);
      htmlFiles.push(e.file);
    }
  }

  need(read('README.md').includes(`Verze: **${VERSION}**`), 'README.md: nesedí verze');
  need(read('README_PWA.md').includes(`ghrab-ludus-v${VERSION}`), 'README_PWA.md: nesedí kanonická cache verze');
  need(read('public/sw.js').includes(`ghrab-ludus-v${VERSION}`), 'public/sw.js: nesedí kanonická cache verze');
  need(read('CHANGELOG.md').includes(`## ${VERSION}`), 'CHANGELOG.md: chybí aktuální verze');
  need(fs.existsSync(path.join(ROOT, 'LICENSE')), 'LICENSE: chybí');
  need(fs.existsSync(path.join(ROOT, 'docs', 'MEDIA_PROVENANCE.md')), 'docs/MEDIA_PROVENANCE.md: chybí');
  need(fs.existsSync(path.join(ROOT, 'media', 'registry.json')), 'media/registry.json: chybí registr médií');
  const mediaRegistry = JSON.parse(read('media/registry.json'));
  need(mediaRegistry.schemaVersion === 'ludus-media-registry-v2', 'media/registry.json: neznámá verze registru');
  need(mediaRegistry.policy?.defaultBuildProfile === 'unofficial', 'media/registry.json: veřejný výchozí profil musí být unofficial');
  need(mediaRegistry.policy?.officialBuild === 'private-owner-controlled-add-on', 'media/registry.json: official build musí být soukromý add-on');
  need(mediaRegistry.policy && mediaRegistry.policy.auditAction === 'preserve-private-registered-media-separate-from-public-release', 'media/registry.json: auditní politika musí registrovaná média zachovat a zabalit');
  need(mediaRegistry.policy && mediaRegistry.policy.removal === 'do-not-delete-owner-files; exclude from public artifacts without independent rights evidence', 'media/registry.json: odstranění média musí vyžadovat výslovný pokyn vlastníka');
  for (const [engineId, engineMedia] of Object.entries(mediaRegistry.engines || {})) {
    for (const [variant, variantMedia] of Object.entries(engineMedia.variants || {})) {
      for (const role of ['intro', 'soundtrack']) {
        const asset = variantMedia && variantMedia[role];
        if (!asset) continue;
        const assetPath = path.join(ROOT, asset.path || '');
        need(!!asset.path, `media: ${engineId}/${variant}/${role} chybí cesta`);
        if (fs.existsSync(assetPath)) {
          const bytes = fs.readFileSync(assetPath);
          const digest = crypto.createHash('sha256').update(bytes).digest('hex');
          need(digest === asset.sha256, `media: ${engineId}/${variant}/${role} nesedí SHA-256`);
          need(bytes.length === asset.bytes, `media: ${engineId}/${variant}/${role} nesedí velikost`);
        } else {
          need(asset.publishable === false, `media: chybějící ${engineId}/${variant}/${role} nesmí být označeno jako publikovatelné`);
          warn(`media: ${engineId}/${variant}/${role} — volitelný soubor není v aktuálním zdrojovém profilu přítomen`);
        }
        need(['owner-supplied-unverified','verified-owned','verified-licensed','public-domain','cc0'].includes(asset.rightsStatus), `media: ${engineId}/${variant}/${role} nemá povolený technický stav pro zabalení`);
      }
    }
  }

  const uniqueHtml = [...new Set(htmlFiles)];
  const sharedRuntime = read('runtime/ludus-engine-runtime.js');
  const sharedStyle = read('runtime/ludus-engine-badge.css');
  need(sharedRuntime.includes(`var VERSION='${VERSION}'`), 'runtime: nesedí verze společného standardního bloku');
  need(sharedRuntime.includes('window.LUDUS_I18N') && sharedRuntime.includes('ludusLangSwitch'), 'runtime: chybí jednotný přepínač CZ/EN a i18n API');
  need(sharedRuntime.includes("id='ludusBadge'") || sharedRuntime.includes('id=\"ludusBadge\"'), 'runtime: chybí tvorba #ludusBadge');
  need(/collectReport|downloadReport/.test(sharedRuntime), 'runtime: chybí report export');
  need(sharedRuntime.includes('if(mo)mo.disconnect()') && sharedRuntime.includes('mo.takeRecords()'), 'runtime: observer se při vlastním překladu neodpojuje');
  need(sharedRuntime.includes('ludus-engine-runtime-v1') && sharedRuntime.includes('ludus-engine-content-pack-v1'), 'runtime: chybí P3 obsahový a výkonový kontrakt');
  need(sharedStyle.includes('#ludusBadge') && sharedStyle.includes('#ludusLangSwitch') && sharedStyle.includes('prefers-reduced-motion'), 'runtime CSS: chybí společné ovládání nebo reduced-motion');
  try { new vm.Script(sharedRuntime, { filename: 'runtime/ludus-engine-runtime.js' }); }
  catch (error) { errors.push(`runtime/ludus-engine-runtime.js: JS syntax: ${error.message}`); }
  const standardHashes = new Set();
  for (const file of uniqueHtml) {
    const rel = 'engines/' + file;
    const txt = read(rel);
    need(txt.includes('LUDUS STANDARD BLOCK START'), `${rel}: chybí standardní LUDUS blok`);
    need(txt.includes(`LUDUS STANDARD BLOCK START v${VERSION}`), `${rel}: standardní blok nemá verzi ${VERSION}`);
    need(txt.includes('href="../runtime/ludus-engine-badge.css"'), `${rel}: chybí společný styl enginu`);
    need(txt.includes('src="../runtime/ludus-engine-runtime.js"'), `${rel}: chybí společný runtime enginu`);
    need(txt.includes(`data-ludus-shared-runtime="${VERSION}"`), `${rel}: runtime reference nemá verzi ${VERSION}`);
    need(/teacher=1/.test(txt), `${rel}: chybí ?teacher=1`);
    need(!/AIza[0-9A-Za-z_\-]{20,}/.test(txt), `${rel}: podezření na hardcoded Gemini API key`);
    need(!/(if|while|switch)\s*\([^)]*Daniel\s+Bal[aá]ž[^)]*\)/i.test(txt), `${rel}: podezření na starou aktivaci učitele jménem`);
    need(fs.statSync(path.join(ROOT, rel)).size < 500 * 1024, `${rel}: zdrojový engine překračuje limit 500 kB; média patří do media/`);
    need((txt.match(/'ZAHÁJIT VÝPRAVU':/g) || []).length <= 1, `${rel}: duplicitní překladový klíč ZAHÁJIT VÝPRAVU`);
    need(!txt.includes('setTimeout(function(){translateChrome(currentLang);},0)'), `${rel}: vrátila se neomezená překladová smyčka`);
    if (file === 'hogwarts.html') {
      need(txt.includes('data-ludus-src-official="../media/hogwarts/official/intro.mp4"'), 'hogwarts.html: chybí registrované oficiální intro');
      need(txt.includes('data-ludus-src-official="../media/hogwarts/official/soundtrack.mp3"'), 'hogwarts.html: chybí registrovaný oficiální soundtrack');
      need(txt.includes('function applyThemeMedia'), 'hogwarts.html: chybí přepínání médií podle varianty');
    }

    const escapedVersion = VERSION.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const block = txt.match(new RegExp(`<!-- LUDUS STANDARD BLOCK START v${escapedVersion} -->([\\s\\S]*?)<!-- LUDUS STANDARD BLOCK END v${escapedVersion} -->`));
    if (block) standardHashes.add(crypto.createHash('sha256').update(block[1]).digest('hex'));

    const scripts = [...txt.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)];
    scripts.forEach((match, index) => {
      const attrs = match[1] || '';
      if (/type\s*=\s*["'](?:application\/json|importmap|text\/plain)/i.test(attrs)) return;
      const js = match[2].replace(/<\\\//g, '</');
      try { new vm.Script(js, { filename: `${rel}#script${index + 1}` }); }
      catch (error) { errors.push(`${rel}: JS syntax script ${index + 1}: ${error.message}`); }
    });
  }
  need(standardHashes.size === 1, `engines: společný standardní blok není shodný ve všech enginech (${standardHashes.size} variant)`);

  const src = read('src/index.html');
  need(fs.existsSync(path.join(ROOT, 'public', 'manual', 'index.html')), 'public/manual/index.html: chybí interaktivní manuál');
  need(src.includes('manual-launch-btn') && src.includes('./manual/'), 'src/index.html: chybí tlačítko interaktivního manuálu');
  const manualHtml = read('public/manual/index.html');
  need(manualHtml.includes('data-ghrab-access-bootstrap') && /const APP_ID=['\"]ludus['\"]/.test(manualHtml) && manualHtml.includes('deployment-config.js'), 'LUDUS manuál: chybí konfigurovatelná zděděná přístupová ochrana');
  need(manualHtml.includes('prefers-reduced-motion'), 'LUDUS manuál: chybí prefers-reduced-motion');
  need(src.includes('const TEMPLATE_LIBRARY'), 'src/index.html: chybí TEMPLATE_LIBRARY');
  need(src.includes('templateSelect'), 'src/index.html: chybí UI pro knihovnu šablon');
  need(src.includes('applyTemplate'), 'src/index.html: chybí applyTemplate');
  need(src.includes(`const APP_VERSION='${VERSION}'`), `src/index.html: APP_VERSION není ${VERSION}`);
  need(src.includes('function engineCanBuild'), 'src/index.html: chybí oddělení stavu enginu od kompatibility exportu');
  need(src.includes('builderCompatible'), 'src/index.html: builderCompatible se nepoužívá');
  need(src.includes('.card.in-progress'), 'src/index.html: chybí zvýraznění rozpracovaných her');
  need(src.includes('function engineCardClass'), 'src/index.html: chybí oddělení vizuálního stavu karty');
  need(src.includes('data-back-step="0"') && src.includes('data-back-step="1"'), 'src/index.html: chybí tlačítka Zpět v krocích Svět/Obsah');
  need(!/AIza[0-9A-Za-z_\-]{20,}/.test(src), 'src/index.html: podezření na hardcoded Gemini API key');
  need(src.includes("fetch(eng.engine,{cache:'no-cache'})"), 'src/index.html: engine se neověřuje proti aktuální cache');
  need(src.includes("new DOMParser().parseFromString(exportEngine,'text/html')"), 'src/index.html: export nevkládá obsah přes DOMParser');
  need(!src.includes("exportEngine.replace('<head>'"), 'src/index.html: vrátila se křehká náhrada <head>');
  need(src.includes("role=\"status\" aria-live=\"polite\""), 'src/index.html: toast není oznámen čtečkám');
  need(src.includes("'BAD_JSON'"), 'src/index.html: chybí srozumitelná chyba neplatného JSON od modelu');
  need(src.includes('Trvalé ukládání klíče bylo v P1 odstraněno') && !src.includes('localStorage.setItem(G_KEY_SK'), 'src/index.html: klíč poskytovatele nesmí být trvale ukládán');
  need(src.includes("document.readyState==='complete')registerLudusServiceWorker()"), 'src/index.html: service worker není bezpečný vůči pozdnímu spuštění skriptů');
  need(src.includes('async function inlineLudusMedia'), 'src/index.html: chybí vkládání médií do offline exportu');
  need(src.includes('inline-selected-variant') || read('media/registry.json').includes('inline-selected-variant'), 'media: chybí pravidlo exportu vybrané varianty');

  const srcScripts = [...src.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)];
  srcScripts.forEach((match, index) => {
    const attrs = match[1] || '';
    if (/type\s*=\s*["'](?:application\/json|importmap|text\/plain)/i.test(attrs)) return;
    const js = match[2].replace(/<\\\//g, '</');
    try { new vm.Script(js, { filename: `src/index.html#script${index + 1}` }); }
    catch (error) { errors.push(`src/index.html: JS syntax script ${index + 1}: ${error.message}`); }
  });

  const webManifest = JSON.parse(read('public/manifest.webmanifest'));
  need(webManifest.id === '/Ludus/', 'manifest.webmanifest: chybí stabilní id /Ludus/');
  need(webManifest.orientation !== 'portrait-primary', 'manifest.webmanifest: PWA je nevhodně uzamčena na výšku');
  const sw = read('public/sw.js');
  need(/request\.mode\s*===\s*['\"]navigate['\"]/.test(sw), 'public/sw.js: navigační fallback není omezen na navigace');
  need(sw.includes('Promise.allSettled'), 'public/sw.js: volitelné assety nejsou cachovány best-effort');

  const validateWorkflow = read('.github/workflows/validate.yml');
  const deployWorkflow = read('.github/workflows/deploy.yml');
  const syncCoreWorkflow = read('.github/workflows/sync-ghrab-ai-core.yml');
  need(validateWorkflow.includes('npm ci') && validateWorkflow.includes('npm test'), '.github/workflows/validate.yml: chybí npm ci / npm test');
  need(deployWorkflow.includes('npm ci') && deployWorkflow.includes('npm test'), '.github/workflows/deploy.yml: nasazení není blokováno testy');
  for (const [workflowPath, workflow] of [
    ['.github/workflows/validate.yml', validateWorkflow],
    ['.github/workflows/deploy.yml', deployWorkflow],
    ['.github/workflows/sync-ghrab-ai-core.yml', syncCoreWorkflow],
  ]) {
    const browserInstallPosition = workflow.indexOf('playwright install --with-deps chromium');
    const applicationTestPosition = workflow.indexOf('run: npm test');
    need(
      browserInstallPosition >= 0 && applicationTestPosition >= 0 && browserInstallPosition < applicationTestPosition,
      `${workflowPath}: Playwright Chromium musí být nainstalován a CHROMIUM_PATH nastaven před npm test`,
    );
  }

  // Centrální přístup: nasazená dílna i každý engine musí být fail-closed.
  const distMediaRegistry = JSON.parse(read('dist/media/registry.json'));
  const distMediaProfile = distMediaRegistry.release?.profile;
  need(['unofficial', 'official'].includes(distMediaProfile), 'dist/media: chybí známý release profil');
  const distIntro = path.join(ROOT, 'dist', 'media', 'hogwarts', 'official', 'intro.mp4');
  const distSoundtrack = path.join(ROOT, 'dist', 'media', 'hogwarts', 'official', 'soundtrack.mp3');
  if (distMediaProfile === 'unofficial') {
    need(!fs.existsSync(distIntro), 'dist/media: media-free profil nesmí obsahovat Bradavické intro');
    need(!fs.existsSync(distSoundtrack), 'dist/media: media-free profil nesmí obsahovat Bradavický soundtrack');
    need(distMediaRegistry.release?.optionalMediaExcluded === true, 'dist/media: media-free profil nehlásí vyloučení volitelných médií');
  } else {
    need(fs.existsSync(distIntro), 'dist/media: official profil postrádá schválené Bradavické intro');
    need(fs.existsSync(distSoundtrack), 'dist/media: official profil postrádá schválený Bradavický soundtrack');
    need(distMediaRegistry.release?.includedOfficialMedia === true, 'dist/media: official profil nehlásí zahrnutá média');
  }
  const distIndex = read('dist/index.html');
  need(/data-ghrab-access="checking"/.test(distIndex), 'dist/index.html: chybí fail-closed stav');
  need(distIndex.includes('deployment-config.js') && distIndex.includes('urls.guardUrl'), 'dist/index.html: chybí konfigurovatelný centrální app-guard');
  need(distIndex.includes('const APP_ID="ludus"') || distIndex.includes("const APP_ID='ludus'"), 'dist/index.html: nesedí app ID ludus');
  need((distIndex.match(/application\/ghrab-protected/g) || []).length >= 2, 'dist/index.html: aplikační skripty nejsou inertní');
  const classFunctionsPos = distIndex.indexOf('/*__CLASS_FUNCS__*/');
  const accessBootstrapTag = '<script type="module" data-ghrab-access-bootstrap>';
  const accessBootstrapPos = distIndex.indexOf(accessBootstrapTag);
  const finalBodyClosePos = distIndex.toLowerCase().lastIndexOf('</body>');
  need(classFunctionsPos >= 0, 'dist/index.html: chybí funkce exportu třídního kvízu');
  need(accessBootstrapPos > classFunctionsPos, 'dist/index.html: přístupový bootstrap byl vložen dovnitř exportní HTML šablony');
  need(finalBodyClosePos > accessBootstrapPos, 'dist/index.html: přístupový bootstrap není před koncovým </body> hlavního dokumentu');
  need(distIndex.indexOf(accessBootstrapTag, accessBootstrapPos + 1) === -1, 'dist/index.html: přístupový bootstrap musí být vložen právě jednou');
  need(src.includes('function stripDeploymentAccessGate'), 'src/index.html: chybí odstranění brány ze studentského exportu');
  need(src.includes('const exportEngine=stripDeploymentAccessGate(engine)'), 'src/index.html: export nepoužívá očištěný engine');
  for (const file of uniqueHtml) {
    const deployed = read('dist/engines/' + file);
    need(/data-ghrab-access="checking"/.test(deployed), `dist/engines/${file}: chybí fail-closed stav`);
    need(deployed.includes('deployment-config.js') && deployed.includes('urls.guardUrl'), `dist/engines/${file}: chybí konfigurovatelný centrální guard`);
    need((deployed.match(/application\/ghrab-protected/g) || []).length >= 1, `dist/engines/${file}: skripty nejsou inertní`);
    const student = stripStudioProtection(deployed);
    need(!/data-ghrab-access-bootstrap|application\/ghrab-protected|access-gate\.css/.test(student), `dist/engines/${file}: ochranu nelze bezpečně odstranit pro export`);
    need(/<script(?:\s|>)/i.test(student), `dist/engines/${file}: po očištění chybí spustitelný studentský skript`);
    if(file==='stranger-things.html'){
      need(deployed.includes('document.readyState==="loading"') && deployed.includes('else startEscapeEngine()'), 'dist/engines/stranger-things.html: pozdní aktivace po guardu musí spustit engine i po DOMContentLoaded');
    }
  }

  // Chování dílny, exportu a reprezentativního enginu v reálném Chromiu.
  const representative = `<!doctype html><html lang="cs" data-ludus-engine-id="runtime-probe" data-ludus-media-profile="safe"><head><meta charset="utf-8"><style>${sharedStyle}</style><style>${read('runtime/ludus-engine-controls.css')}</style></head><body><main><h1>Legenda o draku</h1><p>Zbývají 3 životy</p></main><div class="ludus-owner-footer" aria-label="Vlastnické označení aplikace"><span>Vlastník aplikace: Daniel Baláž · Gymnázium, Ostrava-Hrabůvka · © 2026 Daniel Baláž. Všechna práva vyhrazena.</span></div><script>(function(){${sharedRuntime.replace(/<\/script/gi, '<\\/script')}\n})();</script></body></html>`;
  try {
    await runChromiumBehaviorChecks({ src: stripStudioProtection(distIndex), representative, need, errors });
  } catch (error) {
    errors.push(`Chromium behavior validation: ${error.stack || error.message}`);
  }

  if (errors.length) {
    console.error('❌ LUDUS validation failed');
    for (const error of errors) console.error(' - ' + error);
    process.exit(1);
  }
  if (warnings.length) {
    console.warn('⚠️  LUDUS validation warnings');
    for (const warning of warnings) console.warn(' - ' + warning);
  }
  console.log('✅ LUDUS validation OK');
  console.log(`   manifest records: ${manifest.engines.length}`);
  console.log(`   html engines checked: ${uniqueHtml.length}`);
  console.log('   in-app behavior: PASS');
  console.log('   engine idle/i18n behavior: PASS');
  console.log(`   version: ${VERSION}`);
  process.exit(0);
}

main().catch(error => {
  console.error('❌ LUDUS validation crashed');
  console.error(error);
  process.exit(1);
});
