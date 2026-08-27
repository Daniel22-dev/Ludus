#!/usr/bin/env node
import fs from 'node:fs'; import path from 'node:path';
const root=path.resolve('.'); const baseline=JSON.parse(fs.readFileSync(path.join(root,'config/qa-p5-xss-baseline.json'),'utf8'));
const roots=['src','public','engines','runtime'].map(x=>path.join(root,x)).filter(fs.existsSync); const files=[];
for(const r of roots) walk(r); function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name); if(e.isDirectory())walk(p); else if(/\.(?:html?|m?js|css)$/i.test(e.name))files.push(p)}}
const patterns={innerHTML:/\.innerHTML\s*=/g,insertAdjacentHTML:/\.insertAdjacentHTML\s*\(/g,outerHTML:/\.outerHTML\s*=/g,documentWrite:/document\.write\s*\(/g,eval:/\beval\s*\(/g,newFunction:/\bnew\s+Function\s*\(/g};
const counts=Object.fromEntries(Object.keys(patterns).map(k=>[k,0])); const evidence=[];
for(const f of files){const t=fs.readFileSync(f,'utf8');for(const [k,re] of Object.entries(patterns)){const n=[...t.matchAll(re)].length;counts[k]+=n;if(n)evidence.push({file:path.relative(root,f),kind:k,count:n})}}
const failures=[]; for(const [k,n] of Object.entries(counts)){const allowed=Number(baseline.counts?.[k]??0); if(n>allowed)failures.push(`${k}: ${n} > baseline ${allowed}`)}
const headersPath=path.join(root,'public/config/security-headers.json'); let csp=null;
if(fs.existsSync(headersPath)){
  const headers=JSON.parse(fs.readFileSync(headersPath,'utf8'));
  const staticPolicy=String(headers.staticProfile?.contentSecurityPolicy||'');
  const schoolPolicy=String(headers.schoolServerProfile?.headers?.['Content-Security-Policy']||'');
  const note=String(headers.staticProfile?.note||'')+' '+String(headers.schoolServerProfile?.note||'');
  csp={
    staticUnsafeInlineScript:/script-src[^;]*'unsafe-inline'/.test(staticPolicy),
    staticUnsafeInlineStyle:/style-src[^;]*'unsafe-inline'/.test(staticPolicy),
    schoolUnsafeInlineScript:/script-src[^;]*'unsafe-inline'/.test(schoolPolicy),
    schoolUnsafeInlineStyle:/style-src[^;]*'unsafe-inline'/.test(schoolPolicy),
    unsafeEval:/script-src[^;]*'unsafe-eval'/.test(staticPolicy)||/script-src[^;]*'unsafe-eval'/.test(schoolPolicy),
    exceptionDocumented:/compatibility exception/i.test(note)&&/inline scripts\/styles/i.test(note)
  };
  if(csp.unsafeEval)failures.push('CSP contains unsafe-eval.');
  if((csp.staticUnsafeInlineScript||csp.staticUnsafeInlineStyle||csp.schoolUnsafeInlineScript||csp.schoolUnsafeInlineStyle)&&!csp.exceptionDocumented)failures.push('CSP unsafe-inline exception is not documented truthfully.');
}
const report={schema:'ghrab-p5-xss-sink-audit-v1',appId:baseline.appId,counts,baseline:baseline.counts,csp,evidence,limitations:['This is a regression inventory, not proof that every HTML sink is safe.','unsafe-inline remains a known compatibility exception until a dedicated nonce/hash or external-module CSP refactor is validated across all engines.'],failures,status:failures.length?'failed':'passed'};
fs.mkdirSync(path.join(root,'dist'),{recursive:true});fs.writeFileSync(path.join(root,'dist/qa-p5-xss-sinks-report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(failures.length)process.exit(1);
