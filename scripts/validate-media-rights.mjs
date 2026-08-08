#!/usr/bin/env node
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
const root=path.resolve('.'); const registry=JSON.parse(fs.readFileSync(path.join(root,'media/registry.json'),'utf8')); const rights=JSON.parse(fs.readFileSync(path.join(root,'media/rights-records.json'),'utf8'));
const requested=String(process.env.LUDUS_MEDIA_PROFILE||'unofficial').toLowerCase(); const profile=requested==='official'?'official':'unofficial'; const privateAck=process.env.LUDUS_PRIVATE_MEDIA_ACK==='1';
const publicStatuses=new Set(rights.releasePolicy?.publicReleaseAllowedStatuses||[]); const records=new Map((rights.records||[]).map(r=>[r.id,r])); const failures=[],warnings=[],checked=[];
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
if(registry.policy?.defaultBuildProfile!=='unofficial') failures.push('Veřejný výchozí profil musí být unofficial.');
if(rights.releasePolicy?.defaultProfile!=='unofficial') failures.push('Výchozí rights profil musí být unofficial.');
if(profile==='official'&&!privateAck) failures.push('Official média lze sestavit jen jako soukromý owner-controlled add-on s LUDUS_PRIVATE_MEDIA_ACK=1.');
for(const [engineId,engine] of Object.entries(registry.engines||{})) for(const [role,item] of Object.entries(engine.variants?.official||{})){
 if(!item?.path) continue; const rec=records.get(item.rightsRecordId); if(!rec) failures.push(`${engineId}/${role}: chybí rights record`); const source=path.join(root,item.path);
 if(!fs.existsSync(source)){ if(profile==='official') failures.push(`${engineId}/${role}: chybí soukromé zdrojové médium`); } else if(hash(source)!==item.sha256) failures.push(`${engineId}/${role}: SHA-256 nesedí`);
 const publicAllowed=item.publishable===true&&rec?.publicRelease===true&&publicStatuses.has(rec?.rightsStatus); if(publicAllowed) warnings.push(`${engineId}/${role}: médium je označeno jako veřejně distribuovatelné; ověřte licenční důkaz.`);
 checked.push({engineId,role,path:item.path,rightsRecordId:item.rightsRecordId,publicAllowed,privateOnly:!publicAllowed});
}
const result={schema:'ludus-media-rights-validation-v3',profile,privateAck,checked,failures,warnings,status:failures.length?'failed':'passed'}; console.log(JSON.stringify(result,null,2)); if(failures.length) process.exit(1);
