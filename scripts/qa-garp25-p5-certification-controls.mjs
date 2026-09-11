#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root=process.cwd(), tmp=fs.mkdtempSync(path.join(os.tmpdir(),'ludus-p5-cert-')), testRoot=path.join(tmp,'project');
const version=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version;
const filter=(src)=>{const rel=path.relative(root,src).split(path.sep).join('/');return !(/^(?:\.git|node_modules|dist-school-server|qa-results|test-results|coverage)(?:\/|$)/.test(rel)||/^security\/evidence(?:\/|$)/.test(rel));};
const run=()=>spawnSync(process.execPath,[path.join(testRoot,'scripts','qa-p5-release.mjs')],{cwd:testRoot,encoding:'utf8',env:{...process.env,AXE_REQUIRED:'1'}});
const must=(cond,msg,r)=>{if(cond)return;console.error(`FAIL: ${msg}`);if(r)console.error((r.stdout||'')+(r.stderr||''));throw new Error(msg)};
try{
  if(!fs.existsSync(path.join(root,'dist','quality-report.json')))throw new Error('Run qa:quality before LU-N15 certification controls.');
  const actualQuality=JSON.parse(fs.readFileSync(path.join(root,'dist','quality-report.json'),'utf8'));
  must(actualQuality.status==='passed'&&Number(actualQuality.summary?.failed||0)===0,'actual quality report must be a valid positive input before synthetic P5 control');
  fs.cpSync(root,testRoot,{recursive:true,filter});
  const dist=path.join(testRoot,'dist');fs.mkdirSync(dist,{recursive:true});
  const write=(name,obj)=>fs.writeFileSync(path.join(dist,name),JSON.stringify(obj,null,2)+'\n');
  // Synthetic report-set control: validates certification logic even when this runner cannot navigate local HTTP.
  write('qa-p3-browser-report.json',{schema:'synthetic-p5-browser-control-v1',appId:'ludus',appVersion:version,status:'passed',summary:{failed:0}});
  write('qa-p5-runtime-report.json',{schema:'synthetic-p5-runtime-control-v1',appId:'ludus',appVersion:version,status:'passed',scriptsExecuted:true,transport:'local-http',summary:{blockers:0,failed:0}});
  write('qa-p5-xss-sinks-report.json',{schema:'synthetic-p5-xss-control-v1',appId:'ludus',appVersion:version,status:'passed',failures:[],summary:{failed:0}});
  write('qa-p5-axe-runtime-report.json',{schema:'synthetic-p5-axe-control-v1',appId:'ludus',appVersion:version,status:'passed',scriptsExecuted:true,summary:{blockers:0,failed:0}});
  let r=run();must(r.status===0,'LU-N15 positive control: valid complete report set must pass P5 certification',r);
  const browserPath=path.join(dist,'qa-p3-browser-report.json'), qualityPath=path.join(dist,'quality-report.json');
  const browser=JSON.parse(fs.readFileSync(browserPath,'utf8'));browser.status='failed';write('qa-p3-browser-report.json',browser);
  r=run();must(r.status!==0&&((r.stdout||'')+(r.stderr||'')).includes('report.browser.passed'),'LU-N15 negative control: browser status failed must fail P5',r);
  browser.status='passed';write('qa-p3-browser-report.json',browser);
  const quality=JSON.parse(fs.readFileSync(qualityPath,'utf8'));quality.status='passed';quality.summary={...(quality.summary||{}),failed:1};write('quality-report.json',quality);
  r=run();must(r.status!==0&&((r.stdout||'')+(r.stderr||'')).includes('quality.no-failures'),'LU-N15 negative control: quality summary.failed > 0 must fail P5 even if status says passed',r);
  fs.writeFileSync(qualityPath,fs.readFileSync(path.join(root,'dist','quality-report.json')));
  r=run();must(r.status===0,'LU-N15 recovery/positive control: restored valid report set must pass',r);
  console.log(JSON.stringify({status:'PASS',mode:'synthetic-complete-report-set',axeRequired:true,controls:4,positive:2,negative:2,note:'This proves P5 certification logic, not live Chromium runtime behavior.'},null,2));
}catch(e){console.error(e.stack||e);process.exitCode=1}finally{fs.rmSync(tmp,{recursive:true,force:true});}
