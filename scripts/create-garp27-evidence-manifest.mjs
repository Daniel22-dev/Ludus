#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root=process.cwd(),pkg=JSON.parse(fs.readFileSync('package.json','utf8')),sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const files=[
  `security/sbom/ludus-${pkg.version}.cdx.json`,
  `security/sbom/ludus-${pkg.version}-deployment.cdx.json`,
  'security/evidence/ai-assurance-fingerprint.json'
];
for(const f of files)if(!fs.existsSync(f))throw new Error(`Missing release evidence: ${f}`);
const externalFiles=files.map(f=>({path:f,size:fs.statSync(f).size,sha256:sha(f)}));
const out={schema:'ghrab-security-evidence-manifest-v2',appId:'ludus',version:pkg.version,sourceRevision:/^[a-f0-9]{40}$/i.test(String(process.env.GITHUB_SHA||''))?process.env.GITHUB_SHA:null,sourcePackageSha256:null,createdAt:new Date().toISOString(),files:[],externalFiles};
fs.mkdirSync('security',{recursive:true});fs.writeFileSync('security/security-evidence-manifest.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({status:'PASS',schema:out.schema,appId:out.appId,version:out.version,externalFiles:externalFiles.length},null,2));
