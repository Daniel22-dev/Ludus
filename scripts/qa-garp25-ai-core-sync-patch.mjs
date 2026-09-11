#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const root=process.cwd();const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'ludus-ai-core-patch-'));
const run=(cmd,args,cwd,opts={})=>spawnSync(cmd,args,{cwd,encoding:'utf8',...opts});
const must=(cond,msg,r)=>{if(!cond){console.error(`FAIL: ${msg}`);if(r)console.error((r.stdout||'')+(r.stderr||''));process.exitCode=1;throw new Error(msg)}};
const filter=(src)=>{const rel=path.relative(root,src).split(path.sep).join('/');return !(/^(?:\.git|node_modules|dist|dist-school-server|qa-results|test-results|coverage)(?:\/|$)/.test(rel)||/^security\/evidence(?:\/|$)/.test(rel));};
try{
  const repo=path.join(tmp,'repo');fs.cpSync(root,repo,{recursive:true,filter});
  let r=run('git',['init','-q'],repo);must(r.status===0,'git init',r);run('git',['config','user.email','synthetic@example.invalid'],repo);run('git',['config','user.name','GARP synthetic'],repo);
  r=run('git',['add','-A'],repo);must(r.status===0,'git add baseline',r);r=run('git',['commit','-qm','baseline'],repo);must(r.status===0,'git commit baseline',r);
  const syntheticDir=path.join(repo,'vendor','ghrab-ai-core-9.9.9');fs.mkdirSync(syntheticDir,{recursive:true});fs.writeFileSync(path.join(syntheticDir,'sync-regression-sentinel.txt'),'synthetic new core artifact\n');
  const consumerPath=path.join(repo,'ghrab-ai-core.consumer.json');const consumer=JSON.parse(fs.readFileSync(consumerPath,'utf8'));consumer.syncPatchRegressionNonce='synthetic';fs.writeFileSync(consumerPath,JSON.stringify(consumer,null,2)+'\n');
  r=run('git',['add','-A','--','vendor','ghrab-ai-core.consumer.json','scripts/sync-ghrab-ai-core.mjs'],repo);must(r.status===0,'stage sync change set',r);
  r=run('git',['diff','--cached','--binary','--','vendor','ghrab-ai-core.consumer.json','scripts/sync-ghrab-ai-core.mjs'],repo);must(r.status===0&&r.stdout.includes('vendor/ghrab-ai-core-9.9.9/sync-regression-sentinel.txt'),'staged patch must include untracked new core artifact',r);const patch=r.stdout;
  const patchFile=path.join(tmp,'sync.patch');fs.writeFileSync(patchFile,patch);
  const clean=path.join(tmp,'clean');r=run('git',['clone','-q',repo,clean],tmp);must(r.status===0,'clone clean baseline',r);r=run('git',['reset','--hard','HEAD~0'],clean);must(r.status===0,'clean checkout',r);
  // repo HEAD is baseline; staged test changes are not part of clone. Apply exported patch exactly as write job does.
  r=run('git',['apply','--check',patchFile],clean);must(r.status===0,'git apply --check exported patch',r);r=run('git',['apply',patchFile],clean);must(r.status===0,'git apply exported patch',r);
  must(fs.existsSync(path.join(clean,'vendor','ghrab-ai-core-9.9.9','sync-regression-sentinel.txt')),'new core artifact must exist after git apply');
  r=run('npm',['run','build'],clean,{env:{...process.env,LUDUS_MEDIA_PROFILE:'unofficial'}});must(r.status===0,'build after applying staged sync patch',r);
  console.log(JSON.stringify({status:'PASS',newCoreDirCaptured:true,gitApply:true,buildAfterApply:true},null,2));
}catch(e){if(!process.exitCode){console.error(e.stack||e);process.exitCode=1}}finally{fs.rmSync(tmp,{recursive:true,force:true});}
