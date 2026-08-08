#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { protectHtmlForStudio } from './access-protection.mjs';

const ROOT = path.resolve('.');
const SRC_INDEX = path.join(ROOT, 'src', 'index.html');
const ENGINES_DIR = path.join(ROOT, 'engines');
const DIST = path.join(ROOT, 'dist');
const DIST_ENGINES = path.join(DIST, 'engines');
const PUBLIC_DIR = path.join(ROOT, 'public');
const DOCS_DIR = path.join(ROOT, 'docs');
const MEDIA_DIR = path.join(ROOT, 'media');
const RUNTIME_DIR = path.join(ROOT, 'runtime');
const APP_ID = 'ludus';
const CORE_VERSION = '1.0.0';
const CORE_DIR = path.join(ROOT, 'vendor', `ghrab-ai-core-${CORE_VERSION}`);
const CORE_FILE = `ghrab-ai-core-${CORE_VERSION}.js`;
const CORE_MANIFEST = `ghrab-ai-core-manifest-${CORE_VERSION}.json`;
const REQUESTED_MEDIA_PROFILE = String(process.env.LUDUS_MEDIA_PROFILE || 'unofficial').toLowerCase();
const MEDIA_PROFILE = REQUESTED_MEDIA_PROFILE === 'official' ? 'official' : 'unofficial';
const PUBLIC_RIGHTS = new Set(['verified-owned','verified-licensed','public-domain','cc0']);
const PRIVATE_MEDIA_ACK = process.env.LUDUS_PRIVATE_MEDIA_ACK === '1';
const fail = (message) => { console.error(`ERROR: ${message}`); process.exit(1); };
const sha = (file) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');

for (const file of [
  SRC_INDEX,
  path.join(CORE_DIR, CORE_FILE),
  path.join(CORE_DIR, CORE_MANIFEST),
  path.join(ROOT, 'src', 'ai-core-integration.js'),
  path.join(RUNTIME_DIR, 'ludus-engine-runtime.js'),
  path.join(MEDIA_DIR, 'registry.json'),
  path.join(MEDIA_DIR, 'rights-records.json'),
]) if (!fs.existsSync(file)) fail(`Missing required file: ${file}`);

const coreManifest = readJson(path.join(CORE_DIR, CORE_MANIFEST));
if (coreManifest.artifacts?.[CORE_FILE]?.sha256 !== sha(path.join(CORE_DIR, CORE_FILE))) fail('GHRAB AI Core SHA-256 mismatch.');
const rights = readJson(path.join(MEDIA_DIR, 'rights-records.json'));
if (MEDIA_PROFILE === 'official' && !PRIVATE_MEDIA_ACK) fail('Official media build is private-only. Use npm run build:official-private after accepting the owner-controlled media warning.');
for (const record of rights.records || []) {
  const source = path.join(ROOT, record.path);
  const exists = fs.existsSync(source);
  const verifiedForRelease = record.publicRelease === true && PUBLIC_RIGHTS.has(record.rightsStatus);
  if (!exists && (verifiedForRelease || MEDIA_PROFILE === 'official')) fail(`Registered media file is missing: ${record.path}`);
  if (exists && sha(source) !== record.sha256) fail(`Registered media hash mismatch: ${record.path}`);
}

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST_ENGINES, { recursive: true });
const buildTime = new Date().toISOString();
const appVersion = readJson(path.join(ROOT, 'package.json')).version;
const coreJs = fs.readFileSync(path.join(CORE_DIR, CORE_FILE), 'utf8');
const integration = fs.readFileSync(path.join(ROOT, 'src', 'ai-core-integration.js'), 'utf8');
let html = fs.readFileSync(SRC_INDEX, 'utf8');
const firstScript = html.indexOf('<script>');
if (firstScript < 0) fail('Builder does not contain the main script.');
html = `${html.slice(0, firstScript + 8)}\n${coreJs}\n;\n${html.slice(firstScript + 8)}`;
const marker = '/* ---- init ---- */';
if (!html.includes(marker)) fail('AI integration marker is missing.');
html = html.replace(marker, `${integration}\n;\n${marker}`);
html = html.replace(/(<html[^>]*>)/i, `$1\n<!-- BUILD: ${buildTime} -->`);
html = protectHtmlForStudio(html, APP_ID, 0);
fs.writeFileSync(path.join(DIST, 'index.html'), html, 'utf8');

if (fs.existsSync(PUBLIC_DIR)) fs.cpSync(PUBLIC_DIR, DIST, { recursive: true });
if (fs.existsSync(DOCS_DIR)) fs.cpSync(DOCS_DIR, path.join(DIST, 'docs'), { recursive: true });
fs.mkdirSync(path.join(DIST, 'runtime'), { recursive: true });
fs.cpSync(RUNTIME_DIR, path.join(DIST, 'runtime'), { recursive: true });

const mediaRegistry = readJson(path.join(MEDIA_DIR, 'registry.json'));
fs.mkdirSync(path.join(DIST, 'media'), { recursive: true });
for (const name of ['README.md', 'rights-records.json', 'rights-records-v1.schema.json']) {
  const source = path.join(MEDIA_DIR, name);
  if (fs.existsSync(source)) fs.copyFileSync(source, path.join(DIST, 'media', name));
}
if (MEDIA_PROFILE === 'official') {
  for (const record of rights.records || []) {
    const target = path.join(DIST, record.path);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(ROOT, record.path), target);
  }
}
mediaRegistry.release = {
  profile: MEDIA_PROFILE,
  generatedAt: buildTime,
  includedOfficialMedia: MEDIA_PROFILE === 'official',
  publicRelease: MEDIA_PROFILE !== 'official',
  privateOwnerControlled: MEDIA_PROFILE === 'official',
  optionalMediaExcluded: MEDIA_PROFILE === 'unofficial',
};
writeJson(path.join(DIST, 'media', 'registry.json'), mediaRegistry);

const manifest = readJson(path.join(ENGINES_DIR, 'manifest.json'));
const engines = Array.isArray(manifest) ? manifest : (manifest.engines || []);
const byFile = new Map(engines.filter((engine) => engine.file).map((engine) => [engine.file, engine]));
const contentDir = path.join(DIST, 'content');
fs.mkdirSync(contentDir, { recursive: true });
const contentIndex = [];

function injectRuntime(source, engine) {
  const engineId = engine?.id || path.basename(engine?.file || '', '.html');
  const packPath = `../content/${engineId}.json`;
  let output = source.replace(/<html\b([^>]*)>/i, (whole, attrs) => {
    const clean = attrs
      .replace(/\sdata-ludus-engine-id=(?:"[^"]*"|'[^']*')/i, '')
      .replace(/\sdata-ludus-content-pack=(?:"[^"]*"|'[^']*')/i, '')
      .replace(/\sdata-ludus-media-profile=(?:"[^"]*"|'[^']*')/i, '');
    return `<html${clean} data-ludus-engine-id="${engineId}" data-ludus-content-pack="${packPath}" data-ludus-media-profile="${MEDIA_PROFILE}">`;
  });
  const bootstrap = `<script data-ludus-media-profile-bootstrap>window.__LUDUS_MEDIA_PROFILE__=${JSON.stringify(MEDIA_PROFILE)};</script>`;
  output = output.replace(/<\/head>/i, `${bootstrap}\n</head>`);
  if (MEDIA_PROFILE === 'unofficial') {
    output = output.replace(/\sdata-ludus-src-official=(?:"[^"]*"|'[^']*')/gi, ' data-ludus-src-official=""');
    output = output.replace(/const variant=lt\.variant\|\|inj\.variant\|\|\(meta\.skinSafe===false\?'official':'safe'\);/, "const variant=window.__LUDUS_MEDIA_PROFILE__||lt.variant||inj.variant||(meta.skinSafe===false?'official':'safe');");
  }
  return output;
}

let engineCount = 0;
for (const file of fs.readdirSync(ENGINES_DIR)) {
  const source = path.join(ENGINES_DIR, file);
  if (file.endsWith('.html')) {
    const engine = byFile.get(file) || { id: path.basename(file, '.html'), file, status: 'unknown' };
    const pack = {
      schema: 'ludus-engine-content-pack-v1',
      engineId: engine.id,
      appVersion,
      generatedAt: buildTime,
      sourceFile: file,
      status: engine.status || 'unknown',
      builderCompatible: Boolean(engine.builderCompatible),
      title: engine.title || { cs: engine.name || engine.id },
      mechanicId: engine.mechanicId || null,
      flowModel: engine.flowModel || null,
      supportedExerciseTypes: engine.supportedExerciseTypes || engine.supports || [],
      capabilities: engine.capabilities || {},
      uiLanguages: engine.uiLanguages || [],
      contentLanguages: engine.contentLanguages || [],
      mediaProfile: MEDIA_PROFILE,
    };
    writeJson(path.join(contentDir, `${engine.id}.json`), pack);
    contentIndex.push({ engineId: engine.id, file: `engines/${file}`, contentPack: `content/${engine.id}.json`, status: pack.status, builderCompatible: pack.builderCompatible });
    const prepared = injectRuntime(fs.readFileSync(source, 'utf8'), engine);
    fs.writeFileSync(path.join(DIST_ENGINES, file), protectHtmlForStudio(prepared, APP_ID, 1), 'utf8');
    engineCount += 1;
  } else if (file === 'manifest.json') {
    fs.copyFileSync(source, path.join(DIST_ENGINES, file));
  }
}
writeJson(path.join(contentDir, 'engine-index.json'), {
  schema: 'ludus-engine-content-index-v1',
  appId: APP_ID,
  appVersion,
  mediaProfile: MEDIA_PROFILE,
  generatedAt: buildTime,
  engines: contentIndex.sort((a, b) => a.engineId.localeCompare(b.engineId)),
});

const operations = readJson(path.join(DIST, 'ai-operations.json'));
if (operations.appId !== APP_ID || operations.appVersion !== appVersion || operations.coreVersion !== CORE_VERSION || operations.operations.length !== 2) fail('Invalid ai-operations.json.');
for (const operation of operations.operations) if (!integration.includes(`'${operation.operation}'`) && !integration.includes(`"${operation.operation}"`)) fail(`AI integration does not contain operation ${operation.operation}.`);
const template = path.join(ROOT, 'studio', 'app-manifest.template.json');
if (fs.existsSync(template)) {
  const text = fs.readFileSync(template, 'utf8').replaceAll('__APP_VERSION__', appVersion).replaceAll('__BUILD_TIME__', buildTime);
  const studioManifest = JSON.parse(text);
  if (/produk|production/.test(`${studioManifest.status?.cs || ''} ${studioManifest.status?.en || ''}`.toLowerCase())) fail('Studio manifest must not declare production.');
  if (studioManifest.aiCore?.coreVersion !== CORE_VERSION || studioManifest.aiCore?.serverReady !== true || studioManifest.aiCore?.conformancePassed !== true) fail('Studio manifest has invalid AI Core metadata.');
  fs.writeFileSync(path.join(DIST, 'studio-manifest.json'), text);
}
const kb = (file) => `${(fs.statSync(file).size / 1024).toFixed(1)} kB`;
console.log(`LUDUS ${appVersion}: Core ${CORE_VERSION} SHA-256 OK; ${operations.operations.length} operations; ${engineCount} engines; profile ${MEDIA_PROFILE}; builder ${kb(path.join(DIST, 'index.html'))}`);

await import('./apply-ghrab-platform.mjs');
