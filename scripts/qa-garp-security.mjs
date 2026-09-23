#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve('.');
const read = (p) => fs.readFileSync(path.join(root,p),'utf8');
const json = (p) => JSON.parse(read(p));
const checks = [];
function check(id, ok, detail='') { checks.push({id,ok:Boolean(ok),detail:String(detail||'')}); }

const schoolRequested = process.argv.includes('--school-server');
const requiredBuildInputs = [
  'dist/index.html',
  'dist/config/deployment.json',
  'dist/access/deployment-config.js',
  ...(schoolRequested ? [
    'dist-school-server/index.html',
    'dist-school-server/config/deployment.json',
    'dist-school-server/access/deployment-config.js',
    'dist-school-server/server-ready-build-info.json'
  ] : [])
];
const missingBuildInputs = requiredBuildInputs.filter((p) => !fs.existsSync(path.join(root,p)));
if (missingBuildInputs.length) {
  const result={schema:'ghrab-garp-security-gate-v1',decision:'HARNESS_ERROR',liveClaim:'NOT_TESTED',reason:'MISSING_BUILD_ARTIFACTS',missing:missingBuildInputs,hint:schoolRequested?'Run npm run build:school-server before qa:garp -- --school-server.':'Run npm run build before qa:garp.'};
  fs.mkdirSync(path.join(root,'qa-results'),{recursive:true});
  fs.writeFileSync(path.join(root,'qa-results/garp-security.json'),JSON.stringify(result,null,2)+'\n');
  console.error(JSON.stringify(result,null,2));
  process.exit(2);
}

const pkg=json('package.json');
const src=read('src/index.html');
const sw=read('public/sw.js');
const sec=json('public/config/security-headers.json');
const stdDep=json('dist/config/deployment.json');
const schoolSource=json('public/config/deployment.school-server.json');
const schoolDep=schoolRequested?json('dist-school-server/config/deployment.json'):null;
const stdModule=read('dist/access/deployment-config.js');
const schoolModule=schoolRequested?read('dist-school-server/access/deployment-config.js'):null;
const schoolInfo=schoolRequested?json('dist-school-server/server-ready-build-info.json'):null;

check('version.package',pkg.version==='1.16.27',pkg.version);
check('build.standard.exists',fs.existsSync(path.join(root,'dist/index.html')));
check('access-gate.stylesheet-injected',/<link\b[^>]*data-ghrab-access-gate-css\b[^>]*href=[\"']\.\/access\/access-gate\.css[\"'][^>]*>/i.test(read('dist/index.html')));
check('server.scope',true,schoolRequested?'SCHOOL_SERVER_REQUESTED':'DEFERRED_BY_OWNER_DECISION');
check('deployment.standard.failure-mode',stdModule.includes('const CONFIG_FAILURE_MODE = "github-fallback";'));
check('deployment.standard.profile',stdDep.profile==='github-pages',stdDep.profile);
check('deployment.standard.auth',stdDep.authMode==='signed-permit',stdDep.authMode);
check('deployment.standard.local-key-explicit',stdDep.features?.allowLocalProviderKeys===true);
// Existing future school-profile hardening is preserved and statically checked, but is not a current FOUNDATION runtime target.
check('deployment.school-source.profile',schoolSource.profile==='school-server',schoolSource.profile);
check('deployment.school-source.auth',schoolSource.authMode==='server-session',schoolSource.authMode);
check('deployment.school-source.ai-transport',schoolSource.aiTransport==='school-gateway',schoolSource.aiTransport);
check('deployment.school-source.local-keys-disabled',schoolSource.features?.allowLocalProviderKeys===false);
check('deployment.school-source.server-authoritative',schoolSource.access?.strategy==='server-authoritative',schoolSource.access?.strategy);
check('deployment.school-source.offline-disabled',Number(schoolSource.access?.maxOfflineAgeHours)===0,schoolSource.access?.maxOfflineAgeHours);
check('deployment.school-source.fail-closed-stale',schoolSource.access?.failClosedWhenStale===true);
check('deployment.school-source.same-origin-only',Array.isArray(schoolSource.allowedOrigins)&&schoolSource.allowedOrigins.length===1&&schoolSource.allowedOrigins[0]==='self',JSON.stringify(schoolSource.allowedOrigins));
if(schoolRequested){
  check('build.school.exists',fs.existsSync(path.join(root,'dist-school-server/index.html')));
  check('deployment.school.failure-mode',schoolModule.includes('const CONFIG_FAILURE_MODE = "fail-closed";'));
  check('deployment.school.profile',schoolDep.profile==='school-server',schoolDep.profile);
  check('deployment.school.local-keys-disabled',schoolDep.features?.allowLocalProviderKeys===false);
  check('deployment.school.build-info-local-key',schoolInfo.localProviderKeysAllowed===false);
  check('deployment.school.build-info-failure-mode',schoolInfo.deploymentConfigFailureMode==='fail-closed',schoolInfo.deploymentConfigFailureMode);
}
check('import.max-bytes',src.includes('STUDIO_IMPORT_MAX_BYTES=2*1024*1024'));
check('import.max-depth',src.includes('STUDIO_IMPORT_MAX_DEPTH=32'));
check('import.max-nodes',src.includes('STUDIO_IMPORT_MAX_NODES=20000'));
check('import.prototype-guard',src.includes("new Set(['__proto__','prototype','constructor'])"));
check('import.size-before-read',src.indexOf('file.size>STUDIO_IMPORT_MAX_BYTES')>=0&&src.indexOf('file.size>STUDIO_IMPORT_MAX_BYTES')<src.indexOf('const raw=await file.text()'));
check('import.envelope-checksum',src.includes('unwrapMaybe(raw,{allowLegacy:true,verifyChecksum:true})'));
check('import.schema-whitelist',src.includes("data.schema==='ghrab-material-v1'")&&src.includes("data.schemaVersion==='ludus-content-v2'||data.kind==='ludus.content'"));
check('preview.no-window-open',!src.includes('window.open('));
check('preview.noopener',src.includes("a.rel='noopener noreferrer'"));
check('sw.deployment-runtime-bypass',sw.includes("relative === 'config/deployment.json'"));
check('sw.no-store-bypass',sw.includes("request.cache === 'no-store'"));
check('source.no-eval',!/(^|[^\w.])eval\s*\(/m.test(src));
check('source.no-new-function',!new RegExp('new\\s+Function\\s*\\(').test(src));
check('csp.no-unsafe-eval',!sec.staticProfile.contentSecurityPolicy.includes("'unsafe-eval'")&&!sec.schoolServerProfile.headers['Content-Security-Policy'].includes("'unsafe-eval'"));
check('csp.school-connect-self',/connect-src 'self'(?:;|$)/.test(sec.schoolServerProfile.headers['Content-Security-Policy']));
check('csp.inline-exception-documented',/compatibility exception/i.test(String(sec.staticProfile?.note||''))&&/inline scripts\/styles/i.test(String(sec.staticProfile?.note||'')));
check('preview.sandbox-wrapper',src.includes('function sandboxPreviewWrapper(gameHtml)'));
check('preview.sandbox-srcdoc',src.includes('document.getElementById("game").srcdoc='));
const previewSandbox=(src.match(/<iframe id="game" sandbox="([^"]+)"/)||[])[1]||'';
check('preview.sandbox-scripts',/\ballow-scripts\b/.test(previewSandbox),previewSandbox);
check('preview.sandbox-no-same-origin',! /\ballow-same-origin\b/.test(previewSandbox),previewSandbox);

const chronos=read('engines/chronos.html');
const hogwarts=read('engines/hogwarts.html');
const lotr=read('engines/lotr.html');
const laughworks=read('engines/laughworks.html');
check('xss.chronos-content-escaped',chronos.includes("esc(task.q)")&&chronos.includes("esc(task.item)")&&chronos.includes("esc(task.why||'Správně.')")&&!chronos.includes("'+task.q+'"));
check('xss.chronos-intro-escaped',chronos.includes("L.map(esc).join"));
check('xss.hogwarts-content-escaped',hogwarts.includes('${esc(q.t)}')&&hogwarts.includes('onclick="tapWord(${i})"')&&!hogwarts.includes('id="wb-${w}"')&&!hogwarts.includes("tapWord('${w}')"));
check('xss.lotr-content-escaped',lotr.includes("q.t==='ord'?esc(q.q):esc(q.q).replace")&&lotr.includes("+esc(ex)"));
check('xss.laughworks-content-escaped',laughworks.includes('${esc(step.prompt)}')&&laughworks.includes('${esc(o.label)}'));

const workflowDir=path.join(root,'.github/workflows');
const workflowFiles=fs.readdirSync(workflowDir).filter(n=>/\.ya?ml$/i.test(n));
const refs=[];
for(const name of workflowFiles){
  const text=fs.readFileSync(path.join(workflowDir,name),'utf8');
  for(const m of text.matchAll(/\buses:\s*([^\s#]+)(?:\s*#.*)?$/gm)) refs.push({name,ref:m[1]});
}
check('actions.present',refs.length>0,refs.length);
check('actions.sha-pinned',refs.every(x=>/@[0-9a-f]{40}$/i.test(x.ref)),refs.filter(x=>!/@[0-9a-f]{40}$/i.test(x.ref)).map(x=>`${x.name}:${x.ref}`).join(','));
check('actions.no-moving-major',refs.every(x=>!/@v\d+(?:\.|$)/i.test(x.ref)));
const allowedActions=new Set(['actions/checkout','actions/setup-node','actions/upload-artifact','actions/download-artifact','actions/configure-pages','actions/upload-pages-artifact','actions/deploy-pages']);
check('actions.allowlist',refs.every(x=>allowedActions.has(x.ref.split('@')[0])),refs.filter(x=>!allowedActions.has(x.ref.split('@')[0])).map(x=>x.ref).join(','));

// Runtime simulation: a missing deployment.json must retain signed fallback in standard dist,
// while the school-server copy must reject and therefore leave protected scripts locked.
const oldFetch=globalThis.fetch, oldLocation=globalThis.location, oldDocument=globalThis.document;
globalThis.location={href:'https://example.invalid/Ludus/index.html',origin:'https://example.invalid',protocol:'https:',hostname:'example.invalid',pathname:'/Ludus/index.html'};
globalThis.document={documentElement:{dataset:{}},querySelectorAll(){return[];},querySelector(){return null;},head:{append(){}}};
globalThis.fetch=async()=>{throw new Error('qa simulated deployment outage');};
try{
  const std=await import(pathToFileURL(path.join(root,'dist/access/deployment-config.js')).href+`?qa=${Date.now()}`);
  const cfg=await std.loadDeploymentConfig({appId:'ludus',forceReload:true,timeoutMs:250});
  if(cfg.profile!=='github-pages'||cfg.authMode!=='signed-permit') throw new Error('standard fallback contract changed');
  if(schoolRequested){
    const school=await import(pathToFileURL(path.join(root,'dist-school-server/access/deployment-config.js')).href+`?qa=${Date.now()+1}`);
    let rejected=false;try{await school.loadDeploymentConfig({appId:'ludus',forceReload:true,timeoutMs:250});}catch{rejected=true;}
    if(!rejected) throw new Error('school deployment outage did not fail closed');
  }
} finally {
  globalThis.fetch=oldFetch; globalThis.location=oldLocation; globalThis.document=oldDocument;
}

const failed=checks.filter(x=>!x.ok);
const result={schema:'ghrab-garp-security-gate-v2',appId:'ludus',appVersion:pkg.version,foundationScope:schoolRequested?'school-server-explicit':'pre-server-standard',serverImplementation:schoolRequested?'EXPLICIT_TEST_REQUEST':'DEFERRED_BY_OWNER_DECISION',liveClaim:'NOT_TESTED',total:checks.length,passed:checks.length-failed.length,failed:failed.length,checks};
fs.mkdirSync(path.join(root,'qa-results'),{recursive:true});
fs.writeFileSync(path.join(root,'qa-results/garp-security.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({schema:result.schema,appId:result.appId,appVersion:result.appVersion,total:result.total,passed:result.passed,failed:result.failed},null,2));
if(failed.length){for(const f of failed)console.error(`FAIL ${f.id}: ${f.detail}`);process.exit(1);}
