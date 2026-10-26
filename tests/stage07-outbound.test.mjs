import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = path.dirname(HERE);
let js;
if (fs.existsSync(path.join(BASE,'src/index.html'))) {
  const html = fs.readFileSync(path.join(BASE,'src/index.html'),'utf8');
  assert.ok(html.includes('/* STAGE07 LUDUS LAZY-BOOTSTRAP BEGIN */') &&
    html.includes('/* STAGE07 LUDUS LAZY-BOOTSTRAP END */'), 'E7 lazy bootstrap must be in protected builder');
  assert.ok(html.includes("import('./runtime/stage07-outbound.js?v=1.16.32')"),
    'Full E7 module must be lazily loaded only when export is requested');
  assert.ok(!html.includes('function mapPackToMaterial'), 'E7 full module must not inflate builder entry');
  js=fs.readFileSync(path.join(BASE,'runtime/stage07-outbound.js'),'utf8');
} else js=fs.readFileSync(path.join(BASE,'modules/stage07-outbound.js'),'utf8');
const sandbox={module:{exports:{}}, TextEncoder, URL, console};
vm.runInNewContext(js,sandbox,{filename:'ludus-stage07.js',timeout:5000});
const {mapPackToMaterial, trustedStudioRoot} = sandbox.module.exports;
assert.equal(typeof mapPackToMaterial,'function');
const ISO='2026-10-26T07:00:00.000Z';
const ID='ludus-12345678-1234-4234-8234-123456789012';
const o=(changes={})=>({topic:'Relative clauses',subject:'English',objectives:['Recognize and use clauses'],
  level:'B1',yearGroup:'2A8',id:ID,now:ISO,appVersion:'1.16.32',privacyConfirmed:true,...changes});
const station=(type,qs,extra={})=>({id:0,name:'Stanice',icon:'◇',atmo:'VIP game',reward:{score:999},ex:{type,qs},...extra});
function samplePack(){return {schema:1,meta:{teacher:'PROTECTED TEACHER',apiKey:'SENSITIVE',skin:'premium',students:['A','B']},
  houses:[{name:'TEAM SECRET',score:9000,studentId:'Private-001'}],
  scoreBoard:{score:3000},
  stations:[
    station('mc4',[{t:'Choose the right tense',opts:['A','B','C','D'],a:2,exp:'Because it happened.'}]),
    station('mc2',[{t:'Is it correct?',opts:['True','False'],a:0,exp:'Correct.'}]),
    station('wordbank',[{t:'Complete the phrase',bank:['did','does'],a:'did',exp:'Auxiliary in past.'}]),
    station('roleplay',[{t:'Unsupported hidden engine'}]),
  ],boss:{reward:'secret'}};}
const errCode=(callback,code)=>assert.throws(callback,e=>e?.code===code);

test('deterministic Material v1 task mapping with required metadata',()=>{
  const a=mapPackToMaterial({pack:samplePack(),...o()});
  const b=mapPackToMaterial({pack:samplePack(),...o()});
  assert.equal(JSON.stringify(a),JSON.stringify(b));
  assert.equal(a.material.schema,'ghrab-material-v1');
  assert.equal(a.material.id,ID);
  assert.equal(a.material.version,1);
  assert.equal(a.material.level,'B1');
  assert.equal(a.material.yearGroup,'2A8');
  assert.equal(a.material.content.tasks.length,3);
  assert.deepEqual(Array.from(a.material.content.tasks,t=>t.type),['select','truefalse','short']);
  assert.equal(a.material.content.tasks[0].answer,2);
  assert.equal(a.material.content.tasks[0].explanation,'Because it happened.');
  assert.equal(a.material.content.tasks[2].answer,'did');
  assert.equal(a.material.quality.status,'ai-draft');
  assert.equal(a.material.provenance.containsPersonalData,false);
  assert.ok(a.warnings.some(s=>s.includes('unsupported-roleplay')));
  assert.ok(a.warnings.includes('final-challenge-not-exported'));
  assert.equal(a.excludedStations,1);
});
test('explicit whitelist never exports team/score/teacher/engine/key/secrets',()=>{
  const {material}=mapPackToMaterial({pack:samplePack(),...o()});
  const json=JSON.stringify(material);
  for(const secret of ['TEAM SECRET','PROTECTED TEACHER','SENSITIVE','Private-001','premium','VIP game','999','9000']){
    assert.ok(!json.includes(secret),`leaked: ${secret}`);
  }
  assert.deepEqual(Object.keys(material.content).sort(),['sourceText','tasks','vocabulary']);
});
test('round-trip select + truefalse + short retains supported semantics and explanations',()=>{
  const original=[
    {id:'src-1',type:'select',prompt:'Question one',options:['a','b','c'],answer:2,explanation:'Because C'},
    {id:'src-2',type:'truefalse',prompt:'Statement true?',options:['True','False'],answer:0,explanation:'It is'},
    {id:'src-3',type:'short',prompt:'Write did',options:['did','does'],answer:'did',explanation:'Past'},
  ];
  // Mirrors the actual source Studio -> LUDUS normalization observed in src/index.html:
  const pack={schema:1,stations:original.map(t=>({ex:t.type==='select'?{type:'mc4',qs:[{t:t.prompt,opts:t.options,a:t.answer,exp:t.explanation}]}:
    t.type==='truefalse'?{type:'mc2',inst:t.prompt,qs:[{t:t.prompt,opts:t.options,a:t.answer,exp:t.explanation}]}:
      {type:'wordbank',qs:[{t:t.prompt,bank:t.options,a:t.answer,exp:t.explanation}]}}))};
  const round=mapPackToMaterial({pack,...o()}).material.content.tasks;
  assert.equal(round.length,3);
  assert.deepEqual(Array.from(round,t=>t.type),original.map(t=>t.type));
  for(let i=0;i<round.length;i++){
    assert.equal(round[i].answer,original[i].answer);
    assert.equal(round[i].explanation,original[i].explanation);
  }
});
test('unsupported engine mechanics produce explicit warnings and partial export',()=>{
  const result=mapPackToMaterial({pack:samplePack(),...o()});
  assert.ok(result.warnings.includes('game-world-engine-skin-and-team-runtime-not-exported'));
  assert.ok(result.warnings.includes('station-4-unsupported-roleplay'));
});
test('all unsupported mechanics fail closed instead of emitting an empty material',()=>{
  errCode(()=>mapPackToMaterial({pack:{schema:1,stations:[station('combat',[{t:'x'}])]},...o()}),'NO_PORTABLE_TASKS');
});
test('unsupported answers, duplicate choices and missing answer are dropped',()=>{
  const pack={schema:1,stations:[station('mc4',[
    {t:'Invalid index',opts:['A','B'],a:100},
    {t:'Duplicate',opts:['A','A'],a:0},
    {t:'Good question',opts:['A','B'],a:1},
  ])]};
  const r=mapPackToMaterial({pack,...o()});
  assert.equal(r.exportedTasks,1);
  assert.ok(r.warnings.some(x=>x.endsWith('question-1-unsupported')));
  assert.ok(r.warnings.some(x=>x.endsWith('question-2-unsupported')));
});
test('classify and yesno map into supported typed questions',()=>{
 const pack={schema:1,stations:[
  {...station('classify',[{t:'Select category',a:1,exp:'B'}]),ex:{type:'classify',opts:['A','B'],qs:[{t:'Select category',a:1,exp:'B'}]}},
  {...station('yesno',[{t:'Is it correct?',a:0}]),ex:{type:'yesno',opts:['YES','NO'],qs:[{t:'Is it correct?',a:0}]}}
 ]};
 const r=mapPackToMaterial({pack,...o()});
 assert.equal(r.exportedTasks,2);
 assert.equal(r.material.content.tasks[0].type,'select');
 assert.equal(r.material.content.tasks[1].type,'truefalse');
});
test('only explicitly ordered tasks remain order, no inference from wordbank',()=>{
 const pack={schema:1,stations:[station('order',[{t:'Arrange',opts:['first','second'],a:['second','first']}]),station('wordbank',[{t:'Write phrase',bank:['first','second'],a:'first second'}])]};
 const a=mapPackToMaterial({pack,...o()});
 assert.equal(a.material.content.tasks[0].type,'order');
 assert.deepEqual(Array.from(a.material.content.tasks[0].answer),['second','first']);
 assert.equal(a.material.content.tasks[1].type,'short');
});
test('email and student identifiers in task content are blocked',()=>{
 const pack={schema:1,stations:[station('mc4',[{t:'Send to student@example.edu',opts:['A','B'],a:0}])]};
 errCode(()=>mapPackToMaterial({pack,...o()}),'PRIVATE_OR_ACTIVE_CONTENT');
});
test('active HTML, media and JS URLs in content are blocked',()=>{
 for(const prompt of ['<script>alert(1)</script>','<img src=x onerror=alert(1)>','javascript:alert(1)','blob:private'] ){
  const pack={schema:1,stations:[station('mc4',[{t:prompt,opts:['A','B'],a:0}])]};
  errCode(()=>mapPackToMaterial({pack,...o()}),'PRIVATE_OR_ACTIVE_CONTENT');
 }
});
test('privacy affirmation is mandatory',()=> { errCode(()=>mapPackToMaterial({pack:samplePack(),...o({privacyConfirmed:false})}), 'ANONYMITY_NOT_CONFIRMED'); });
test('mandatory title / subject and real app version validation',()=>{
 errCode(()=>mapPackToMaterial({pack:samplePack(),...o({subject:''})}),'MISSING_TEXT');
 errCode(()=>mapPackToMaterial({pack:samplePack(),...o({topic:''})}),'MISSING_TEXT');
 errCode(()=>mapPackToMaterial({pack:samplePack(),...o({appVersion:'0'})}),'INVALID_APP_VERSION');
});
test('material size and task bounds are capped',()=>{
 const pack={schema:1,stations:[station('mc4',[{t:'Q'.repeat(6001),opts:['A','B'],a:0}])]};
 errCode(()=>mapPackToMaterial({pack,...o()}),'OVERSIZED_TEXT');
});
test('wrong/unsupported schema fails',()=> { errCode(()=>mapPackToMaterial({pack:{schema:2,stations:[]},...o()}), 'INVALID_LUDUS_PACK'); });
test('CEFR is not fabricated from generic grade/skin',()=>{
 const a=mapPackToMaterial({pack:samplePack(),...o({level:'A2-B1'})});
 assert.ok(!Object.prototype.hasOwnProperty.call(a.material,'level'));
});
test('exact same-origin Studio roots only, no direct GIT/Differentiator URLs',()=>{
 const a='https://daniel22-dev.github.io/Ludus/';
 assert.equal(trustedStudioRoot('/AI-Studio-GHRAB/',a),'https://daniel22-dev.github.io/AI-Studio-GHRAB/');
 errCode(()=>trustedStudioRoot('https://evil.example/AI-Studio-GHRAB/',a),'STUDIO_URL_UNTRUSTED');
 errCode(()=>trustedStudioRoot('/AI-Studio-GHRAB/../generator-testu/',a),'STUDIO_URL_UNTRUSTED');
 errCode(()=>trustedStudioRoot('/AI-Studio-GHRAB/?danger=1',a),'STUDIO_URL_UNTRUSTED');
});
test('UI uses DOM text safely and official Studio helper only',()=>{
 assert.ok(js.includes("textContent = 'Pedagogický export do AI Studia'"));
 assert.ok(js.includes("import('/AI-Studio-GHRAB/integration/save-to-studio.js')"));
 assert.ok(js.includes("import('/ai-studio/integration/save-to-studio.js')"));
 assert.ok(!js.includes('import(new URL('), 'no arbitrary computed module import');
 assert.ok(js.includes("access?.appId !== 'ludus' || access.granted !== true"));
 assert.ok(!/generator-testu|\/diferenciator\//i.test(js));
 assert.ok(!/innerHTML\s*=/.test(js));
});

test('no fabricated pedagogical difficulty or CEFR is exported from game runtime',()=>{
 const r=mapPackToMaterial({pack:samplePack(),...o({level:'',yearGroup:''})});
 assert.equal(r.material.content.tasks.every(x=>!Object.hasOwn(x,'difficulty')),true);
 assert.equal(Object.hasOwn(r.material,'level'),false);
});
test('two-choice quiz without a boolean meaning stays select, not truefalse',()=>{
 const pack={schema:1,stations:[station('mc2',[{t:'Pick a tense',opts:['Past Simple','Present Perfect'],a:1,exp:'Contextual use'}])]};
 const r=mapPackToMaterial({pack,...o()}).material.content.tasks[0];
 assert.equal(r.type,'select');assert.equal(r.answer,1);assert.equal(r.explanation,'Contextual use');
});
test('truefalse recognizes reverse boolean labels, without inventing a truth value',()=>{
 const pack={schema:1,stations:[station('mc2',[{t:'True?',opts:['No','Yes'],a:1}])]};
 const t=mapPackToMaterial({pack,...o()}).material.content.tasks[0];
 assert.equal(t.type,'truefalse');assert.equal(t.answer,1);
});
test('ambiguous duplicated ordering items cannot masquerade as lossless order',()=>{
 const pack={schema:1,stations:[
  station('order',[{t:'Ambiguous',opts:['a','a','b'],a:['a','b','a']}]),
  station('mc4',[{t:'Valid',opts:['A','B'],a:0}])
 ]};
 const r=mapPackToMaterial({pack,...o()});
 assert.equal(r.exportedTasks,1);assert.ok(r.warnings.includes('station-1-question-1-unsupported'));
});
test('invalid ordering with duplicate answer or lost choice is omitted with warning',()=>{
 const pack={schema:1,stations:[
  station('order',[{t:'Invalid',opts:['a','b','c'],a:['a','a','c']}]),
  station('mc4',[{t:'Valid',opts:['A','B'],a:0}])
 ]};
 const r=mapPackToMaterial({pack,...o()});
 assert.equal(r.exportedTasks,1); assert.ok(r.warnings.includes('station-1-question-1-unsupported'));
});
test('overlong word banks must not be silently truncated during export',()=>{
 const pack={schema:1,stations:[
  station('wordbank',[{t:'Too many words',bank:Array.from({length:31},(_,i)=>'word-'+i),a:'word-0'}]),
  station('mc4',[{t:'Valid',opts:['A','B'],a:1}])
 ]};
 const r=mapPackToMaterial({pack,...o()});
 assert.equal(r.exportedTasks,1); assert.ok(r.warnings.includes('station-1-question-1-unsupported'));
});
test('more than 40 objectives is rejected explicitly rather than being truncated',()=>{
 errCode(()=>mapPackToMaterial({pack:samplePack(),...o({objectives:Array(41).fill('Use examples')})}), 'OBJECTIVES_LIMIT');
});
test('source material rejects task answers with private e-mail or active markup',()=>{
 const emails={schema:1,stations:[station('wordbank',[{t:'Answer',bank:['safe'],a:'teacher@example.cz'}])]};
 errCode(()=>mapPackToMaterial({pack:emails,...o()}),'PRIVATE_OR_ACTIVE_CONTENT');
 const attacks={schema:1,stations:[station('wordbank',[{t:'Answer',bank:['safe'],a:'<svg/onload=alert(1)>'}])]};
 errCode(()=>mapPackToMaterial({pack:attacks,...o()}),'PRIVATE_OR_ACTIVE_CONTENT');
});
test('no hidden task metadata can appear by copying engine fields',()=>{
 const pack={schema:1,stations:[{...station('mc4',[{t:'Question',opts:['a','b'],a:0}]),
  scoreboard:{score:999},runtime:{teacher:'HIDDEN-PERSON',apiKey:'LOCAL-KEY'},skin:'premium'}],
  meta:{teacher:'LOCAL-TEACHER',studentID:'private',key:'MY-SECRET'},houses:[{name:'private-team',score:1000}]};
 const material=mapPackToMaterial({pack,...o()}).material;
 assert.deepEqual(Object.keys(material.content.tasks[0]).sort(),['answer','explanation','id','options','prompt','type']);
 for(const forbidden of ['MY-SECRET','private-team','LOCAL-KEY','HIDDEN-PERSON','LOCAL-TEACHER'])assert.ok(!JSON.stringify(material).includes(forbidden));
});
