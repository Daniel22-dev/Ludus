#!/usr/bin/env node
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('public/access/error-reporter.js','utf8');
const start=source.indexOf('function sanitizeTechnicalText');
if(start<0) throw new Error('sanitizeTechnicalText not found');
let brace=source.indexOf('{',start), depth=0, end=-1;
for(let i=brace;i<source.length;i++){
  if(source[i]==='{') depth++;
  else if(source[i]==='}' && --depth===0){end=i+1;break;}
}
if(end<0) throw new Error('sanitizeTechnicalText extraction failed');
const fnSource=source.slice(start,end);
const clipText=(value,max=5000)=>String(value??'').slice(0,max);
const ctx={clipText};
vm.createContext(ctx);
vm.runInContext(`${fnSource}; globalThis.__sanitize=sanitizeTechnicalText;`,ctx);
const googleProbe='AI'+'za'+'A'.repeat(30);
const canaries=[
  'teacher@example.invalid',
  'Bearer ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  'api_key='+googleProbe,
  'access_token=TOPSECRETTOKENVALUE1234567890',
  'prompt="STUDENT_PRIVATE_CONTENT_938471"',
  'student data=Jane Doe 4A8 private answer'
];
const joined=canaries.join(' | ');
const out=ctx.__sanitize(joined,2000);
const forbidden=['teacher@example.invalid','ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',googleProbe,'TOPSECRETTOKENVALUE1234567890','STUDENT_PRIVATE_CONTENT_938471','Jane Doe 4A8 private answer'];
const leaked=forbidden.filter(x=>out.includes(x));
if(leaked.length){console.error(JSON.stringify({status:'FAIL',negativeControl:'SHNC-08',leaked},null,2));process.exit(1);}
console.log(JSON.stringify({status:'PASS',negativeControl:'SHNC-08',sanitized:true,output:out},null,2));
