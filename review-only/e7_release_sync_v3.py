#!/usr/bin/env python3
"""Review-only version alignment for an isolated E7 checkout, never production."""
import json,sys
from pathlib import Path
root=Path(sys.argv[1]).resolve();OLD='1.16.31';NEW='1.16.32'
def once(rel,a,b):
 p=root/rel;s=p.read_text(encoding='utf8')
 assert s.count(a)==1,(rel,a,s.count(a))
 p.write_text(s.replace(a,b),encoding='utf8',newline='\n')
def rd(p):return json.loads((root/p).read_text(encoding='utf8'))
def wr(p,x):(root/p).write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
for name in ('chronos','dnd','hogwarts','indiana-jones','jumanji','laughworks','lotr','matrix','orient-express','star-wars','stranger-things'):
 p=root/'engines'/f'{name}.html';s=p.read_text(encoding='utf8')
 for marker in (f'LUDUS STANDARD BLOCK START v{OLD}',f'LUDUS STANDARD BLOCK END v{OLD}',f'data-ludus-shared-runtime="{OLD}"',f'data-ghrab-app-version="{OLD}"',f'data-ludus-privacy-runtime="{OLD}"'):
  assert s.count(marker)==1,(name,marker)
 p.write_text(s.replace(OLD,NEW),encoding='utf8',newline='\n')
once('runtime/ludus-engine-runtime.js',"var VERSION='1.16.31'","var VERSION='1.16.32'")
once('runtime/ludus-privacy.js',"const VERSION='1.16.31';","const VERSION='1.16.32';")
once('public/sw.js','ghrab-ludus-v1.16.31','ghrab-ludus-v1.16.32')
rel='public/config/release-acceptance.json';r=rd(rel)
assert r['appId']=='ludus' and r['appVersion']==OLD
r['appVersion']=NEW;wr(rel,r)
once('README.md','**Aktuální verze:** 1.16.31','**Aktuální verze:** 1.16.32')
once('README.md','Verze: **1.16.31**','Verze: **1.16.32**')
p=root/'README_PWA.md';s=p.read_text(encoding='utf8')
assert s.count(OLD)>=3
p.write_text(s.replace(OLD,NEW),encoding='utf8',newline='\n')
p=root/'CHANGELOG.md';s=p.read_text(encoding='utf8')
assert s.startswith('# Changelog\n\n## 1.16.31 ')
entry=(f'## {NEW} — 2026-10-26 — E7 pedagogický Material Flow do AI Studia\n\n'
       '- Nové učitelské předání přenositelného pedagogického obsahu z LUDUS do Mých materiálů v AI Studiu; herní runtime, skóre a identifikace se nepřenášejí.\n'
       '- Platform 1.1.3 opravuje ověření cílového versionRange pouze na příjemci; zachována přístupová kontrola, checksum a jednorázové převzetí.\n'
       '- Synchronizována verze PWA, jedenácti herních enginů, privacy runtime, exportního manifestu a AI operations; bez tvrzení o dokončeném autorizovaném UAT.\n\n')
p.write_text(s.replace('# Changelog\n\n','# Changelog\n\n'+entry,1),encoding='utf8',newline='\n')
once('scripts/apply-ghrab-platform.mjs','      bridgeMaxBytes: consumer.bridge.maxBytes,','      bridgeMaxBytes: consumer.bridge.maxBytes,\n      bridgeWriteLegacy: false,')

pkg_path=root/'package.json'
pkg=rd('package.json')
assert pkg['version']==NEW
for key in ('garp25:sbom','garp25:sbom:check','garp25:sbom:verify',
            'garp25:sbom:deploy','garp25:sbom:deploy:check',
            'garp25:sbom:deploy:school-future'):
 command=pkg['scripts'].get(key)
 assert isinstance(command,str) and command.count('ludus-'+OLD)==1,(key,command)
 pkg['scripts'][key]=command.replace('ludus-'+OLD,'ludus-'+NEW)
wr('package.json',pkg)
once('scripts/generate-cyclonedx-sbom.mjs',"{name:'ghrab-platform',version:'1.1.2'","{name:'ghrab-platform',version:'1.1.3'")
once('scripts/generate-cyclonedx-sbom.mjs',"'ghrab/ghrab-platform-manifest-1.1.2.json'","'ghrab/ghrab-platform-manifest-1.1.3.json'")

once('scripts/qa-garp-security.mjs',"check('version.package',pkg.version==='1.16.31',pkg.version);","check('version.package',pkg.version==='1.16.32',pkg.version);")

source_updates={
 'scripts/qa-garp27-contract.mjs':[("pkg.version==='1.16.31'","pkg.version==='1.16.32'")],
 'scripts/qa-garp27-mutations.mjs':[("appVersion:'1.16.31'","appVersion:'1.16.32'")],
 'scripts/qa-garp23-security.mjs':[("pkg.version==='1.16.31'","pkg.version==='1.16.32'")],
 'scripts/qa-garp23-privacy-lifecycle.mjs':[("appVersion:'1.16.31'","appVersion:'1.16.32'")],
 'scripts/qa-garp25-ai-resource.mjs':[("version:'1.16.31'","version:'1.16.32'")],
 'scripts/qa-pc01-suite-session.mjs':[
  ('ghrab-manual-progress-ludus-1.16.31','ghrab-manual-progress-ludus-1.16.32'),
  ("platformVersion:'1.1.2'","platformVersion:'1.1.3'")],
 'scripts/qa-p3-quality.mjs':[("consumer.platform?.version === '1.1.2'","consumer.platform?.version === '1.1.3'")],
 'scripts/qa-p3-browser.mjs':[("'>=1.1.2 <2.0.0'","'>=1.1.3 <2.0.0'")],
 'scripts/qa-p3-axe.mjs':[("'>=1.1.2 <2.0.0'","'>=1.1.3 <2.0.0'")],
}
for rel,pairs in source_updates.items():
 for old,new in pairs:once(rel,old,new)

ui_file=root/'tests/stage07-ui-transport.test.mjs'
test_source=ui_file.read_text(encoding='utf8')
assert test_source.count('NOT-FOR-EXPORT')==2
ui_file.write_text(test_source.replace('NOT-FOR-EXPORT','TEST_SYNTHETIC_KEY_NOT_A_SECRET'),
                   encoding='utf8',newline='\n')

print('E7 REVIEW: 11 engines, privacy runtime, PWA, release docs and v2-only bridge config aligned.')
