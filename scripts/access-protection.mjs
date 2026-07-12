const CENTRAL_CSS = '/AI-Studio-GHRAB/access/access-gate.css';
const CENTRAL_GUARD = '/AI-Studio-GHRAB/access/app-guard.js';

function protectScriptOpen(opening){
  if (/data-ghrab-access-bootstrap/i.test(opening)) return opening;
  const type = opening.match(/\stype\s*=\s*(["'])(.*?)\1/i)?.[2]?.toLowerCase() || '';
  if (['application/json','importmap','text/plain'].includes(type)) return opening;
  let attrs = opening.slice('<script'.length, -1);
  let originalType = '';
  attrs = attrs.replace(/\s+type\s*=\s*(["'])(.*?)\1/i, (_m,_q,v)=>{ originalType=v; return ''; });
  const original = originalType ? ` data-ghrab-original-type="${originalType.replace(/"/g,'&quot;')}"` : '';
  return `<script type="application/ghrab-protected" data-ghrab-protected${original}${attrs}>`;
}

function transformActualScripts(html, transform){
  let out='', pos=0;
  const lower=html.toLowerCase();
  while(true){
    const start=lower.indexOf('<script',pos);
    if(start<0){out+=html.slice(pos);break;}
    const openEnd=html.indexOf('>',start);
    if(openEnd<0){out+=html.slice(pos);break;}
    const close=lower.indexOf('</script>',openEnd+1);
    if(close<0){out+=html.slice(pos);break;}
    const opening=html.slice(start,openEnd+1);
    const blockEnd=close+'</script>'.length;
    out+=html.slice(pos,start)+transform(opening,html.slice(openEnd+1,close),html.slice(start,blockEnd));
    pos=blockEnd;
  }
  return out;
}

export function protectHtmlForStudio(source, appId='ludus'){
  let html=String(source);
  if (!/data-ghrab-access=/i.test(html)) html=html.replace(/<html\b([^>]*)>/i,'<html$1 data-ghrab-access="checking">');
  if (!html.includes(CENTRAL_CSS)) {
    html=html.replace(/<\/head>/i,`<link rel="stylesheet" href="${CENTRAL_CSS}">\n<style data-ghrab-access-style>html[data-ghrab-access="checking"] body{visibility:hidden}</style>\n</head>`);
  }
  html=transformActualScripts(html,(opening,content,whole)=>{
    const protectedOpen=protectScriptOpen(opening);
    return protectedOpen+content+'</script>';
  });
  const bootstrap=`<script type="module" data-ghrab-access-bootstrap>
const APP_ID=${JSON.stringify(appId)};
function showBootstrapFailure(){
  document.documentElement.dataset.ghrabAccess='denied';
  document.body.style.visibility='visible';
  document.body.innerHTML='<main class="ghrab-access-gate"><div class="ghrab-access-gate-mark">⬡</div><p class="ghrab-access-gate-eyebrow">AI STUDIO GHRAB</p><h1>Přístup nelze ověřit</h1><p>Centrální přístupová služba není dostupná. Zkontrolujte připojení a otevřete aplikaci znovu přes AI Studio.</p><div class="ghrab-access-gate-actions"><a class="ghrab-access-gate-primary" href="/AI-Studio-GHRAB/">Otevřít AI Studio</a></div></main>';
}
try {
  const {protectApp}=await import('${CENTRAL_GUARD}');
  let grantedPermit=null;
  document.addEventListener('ghrab:app-access-granted',event=>{grantedPermit=event.detail?.permit||null;},{once:true});
  const allowed=await protectApp(APP_ID,{studioUrl:'/AI-Studio-GHRAB/'});
  if(allowed){
    window.__GHRAB_STUDIO_ACCESS__=Object.freeze({appId:APP_ID,permit:grantedPermit});
    const sources=[...document.querySelectorAll('script[type="application/ghrab-protected"]')];
    for(const source of sources){
      const executable=document.createElement('script');
      for(const attr of source.attributes){
        if(!['type','data-ghrab-protected','data-ghrab-original-type'].includes(attr.name)) executable.setAttribute(attr.name,attr.value);
      }
      const originalType=source.getAttribute('data-ghrab-original-type');
      if(originalType) executable.type=originalType;
      executable.textContent=source.textContent;
      source.replaceWith(executable);
    }
  }
}catch(error){ console.error('AI Studio access bootstrap failed',error); showBootstrapFailure(); }
</script>
<noscript data-ghrab-access-noscript><style>html[data-ghrab-access="checking"] body{visibility:visible}</style><main style="max-width:42rem;margin:4rem auto;padding:1.5rem;font-family:system-ui">Tato aplikace vyžaduje zapnutý JavaScript a platný přístup z AI Studia GHRAB.</main></noscript>`;
  const bodyClose = html.toLowerCase().lastIndexOf('</body>');
  if (bodyClose < 0) return html + '\n' + bootstrap;
  return html.slice(0, bodyClose) + bootstrap + '\n' + html.slice(bodyClose);
}

export function stripStudioProtection(source){
  let html=String(source)
    .replace(/\sdata-ghrab-access="(?:checking|granted|denied)"/i,'')
    .replace(/<link\s+rel="stylesheet"\s+href="\/AI-Studio-GHRAB\/access\/access-gate\.css"\s*>\s*/i,'')
    .replace(/<style\s+data-ghrab-access-style>[\s\S]*?<\/style>\s*/i,'')
    .replace(/<noscript\s+data-ghrab-access-noscript>[\s\S]*?<\/noscript>\s*/i,'');
  html=transformActualScripts(html,(opening,content,whole)=>{
    if(/data-ghrab-access-bootstrap/i.test(opening)) return '';
    if(!/application\/ghrab-protected/i.test(opening)) return whole;
    const originalType=opening.match(/data-ghrab-original-type="([^"]+)"/i)?.[1]||'';
    let attrs=opening.slice('<script'.length,-1)
      .replace(/\s+type="application\/ghrab-protected"/i,'')
      .replace(/\s+data-ghrab-protected(?:="[^"]*")?/i,'')
      .replace(/\s+data-ghrab-original-type="[^"]*"/i,'');
    const type=originalType?` type="${originalType}"`:'';
    return `<script${type}${attrs}>${content}</script>`;
  });
  return html;
}
