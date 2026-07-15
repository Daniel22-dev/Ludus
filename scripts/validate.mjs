import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { JSDOM, VirtualConsole } from 'jsdom';
import { stripStudioProtection } from './access-protection.mjs';

const ROOT = path.resolve('.');
const VERSION = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
const errors = [];
const warnings = [];
const warn = msg => warnings.push(msg);
const need = (ok, msg) => { if (!ok) errors.push(msg); };
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function domOptions(url = 'https://ludus.test/') {
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', () => {});
  return {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url,
    virtualConsole,
    beforeParse(window) {
      window.fetch = async () => ({ ok: false, status: 404, text: async () => '', json: async () => ({}) });
      window.matchMedia = window.matchMedia || (() => ({
        matches: false,
        addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}
      }));
      window.alert = () => {};
      window.confirm = () => true;
      window.prompt = () => '';
      window.URL.createObjectURL = () => 'blob:ludus-test';
      window.URL.revokeObjectURL = () => {};
      Object.defineProperty(window.navigator, 'clipboard', { value: { writeText: async () => {} }, configurable: true });
      Object.defineProperty(window.navigator, 'serviceWorker', { value: { register: async () => ({}) }, configurable: true });
      window.AudioContext = class {
        constructor() { this.destination = {}; this.currentTime = 0; }
        createOscillator() { return { connect() {}, start() {}, stop() {}, frequency: { setValueAtTime() {} }, type: '' }; }
        createGain() { return { connect() {}, gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} } }; }
      };
      window.webkitAudioContext = window.AudioContext;
    }
  };
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
  need(read('README_PWA.md').includes(`ludus-pwa-v${VERSION}`), 'README_PWA.md: nesedí cache verze');
  need(read('public/sw.js').includes(`ludus-pwa-v${VERSION}`), 'public/sw.js: nesedí cache verze');
  need(read('CHANGELOG.md').includes(`## ${VERSION}`), 'CHANGELOG.md: chybí aktuální verze');
  need(fs.existsSync(path.join(ROOT, 'LICENSE')), 'LICENSE: chybí');
  need(fs.existsSync(path.join(ROOT, 'docs', 'MEDIA_PROVENANCE.md')), 'docs/MEDIA_PROVENANCE.md: chybí');
  need(fs.existsSync(path.join(ROOT, 'media', 'registry.json')), 'media/registry.json: chybí registr médií');
  const mediaRegistry = JSON.parse(read('media/registry.json'));
  need(mediaRegistry.schemaVersion === 'ludus-media-registry-v1', 'media/registry.json: neznámá verze registru');
  need(mediaRegistry.policy && mediaRegistry.policy.auditAction === 'preserve-registered-media', 'media/registry.json: auditní politika musí chránit registrovaná média před automatickým smazáním');
  need(mediaRegistry.policy && mediaRegistry.policy.removal === 'only-on-explicit-owner-instruction', 'media/registry.json: odstranění média musí vyžadovat výslovný pokyn vlastníka');
  for (const [engineId, engineMedia] of Object.entries(mediaRegistry.engines || {})) {
    for (const [variant, variantMedia] of Object.entries(engineMedia.variants || {})) {
      for (const role of ['intro', 'soundtrack']) {
        const asset = variantMedia && variantMedia[role];
        if (!asset) continue;
        const assetPath = path.join(ROOT, asset.path || '');
        need(!!asset.path && fs.existsSync(assetPath), `media: ${engineId}/${variant}/${role} soubor neexistuje`);
        if (fs.existsSync(assetPath)) {
          const bytes = fs.readFileSync(assetPath);
          const digest = crypto.createHash('sha256').update(bytes).digest('hex');
          need(digest === asset.sha256, `media: ${engineId}/${variant}/${role} nesedí SHA-256`);
          need(bytes.length === asset.bytes, `media: ${engineId}/${variant}/${role} nesedí velikost`);
        }
        if (asset.rightsStatus !== 'verified') warn(`media: ${engineId}/${variant}/${role} — práva nejsou technickým auditem ověřena; médium bylo zachováno podle politiky registru`);
      }
    }
  }

  const uniqueHtml = [...new Set(htmlFiles)];
  const standardHashes = new Set();
  for (const file of uniqueHtml) {
    const rel = 'engines/' + file;
    const txt = read(rel);
    need(txt.includes('LUDUS STANDARD BLOCK START'), `${rel}: chybí standardní LUDUS blok`);
    need(txt.includes('LUDUS STANDARD BLOCK START v1.16.0'), `${rel}: standardní blok nemá verzi 1.16.0`);
    need(txt.includes('ludusLangSwitch') && txt.includes('window.LUDUS_I18N'), `${rel}: chybí jednotný přepínač CZ/EN`);
    need(txt.includes('id="ludusBadge"') || txt.includes("id='ludusBadge'"), `${rel}: chybí #ludusBadge`);
    need(/teacher=1/.test(txt), `${rel}: chybí ?teacher=1`);
    need(/collectReport|downloadReport/.test(txt), `${rel}: chybí report export`);
    need(!/AIza[0-9A-Za-z_\-]{20,}/.test(txt), `${rel}: podezření na hardcoded Gemini API key`);
    need(!/(if|while|switch)\s*\([^)]*Daniel\s+Bal[aá]ž[^)]*\)/i.test(txt), `${rel}: podezření na starou aktivaci učitele jménem`);
    need(fs.statSync(path.join(ROOT, rel)).size < 500 * 1024, `${rel}: zdrojový engine překračuje limit 500 kB; média patří do media/`);
    need((txt.match(/'ZAHÁJIT VÝPRAVU':/g) || []).length <= 1, `${rel}: duplicitní překladový klíč ZAHÁJIT VÝPRAVU`);
    need(!txt.includes('setTimeout(function(){translateChrome(currentLang);},0)'), `${rel}: vrátila se neomezená překladová smyčka`);
    need(txt.includes('if(mo)mo.disconnect()') && txt.includes('mo.takeRecords()'), `${rel}: observer se při vlastním překladu neodpojuje`);
    if (file === 'hogwarts.html') {
      need(txt.includes('data-ludus-src-official="../media/hogwarts/official/intro.mp4"'), 'hogwarts.html: chybí registrované oficiální intro');
      need(txt.includes('data-ludus-src-official="../media/hogwarts/official/soundtrack.mp3"'), 'hogwarts.html: chybí registrovaný oficiální soundtrack');
      need(txt.includes('function applyThemeMedia'), 'hogwarts.html: chybí přepínání médií podle varianty');
    }

    const block = txt.match(/<!-- LUDUS STANDARD BLOCK START v1\.16\.0 -->([\s\S]*?)<!-- LUDUS STANDARD BLOCK END v1\.16\.0 -->/);
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
  need(manualHtml.includes('data-ghrab-access-bootstrap') && manualHtml.includes('const APP_ID="ludus"'), 'LUDUS manuál: chybí zděděná přístupová ochrana');
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
  need(src.includes('Trvalé uložení není vhodné na sdíleném školním počítači'), 'src/index.html: trvalé uložení klíče nemá výslovné varování');
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
  need(sw.includes("request.mode === 'navigate'"), 'public/sw.js: navigační fallback není omezen na navigace');
  need(sw.includes('Promise.allSettled'), 'public/sw.js: volitelné assety nejsou cachovány best-effort');

  const validateWorkflow = read('.github/workflows/validate.yml');
  const deployWorkflow = read('.github/workflows/deploy.yml');
  need(validateWorkflow.includes('npm ci') && validateWorkflow.includes('npm test'), '.github/workflows/validate.yml: chybí npm ci / npm test');
  need(deployWorkflow.includes('npm ci') && deployWorkflow.includes('npm test'), '.github/workflows/deploy.yml: nasazení není blokováno testy');

  // Centrální přístup: nasazená dílna i každý engine musí být fail-closed.
  need(fs.existsSync(path.join(ROOT, 'dist', 'media', 'hogwarts', 'official', 'intro.mp4')), 'dist/media: chybí Bradavické intro');
  need(fs.existsSync(path.join(ROOT, 'dist', 'media', 'hogwarts', 'official', 'soundtrack.mp3')), 'dist/media: chybí Bradavický soundtrack');
  const distIndex = read('dist/index.html');
  need(/data-ghrab-access="checking"/.test(distIndex), 'dist/index.html: chybí fail-closed stav');
  need(distIndex.includes('/AI-Studio-GHRAB/access/app-guard.js'), 'dist/index.html: chybí centrální app-guard');
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
    need(deployed.includes('/AI-Studio-GHRAB/access/app-guard.js'), `dist/engines/${file}: chybí centrální guard`);
    need((deployed.match(/application\/ghrab-protected/g) || []).length >= 1, `dist/engines/${file}: skripty nejsou inertní`);
    const student = stripStudioProtection(deployed);
    need(!/data-ghrab-access-bootstrap|application\/ghrab-protected|access-gate\.css/.test(student), `dist/engines/${file}: ochranu nelze bezpečně odstranit pro export`);
    need(/<script(?:\s|>)/i.test(student), `dist/engines/${file}: po očištění chybí spustitelný studentský skript`);
  }

  // Chování dílny v DOM: self-testy, přesná mechanika a skutečně vygenerovaný třídní kvíz.
  let builderDom;
  try {
    builderDom = new JSDOM(src, domOptions());
    await sleep(900);
    const rows = typeof builderDom.window.selfTests === 'function' ? builderDom.window.selfTests() : [];
    need(rows.length >= 30, `in-app self-testy: očekáváno alespoň 30 testů, nalezeno ${rows.length}`);
    for (const row of rows.filter(item => !item.pass)) errors.push(`in-app self-test selhal: ${row.name} — ${row.detail}`);

    const mismatches = [
      ['arcanum', 'quest'], ['arcanum', 'escape'], ['arcanum', 'lab'], ['knights', 'quest'], ['sundered', 'academy']
    ];
    for (const [skin, mechanic] of mismatches) {
      need(builderDom.window.getGameEngine(skin, mechanic) === null, `getGameEngine: ${skin}+${mechanic} vrací cizí engine`);
    }

    const tasks = [{ prompt: 'Otázka', options: ['A', 'B'], answer: 'A', explain: 'Vysvětlení', block: 'select', clue: 'Pravidlo' }];
    const quiz = builderDom.window.buildClassQuizHtml('Test', 'Podtitul', 'Svět', '#123456', {}, tasks);
    const textareaSource = quiz.match(/<textarea id="teamNames">([\s\S]*?)<\/textarea>/)?.[1] || '';
    need(textareaSource === 'Tým 1\\nTým 2\\nTým 3', 'třídní kvíz: generovaný skript nemá bezpečné escapované konce řádků');
    need(quiz.includes(".split(/\\r?\\n+/)"), 'třídní kvíz: týmy se nedělí podle konců řádků');

    const quizDom = new JSDOM(quiz, domOptions('https://ludus.test/class-quiz.html'));
    await sleep(80);
    const teamInput = quizDom.window.document.querySelector('#teamNames');
    if (teamInput) teamInput.value = 'Alfa\nBeta\nGama';
    quizDom.window.document.querySelector('#startGame')?.click();
    await sleep(20);
    need(quizDom.window.document.querySelectorAll('.team').length === 3, 'třídní kvíz: tři řádky nevytvořily tři týmy');
  } catch (error) {
    errors.push(`behavior test dílny: ${error.stack || error.message}`);
  }

  // Offline export: vybraná mediální varianta se vloží do HTML a druhá varianta se odstraní.
  try {
    const mediaDoc = new builderDom.window.DOMParser().parseFromString('<!doctype html><html><body><video><source data-ludus-media="intro" data-ludus-src-official="../media/test.mp4" data-ludus-src-safe="../media/safe.mp4" type="video/mp4"></video></body></html>', 'text/html');
    const oldFetch = builderDom.window.fetch;
    builderDom.window.fetch = async url => ({ ok: true, status: 200, blob: async () => new builderDom.window.Blob([String(url)], { type: 'video/mp4' }) });
    await builderDom.window.inlineLudusMedia(mediaDoc, 'engines/hogwarts.html', 'official');
    builderDom.window.fetch = oldFetch;
    const mediaSource = mediaDoc.querySelector('source');
    need(/^data:video\/mp4;base64,/i.test(mediaSource.getAttribute('src') || ''), 'media export: oficiální médium nebylo vloženo jako data URL');
    need(!mediaSource.hasAttribute('data-ludus-src-safe'), 'media export: do oficiálního exportu pronikla safe varianta');
    need(mediaDoc.documentElement.getAttribute('data-ludus-media-export') === 'embedded-official', 'media export: chybí značka vložené varianty');

    const safeDoc = new builderDom.window.DOMParser().parseFromString('<!doctype html><html><body><audio><source data-ludus-media="soundtrack" data-ludus-src-official="../media/official.mp3" data-ludus-src-safe="" type="audio/mpeg"></audio></body></html>', 'text/html');
    await builderDom.window.inlineLudusMedia(safeDoc, 'engines/hogwarts.html', 'safe');
    const safeSource = safeDoc.querySelector('source');
    need(!safeSource.hasAttribute('src'), 'media export: prázdná safe varianta nemá obsahovat oficiální soundtrack');
    need(!safeSource.hasAttribute('data-ludus-src-official'), 'media export: safe export obsahuje odkaz na oficiální médium');
    need(safeDoc.documentElement.getAttribute('data-ludus-media-export') === 'embedded-safe', 'media export: chybí značka safe varianty');
  } catch (error) {
    errors.push(`behavior test médií: ${error.stack || error.message}`);
  }

  // Chování společného standardního bloku: jeden reprezentativní engine stačí,
  // protože výše je ověřena bajtová shoda bloku ve všech enginech.
  try {
    const representative = read('engines/laughworks.html');
    const engineDom = new JSDOM(representative, domOptions('https://ludus.test/engines/laughworks.html'));
    await sleep(1100);
    const footer = engineDom.window.document.querySelector('.ludus-owner-footer');
    let mutations = 0;
    const observer = new engineDom.window.MutationObserver(() => { mutations++; });
    if (footer) observer.observe(footer, { childList: true, subtree: true, characterData: true });
    await sleep(500);
    observer.disconnect();
    need(!!footer, 'engine behavior: chybí vlastnický footer');
    need(mutations === 0, `engine behavior: footer se v klidu přepsal ${mutations}× za 0,5 s`);

    const i18n = engineDom.window.LUDUS_I18N;
    need(!!i18n && typeof i18n.setLanguage === 'function', 'engine behavior: LUDUS_I18N není dostupné');
    if (i18n) {
      need(i18n.translateString('Legenda o draku', 'en', 'cs') === 'Legend of the dragon', 'i18n: Legenda o draku se překládá neúplně');
      need(i18n.translateString('Zbývají 3 životy', 'en', 'cs') === '3 lives remaining', 'i18n: dynamický počet životů se překládá neúplně');
      need(i18n.translateString('5 chyb v souboji', 'en', 'cs') === '5 mistakes in battle', 'i18n: dynamický počet chyb se překládá chybně');
      const probe = engineDom.window.document.createElement('div');
      probe.textContent = 'Mapa kobky';
      engineDom.window.document.body.appendChild(probe);
      await sleep(40);
      i18n.setLanguage('en');
      await sleep(80);
      i18n.setLanguage('cs');
      await sleep(80);
      need(probe.textContent === 'Mapa kobky', `i18n: CZ → EN → CZ nevrátilo původní text (${probe.textContent})`);
    }
  } catch (error) {
    errors.push(`behavior test enginu: ${error.stack || error.message}`);
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
