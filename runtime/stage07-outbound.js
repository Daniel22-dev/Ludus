/* E7 LUDUS outbound: pedagogical Material v1 only. Game runtime stays in LUDUS.
 * Dynamically loaded ONLY after a teacher chooses the export action.
 * No keys, scoreboards, team state, skins or engines are serialized.
 */
(function (global) {
  'use strict';
  const MAX_BYTES = 450000;
  const MAX_TEXT = 180000;
  const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
  const ACTIVE = /<\s*(?:script|iframe|object|embed|img|video|audio|source|svg)\b|\bon\w+\s*=|javascript\s*:|\bdata\s*:/i;
  const NONPORTABLE = /\[\[(?:VISUAL_\d+|MEDIA_SOURCE)\]\]|!\[[^\]]*\]\([^)]*\)|\bblob:|https?:\/\/\S+\.(?:mp[34]|wav|webm|mov|png|jpe?g|svg|gif|webp)\b/i;
  const ROOTS = new Set(['/AI-Studio-GHRAB/', '/ai-studio/']);
  const KEEP_LEVEL = /^(A1|A2|B1|B2|C1|C2)$/;
  const LIMIT = Object.freeze({ tasks: 250, prompt: 6000, option: 2000, explanation: 12000 });
  function reject(code) { const error = new Error(code); error.code = code; throw error; }
  function string(v, max, required) {
    if (typeof v !== 'string') { if (required) reject('INVALID_TEXT'); return ''; }
    const value = v.trim();
    if (value.length > max) reject('OVERSIZED_TEXT');
    if (required && !value) reject('MISSING_TEXT');
    if (EMAIL.test(value) || ACTIVE.test(value) || NONPORTABLE.test(value)) reject('PRIVATE_OR_ACTIVE_CONTENT');
    return value;
  }
  function cleanOption(v) { return string(v, LIMIT.option, true); }
  function candidateQuestion(type, ex, q, stationNo, n) {
    if (!q || typeof q !== 'object' || Array.isArray(q)) return null;
    let prompt = string(q.t || ex.inst || '', LIMIT.prompt, true);
    if (q.inst && q.t) prompt = string(q.inst + ' — ' + q.t, LIMIT.prompt, true);
    const exp = string(q.exp || '', LIMIT.explanation, false);
    const id = `ludus-s${stationNo}-q${n}`;
    // Difficulty is game/runtime metadata unless an independently reviewed pedagogical
    // difficulty exists. Never fabricate a CEFR/1–3 difficulty from a game mechanic.
    const base = { id, prompt, explanation: exp };
    if (type === 'mc4' || type === 'mc2' || type === 'mixed' || type === 'classify' || type === 'yesno') {
      const raw = type === 'classify' ? ex.opts : type === 'yesno' ? (ex.opts || ['YES', 'NO']) : q.opts;
      if (!Array.isArray(raw) || raw.length < 2 || raw.length > 30) return null;
      const options = raw.map(cleanOption);
      if (new Set(options).size !== options.length) return null;
      const answer = q.a;
      if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) return null;
      // A two-choice MC game is not automatically a true/false question.
      // Keep yes/no or true/false semantics only for literal boolean alternatives.
      const booleanPair = options.length === 2 &&
        ((/^(true|yes|ano|pravda)$/i.test(options[0]) && /^(false|no|ne|nepravda)$/i.test(options[1])) ||
         (/^(false|no|ne|nepravda)$/i.test(options[0]) && /^(true|yes|ano|pravda)$/i.test(options[1])));
      if ((type === 'mc2' || type === 'yesno') && booleanPair) return { ...base, type: 'truefalse', options, answer };
      return { ...base, type: 'select', options, answer };
    }
    if (type === 'wordbank') {
      const answer = string(q.a || '', LIMIT.option, true);
      // A truncated word bank changes the pedagogical task; omit instead of losing items silently.
      if (q.bank != null && (!Array.isArray(q.bank) || q.bank.length > 30)) return null;
      const bank = Array.isArray(q.bank) ? q.bank.map(cleanOption) : [];
      if (new Set(bank).size !== bank.length) return null;
      return { ...base, type: 'short', options: bank, answer };
    }
    if (type === 'order') {
      // Do not infer order from engine mechanics. Explicit ordered answers only.
      if (!Array.isArray(q.a) || !Array.isArray(q.opts) || q.opts.length < 2 || q.opts.length > 30) return null;
      const options = q.opts.map(cleanOption);
      const answer = q.a.map(cleanOption);
      // Exact bijection: nonunique items or a missing/extra response would be lossy.
      if (new Set(options).size !== options.length || new Set(answer).size !== answer.length ||
          answer.length !== options.length || new Set([...options, ...answer]).size !== options.length)
        return null;
      return { ...base, type: 'order', options, answer };
    }
    return null;
  }
  function mapPackToMaterial({pack, topic, subject, objectives = [], level = '', yearGroup = '',
    id, now, appVersion = '1.16.32', privacyConfirmed = false} = {}) {
    if (privacyConfirmed !== true) reject('ANONYMITY_NOT_CONFIRMED');
    if (!pack || pack.schema !== 1 || !Array.isArray(pack.stations)) reject('INVALID_LUDUS_PACK');
    if (!/^ludus-[0-9a-f-]{36}$/i.test(id || '')) reject('INVALID_ID');
    if (!Number.isFinite(Date.parse(now || ''))) reject('INVALID_DATE');
    if (!/^\d+\.\d+\.\d+$/.test(appVersion)) reject('INVALID_APP_VERSION');
    const title = string(topic, 240, true);
    const schoolSubject = string(subject, 160, true);
    if (!Array.isArray(objectives)) reject('INVALID_OBJECTIVES');
    if (objectives.length > 40) reject('OBJECTIVES_LIMIT');
    const goals = objectives.map(v => string(v, 800, true));
    const warnings = [];
    const tasks = [];
    const stations = pack.stations;
    const cappedStations = stations.slice(0, LIMIT.tasks);
    if (stations.length !== cappedStations.length) warnings.push('station-limit');
    for (let i = 0; i < cappedStations.length; i++) {
      const station = cappedStations[i];
      if (!station || typeof station !== 'object') { warnings.push(`station-${i + 1}-invalid`); continue; }
      const ex = station.ex;
      if (!ex || typeof ex !== 'object' || !Array.isArray(ex.qs)) { warnings.push(`station-${i + 1}-unsupported-mechanic`); continue; }
      const type = ex.type;
      if (pack.meta?.sourceMaterialId && type === 'wordbank') warnings.push('incoming-order-may-be-flattened');
      if (!['mc4', 'mc2', 'mixed', 'classify', 'yesno', 'wordbank', 'order'].includes(type)) {
        warnings.push(`station-${i + 1}-unsupported-${String(type).replace(/[^a-z0-9_-]/gi, '').slice(0, 24)}`);
        continue;
      }
      for (let j = 0; j < Math.min(ex.qs.length, LIMIT.tasks); j++) {
        if (tasks.length >= LIMIT.tasks) { warnings.push('task-limit'); break; }
        const result = candidateQuestion(type, ex, ex.qs[j], i + 1, j + 1);
        if (result) tasks.push(result);
        else warnings.push(`station-${i + 1}-question-${j + 1}-unsupported`);
      }
      if (ex.qs.length > LIMIT.tasks) warnings.push(`station-${i + 1}-question-limit`);
    }
    if (pack.boss || pack.finalChallenge) warnings.push('final-challenge-not-exported');
    // All game-specific fields are explicitly excluded, regardless of their contents.
    warnings.push('game-world-engine-skin-and-team-runtime-not-exported');
    if (!tasks.length) reject('NO_PORTABLE_TASKS');
    const sourceText = tasks.map((t, i) => `${i + 1}. ${t.prompt}`).join('\n');
    if (sourceText.length > MAX_TEXT) reject('MATERIAL_OVERSIZED');
    const material = {
      schema: 'ghrab-material-v1', id, version: 1, title, subject: schoolSubject,
      objectives: goals,
      content: { sourceText, tasks, vocabulary: [] },
      quality: { status: 'ai-draft' },
      provenance: { sourceAppId: 'ludus', sourceAppVersion: appVersion,
        createdAt: now, updatedAt: now, containsPersonalData: false },
    };
    if (KEEP_LEVEL.test(level)) material.level = level;
    if (yearGroup) material.yearGroup = string(yearGroup, 120, false);
    const serialized = JSON.stringify(material);
    if (EMAIL.test(serialized) || ACTIVE.test(serialized) || NONPORTABLE.test(serialized)) reject('PRIVATE_OR_ACTIVE_CONTENT');
    // Defensive whitelist assertion: never persist fields from pack.meta / houses / runtime.
    if (/"(?:scores|teams|houses|engine|skin|apiKey|students|studentId|teamState)"\s*:/i.test(serialized)) reject('PRIVATE_FIELD');
    if (new TextEncoder().encode(serialized).byteLength > MAX_BYTES) reject('MATERIAL_OVERSIZED');
    return { material: Object.freeze(material), warnings: [...new Set(warnings)],
      totalStations: stations.length, exportedTasks: tasks.length,
      excludedStations: stations.length - new Set(tasks.map(t => Number(t.id.match(/^ludus-s(\d+)-/)[1]))).size };
  }
  function trustedStudioRoot(configured, currentHref) {
    if (typeof configured !== 'string' || !configured.trim()) reject('STUDIO_NOT_CONFIGURED');
    let here, root;
    try { here = new URL(currentHref); root = new URL(configured, here); }
    catch { reject('STUDIO_URL_INVALID'); }
    if (root.search || root.hash || root.username || root.password) reject('STUDIO_URL_UNTRUSTED');
    if (!root.pathname.endsWith('/')) root.pathname += '/';
    if (root.origin !== here.origin || !ROOTS.has(root.pathname) ||
      (root.protocol !== 'https:' && !(root.protocol === 'http:' && root.hostname === 'localhost')))
      reject('STUDIO_URL_UNTRUSTED');
    return root.href;
  }
  async function sendPack({pack, topic, subject, objectives, level, yearGroup, confirmed, version}) {
    const access = global.__GHRAB_STUDIO_ACCESS__;
    if (access?.appId !== 'ludus' || access.granted !== true) reject('SCHOOL_ACCESS_REQUIRED');
    // Preserve the grant snapshot across the asynchronous, same-origin helper import.
    // Compare the genuine frozen grant by identity and value after async loading.
    const grantSnapshot = access.granted;
    if (typeof global.crypto?.randomUUID !== 'function') reject('CRYPTO_UNAVAILABLE');
    const material = mapPackToMaterial({pack, topic, subject, objectives, level, yearGroup,
      id: `ludus-${global.crypto.randomUUID()}`, now: new Date().toISOString(),
      appVersion: version, privacyConfirmed: confirmed}).material;
    const base = trustedStudioRoot(global.__GHRAB_DEPLOYMENT_CONFIG__?.studioBaseUrl, global.location.href);
    // Two audited same-origin Studio mounts; no arbitrary computed module imports.
    const helper = base.endsWith('/AI-Studio-GHRAB/')
      ? await import('/AI-Studio-GHRAB/integration/save-to-studio.js')
      : await import('/ai-studio/integration/save-to-studio.js');
    const currentAccess = global.__GHRAB_STUDIO_ACCESS__;
    if (currentAccess !== access || currentAccess?.appId !== 'ludus' ||
        currentAccess.granted !== true || currentAccess.granted !== grantSnapshot)
      reject('SCHOOL_ACCESS_REVOKED');
    const result = helper.saveMaterialToStudio({
      material, studioUrl: base, sourceAppId: 'ludus',
      sourceAppVersion: version, navigate: false,
    });
    if (!result?.ok || !result.targetUrl) reject(result?.reason || 'HANDOFF_NOT_PREPARED');
    return { targetUrl: result.targetUrl, material };
  }
  function setupUI() {
    const lesson = document.getElementById('dlLesson');
    if (!lesson || document.getElementById('stage07Save')) return;
    const button = document.createElement('button');
    button.id = 'stage07Save'; button.type = 'button';
    button.className = 'btn ghost'; button.textContent = '⇧ Uložit obsah do AI Studia';
    button.disabled = !global.__lastPack;
    lesson.insertAdjacentElement('afterend', button);
    const dialog = document.createElement('dialog'); dialog.id = 'stage07Dialog';
    dialog.style.maxWidth = 'min(92vw, 580px)'; dialog.style.borderRadius = '14px';
    dialog.style.padding = '22px'; dialog.style.color = 'inherit';
    const title = document.createElement('h2'); title.textContent = 'Pedagogický export do AI Studia';
    const info = document.createElement('p'); info.id = 'stage07Info';
    const note = document.createElement('p'); note.textContent = 'Přenášejí se jen podporované pedagogické otázky, možnosti, odpovědi a vysvětlení. Úlohy s nepodporovanou mechanikou se vynechají. Herní engine, svět, skin, týmy a skóre se neukládají. Herní podobu zachová původní oddělený export LUDUS_CONTENT.';
    function field(id, label, initial) {
      const wrap = document.createElement('label'); wrap.style.display = 'block'; wrap.style.margin = '12px 0';
      const heading = document.createElement('span'); heading.textContent = label;
      const input = document.createElement('input'); input.id = id; input.type = 'text';
      input.style.display = 'block'; input.style.width = '100%';
      input.value = initial || ''; input.maxLength = 240;
      wrap.append(heading, input); dialog.append(wrap); return input;
    }
    dialog.append(title, info, note);
    // The teacher must confirm the same pack they inspected. Rebuilding a game
    // between the preview and submit is not permission to silently export it.
    let inspectedPack = null;
    const topicInput = field('stage07Topic', 'Název pedagogického tématu', '');
    const subjectInput = field('stage07Subject', 'Předmět (povinné)', '');
    subjectInput.maxLength = 160;
    const objectivesInput = field('stage07Objective', 'Výukový cíl (nepovinné)', '');
    objectivesInput.maxLength = 800;
    const levelInput = field('stage07Level', 'CEFR A1–C2 (nepovinné)', '');
    levelInput.maxLength = 2;
    const yearGroupInput = field('stage07YearGroup', 'Ročník / skupina (nepovinné)', '');
    yearGroupInput.maxLength = 120;
    const checkboxLabel = document.createElement('label'); checkboxLabel.style.display = 'block';
    const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.id = 'stage07Consent';
    checkboxLabel.append(checkbox, document.createTextNode(' Potvrzuji, že otázky neobsahují osobní údaje žáků ani nepovolená média.'));
    dialog.append(checkboxLabel);
    const resultText = document.createElement('p'); resultText.setAttribute('role', 'status');
    const actions = document.createElement('div'); actions.style.marginTop = '16px';
    const cancel = document.createElement('button'); cancel.className = 'btn ghost';
    cancel.type = 'button'; cancel.textContent = 'Zrušit'; cancel.onclick = () => dialog.close();
    const send = document.createElement('button'); send.className = 'btn';
    send.type = 'button'; send.textContent = 'Připravit předání';
    const open = document.createElement('a'); open.className = 'btn'; open.textContent = 'Otevřít Moje materiály';
    open.hidden = true; open.rel = 'noopener';
    actions.append(cancel, send, open); dialog.append(resultText, actions);
    document.body.append(dialog);
    button.addEventListener('click', () => {
      if (!global.__lastPack) return;
      inspectedPack = global.__lastPack;
      const spec = global.__lastSpec || {};
      topicInput.value = global.__lastTopic || spec.title || '';
      subjectInput.value = spec.subject || spec.content?.subject || '';
      objectivesInput.value = Array.isArray(spec.objectives) ? spec.objectives.join('; ') : '';
      levelInput.value = /^(A1|A2|B1|B2|C1|C2)$/.test(spec.level || '') ? spec.level : '';
      yearGroupInput.value = spec.yearGroup || '';
      checkbox.checked = false;
      // Existing pending handoff must not be overwritten by a second export.
      // A new preview is safe; the canonical helper will reject duplicate packets.
      open.hidden = true; open.removeAttribute('href');
      send.disabled = false; resultText.textContent = '';
      try {
        const preview = mapPackToMaterial({
          pack: global.__lastPack, topic: topicInput.value || 'Pedagogické téma',
          subject: subjectInput.value || 'Náhled – doplňte předmět', objectives: [],
          id: 'ludus-00000000-0000-4000-8000-000000000000',
          now: new Date().toISOString(), privacyConfirmed: true,
        });
        const warningWords = preview.warnings.map(w => w.includes('unsupported') ? 'Nepodporovaná úloha byla vynechána.' :
          w === 'incoming-order-may-be-flattened' ? 'Dříve importované řazení může být nyní jen textovým doplňováním.' :
          w === 'final-challenge-not-exported' ? 'Finální herní výzva není součástí exportu.' :
          w === 'game-world-engine-skin-and-team-runtime-not-exported' ? 'Herní konfigurace a výsledky nejsou exportovány.' :
          'Část nepřenositelného obsahu bude vynechána.');
        info.textContent = `Přenositelných úloh: ${preview.exportedTasks}. Nepřenesené stanice: ${preview.excludedStations}. ${[...new Set(warningWords)].join(' ')}`;
      } catch (e) {
        info.textContent = `Kontrola výstupu: ${e.code || 'Nejsou k dispozici podporované úlohy'}.`;
        send.disabled = true;
      }
      if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.open = true;
    });
    send.addEventListener('click', async () => {
      send.disabled = true; resultText.textContent = 'Připravuji bezpečné předání…';
      try {
        if (!global.__lastPack) reject('NO_GENERATED_PACK');
        if (!inspectedPack || global.__lastPack !== inspectedPack) reject('CONTENT_CHANGED_REOPEN_PREVIEW');
        const version = document.documentElement.dataset.ghrabAppVersion || '';
        const result = await sendPack({
          pack: global.__lastPack, topic: topicInput.value,
          subject: subjectInput.value,
          objectives: objectivesInput.value.trim() ? [objectivesInput.value.trim()] : [],
          level: levelInput.value.trim(), yearGroup: yearGroupInput.value.trim(),
          version, confirmed: checkbox.checked,
        });
        resultText.textContent = 'Materiál připraven. Otevřete nyní Moje materiály a dokončete jednorázové převzetí.';
        open.href = result.targetUrl; open.hidden = false;
      } catch (e) { resultText.textContent = `Uložení se nezdařilo: ${e.code || e.message || 'Neznámá chyba'}.`; send.disabled = false; }
    });
  }
  const api = Object.freeze({mapPackToMaterial, trustedStudioRoot, sendPack, setupUI});
  if (global.document) {
    global.LUDUS_STAGE07 = api;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupUI, {once:true});
    else setupUI();
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
