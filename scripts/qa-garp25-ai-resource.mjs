#!/usr/bin/env node
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';

const source=fs.readFileSync('vendor/ghrab-ai-core-1.0.0/ghrab-ai-core-1.0.0.js','utf8');
const listeners=new Map();
const context={
  console, URL, URLSearchParams, TextEncoder, TextDecoder, Blob, AbortController,
  setTimeout, clearTimeout, queueMicrotask, crypto:crypto.webcrypto,
  navigator:{userAgent:'GARP25-resource-test'},
  location:new URL('https://example.invalid/Ludus/'),
  document:{documentElement:{lang:'cs'}},
  addEventListener(type,fn){listeners.set(type,fn)},
  removeEventListener(type){listeners.delete(type)},
  dispatchEvent(){return true},
  CustomEvent:class{constructor(type,init){this.type=type;this.detail=init?.detail}},
  fetch:async()=>{throw new Error('network must not be reached')}
};
context.window=context; context.globalThis=context;
vm.runInNewContext(source,context,{filename:'ghrab-ai-core-1.0.0.js'});
const AI=context.GHRAB_AI;
AI.configure({
  app:{id:'ludus',version:'1.16.23'},
  runtimeConfig:{ai:{defaultMode:'direct-gemini',selectedMode:'direct-gemini',allowedModes:['direct-gemini'],allowUserModeSelection:false,maxRequestBytes:2048,maxPartBytes:1024,requestTimeoutMs:5000,directGemini:{endpointBase:'https://generativelanguage.googleapis.com/v1beta',profileModels:{economy:'gemini-test'},fallbackModels:[],useResponseSchema:true,maxOutputTokens:8192}},telemetry:{enabled:false}},
  operations:{schema:'ghrab-ai-operations-v1',appId:'ludus',operations:{'topic-analysis':{outputSchemaId:'ludus.topic-analysis.v1',defaultModelProfile:'economy',allowedModelProfiles:['economy'],inputTypes:['text'],streaming:false,expectedOutputs:1,maxOutputTokensHint:8192}}},
  outputSchemas:{'ludus.topic-analysis.v1':{type:'object'}}
});
let result='NO_ERROR';
try {
  AI.__testing.publicRequest({operation:'topic-analysis',outputSchemaId:'ludus.topic-analysis.v1',inputParts:[{type:'text',text:'x'.repeat(1025)}]});
} catch (e) { result=e?.code || e?.message || String(e); }
if(result!=='PAYLOAD_TOO_LARGE'){
  console.error(JSON.stringify({status:'FAIL',expected:'PAYLOAD_TOO_LARGE',observed:result},null,2));
  process.exit(1);
}
console.log(JSON.stringify({status:'PASS',negativeControl:'SHNC-07',expected:'PAYLOAD_TOO_LARGE',observed:result,networkCalls:0},null,2));
