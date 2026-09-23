function protectScriptOpen(opening) {
  if (/data-ghrab-access-bootstrap|data-ghrab-platform-(?:config|runtime)/i.test(opening)) return opening;
  const type = opening.match(/\stype\s*=\s*(["'])(.*?)\1/i)?.[2]?.toLowerCase() || '';
  if (['application/json', 'importmap', 'text/plain'].includes(type)) return opening;
  let attrs = opening.slice('<script'.length, -1);
  let originalType = '';
  attrs = attrs.replace(/\s+type\s*=\s*(["'])(.*?)\1/i, (_m, _q, value) => {
    originalType = value;
    return '';
  });
  const original = originalType ? ` data-ghrab-original-type="${originalType.replace(/"/g, '&quot;')}"` : '';
  return `<script type="application/ghrab-protected" data-ghrab-protected${original}${attrs}>`;
}

function transformActualScripts(html, transform) {
  let out = '';
  let pos = 0;
  const lower = html.toLowerCase();
  while (true) {
    const start = lower.indexOf('<script', pos);
    if (start < 0) {
      out += html.slice(pos);
      break;
    }
    const openEnd = html.indexOf('>', start);
    if (openEnd < 0) {
      out += html.slice(pos);
      break;
    }
    const close = lower.indexOf('</script>', openEnd + 1);
    if (close < 0) {
      out += html.slice(pos);
      break;
    }
    const opening = html.slice(start, openEnd + 1);
    const blockEnd = close + '</script>'.length;
    out += html.slice(pos, start) + transform(opening, html.slice(openEnd + 1, close), html.slice(start, blockEnd));
    pos = blockEnd;
  }
  return out;
}

export function protectHtmlForStudio(source, appId = 'ludus', relativeDepth = 0) {
  let html = String(source);
  const rootPrefix = relativeDepth > 0 ? '../'.repeat(relativeDepth) : './';
  const accessBase = `${rootPrefix}access/`;
  if (!/data-ghrab-access=/i.test(html)) html = html.replace(/<html\b([^>]*)>/i, '<html$1 data-ghrab-access="checking">');
  if (!/<link\b[^>]*data-ghrab-access-gate-css\b/i.test(html)) {
    html = html.replace(/<\/head>/i, `<link rel="stylesheet" data-ghrab-access-gate-css href="${accessBase}access-gate.css">\n<style data-ghrab-access-style>html[data-ghrab-access="checking"] body{visibility:hidden}</style>\n</head>`);
  }
  html = transformActualScripts(html, (opening, content) => protectScriptOpen(opening) + content + '</script>');
  const bootstrap = `<script type="module" data-ghrab-access-bootstrap>
const APP_ID=${JSON.stringify(appId)};
const ACCESS_BASE=${JSON.stringify(accessBase)};
const PRIVACY_URL=${JSON.stringify(`${rootPrefix}runtime/ludus-privacy.js`)};
const LOAD_PRIVACY_BEFORE_UNLOCK=${relativeDepth === 0 ? 'true' : 'false'};
let studioUrl='/AI-Studio-GHRAB/';
function showBootstrapFailure(){
  document.documentElement.dataset.ghrabAccess='denied';
  document.body.style.visibility='visible';
  document.body.innerHTML='<main class="ghrab-access-gate"><div class="ghrab-access-gate-mark">⬡</div><p class="ghrab-access-gate-eyebrow">AI STUDIO GHRAB</p><h1>Přístup nelze ověřit</h1><p>Centrální přístupová služba není dostupná. Zkontrolujte připojení a otevřete aplikaci znovu přes AI Studio.</p><div class="ghrab-access-gate-actions"><a class="ghrab-access-gate-primary" data-ghrab-studio-link>Otevřít AI Studio</a></div></main>';
  const link=document.querySelector('[data-ghrab-studio-link]');if(link)link.href=studioUrl;
}
function startLocalReporter(context){
  return import(ACCESS_BASE+'reporter-bootstrap.js')
    .then(module=>module.startReporterBestEffort('./error-reporter-adapter.js',{context}))
    .catch(error=>{console.warn('Reportér LUDUS nebyl načten; aplikace pokračuje.',error);return null;});
}
async function ensurePrivacyRuntime(){
  if(window.LUDUSPrivacy)return true;
  await new Promise((resolve,reject)=>{
    const node=document.createElement('script');node.src=PRIVACY_URL;node.dataset.ludusPrivacyRuntime='1.16.27';node.dataset.ludusPrivacyScope='builder';node.async=false;
    node.onload=()=>resolve(true);node.onerror=()=>reject(new Error('LUDUS privacy runtime failed to load.'));document.head.append(node);
  });
  if(!window.LUDUSPrivacy)throw new Error('LUDUS privacy runtime unavailable after load.');
  return true;
}
function unlockProtectedScripts(){
  const helper=window.GHRAB_PLATFORM?.unlockProtectedScripts;
  if(typeof helper!=='function')throw new Error('GHRAB platform unlock helper is unavailable.');
  return helper();
}
async function boot(){
  try{
    const deploymentModule=await import(ACCESS_BASE+'deployment-config.js');
    const deployment=await deploymentModule.loadDeploymentConfig({appId:APP_ID});
    const urls=deploymentModule.deploymentUrls(deployment);studioUrl=urls.studioUrl;
    const {protectApp}=await import(urls.guardUrl);
    const allowed=await protectApp(APP_ID,{studioUrl,errorReporter:false});
    if(!allowed)return;
    // Do not duplicate signed authorization material into a globally readable window property.
    window.__GHRAB_STUDIO_ACCESS__=Object.freeze({appId:APP_ID,granted:true});
    void startLocalReporter('ludus:granted');
    if(LOAD_PRIVACY_BEFORE_UNLOCK)await ensurePrivacyRuntime();
    unlockProtectedScripts();
  }catch(error){console.error('AI Studio access bootstrap failed',error);showBootstrapFailure();void startLocalReporter('ludus:bootstrap-failure');}
}
void boot();
</script>
<noscript data-ghrab-access-noscript><style>html[data-ghrab-access="checking"] body{visibility:visible}</style><main style="max-width:42rem;margin:4rem auto;padding:1.5rem;font-family:system-ui">Tato aplikace vyžaduje zapnutý JavaScript a platný přístup z AI Studia GHRAB.</main></noscript>`;
  const bodyClose = html.toLowerCase().lastIndexOf('</body>');
  if (bodyClose < 0) return html + '\n' + bootstrap;
  return html.slice(0, bodyClose) + bootstrap + '\n' + html.slice(bodyClose);
}

export function stripStudioProtection(source) {
  let html = String(source)
    .replace(/\sdata-ghrab-access="(?:checking|granted|denied)"/i, '')
    .replace(/<link\s+[^>]*data-ghrab-access-gate-css[^>]*>\s*/i, '')
    .replace(/<style\s+data-ghrab-access-style>[\s\S]*?<\/style>\s*/i, '')
    .replace(/<noscript\s+data-ghrab-access-noscript>[\s\S]*?<\/noscript>\s*/i, '');
  html = transformActualScripts(html, (opening, content, whole) => {
    if (/data-ghrab-access-bootstrap/i.test(opening)) return '';
    if (!/application\/ghrab-protected/i.test(opening)) return whole;
    const originalType = opening.match(/data-ghrab-original-type="([^"]+)"/i)?.[1] || '';
    const attrs = opening.slice('<script'.length, -1)
      .replace(/\s+type="application\/ghrab-protected"/i, '')
      .replace(/\s+data-ghrab-protected(?:="[^"]*")?/i, '')
      .replace(/\s+data-ghrab-original-type="[^"]*"/i, '');
    const type = originalType ? ` type="${originalType}"` : '';
    return `<script${type}${attrs}>${content}</script>`;
  });
  return html;
}
