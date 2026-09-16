# LUDUS 1.16.24 — AI Studio auto-patch manifest contract

Datum: 2026-09-16

Patch kandidát určený k ověření automatické promotion v AI Studiu z baseline 1.16.23.

## Změny
- opraveno přepisování `dist/studio-manifest.json` v `scripts/apply-ghrab-platform.mjs`;
- výsledný manifest zachovává canonical GHRAB Platform kontrakt vyžadovaný `sync-registry.mjs` AI Studia;
- `scripts/ghrab-platform-conformance.mjs` kontroluje publikovaný manifest po buildu a brání návratu této regrese;
- všechny aktuální provozní/versionované identity aplikace jsou sjednoceny na 1.16.24;
- PWA cache je `ghrab-ludus-v1.16.24`;
- pedagogická logika, enginy, AI prompty a GARP 2.5.1 tooling nejsou věcně měněny.

## Bezpečnostní stav
Historické bezpečnostní reporty a PREP evidence 1.16.23 zůstávají historickými důkazy a nejsou zpětně přeznačovány na 1.16.24. Pro tento patch se znovu spouští aktuální build, platform conformance, GARP 2.5.1 statické brány a P5 regresní sada.

School-server production: NEPOVOLENO bez samostatného LIVE schválení. Reálná studentská data: NEPOUŽÍVAT.

## AI Studio dispatch
- deploy workflow používá jednotný secret `AI_STUDIO_DISPATCH_TOKEN`;
- bez secretu je deployment fail-closed a nepokračuje;
- po úspěšném GitHub Pages deploymentu workflow čeká, až živý `studio-manifest.json` hlásí verzi 1.16.24;
- teprve potom odešle do `Daniel22-dev/AI-Studio-GHRAB` událost `repository_dispatch` typu `app-updated` s `app_id: ludus`;
- tím se spustí okamžitá synchronizace a ověření patch promotion ve Studiu, místo čekání na plánovaný noční běh.
