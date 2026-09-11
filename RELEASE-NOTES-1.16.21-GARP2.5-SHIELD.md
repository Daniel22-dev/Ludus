# LUDUS 1.16.21 — GARP 2.5.1 SHIELD-PREP

Datum: 2026-09-10

## Účel
Kumulativní delta migrace hotové aplikace LUDUS 1.16.20 na GARP 2.5.1 SHIELD-PREP podle Promptu D. Jde o kandidáta pro nezávislou kontrolu Prompt E, nikoli produkční schválení.

## Bezpečnostní změny
- zavedeno GARP 2.5.1 TOOLING-R2 a jeho fail-closed release/integrity tooling;
- opraven service-worker freeze boundary: security-critical assety se neprecacheují a jdou network-only/no-store;
- zaveden autoritativní `security/security-critical-assets.json`;
- přidán CycloneDX 1.7 SBOM a drift check;
- přidán AI assurance fingerprint a pravidlo zneplatnění evidence při změně AI boundary;
- build podporuje deterministický `GHRAB_BUILD_TIME`;
- source a deployment artefakt jsou oddělené;
- doplněny threat model, attack surface, deployment requirements, resource budget, crosswalk, exception/debt a RI/key-custody evidence.

## Co se funkčně nemění
- AI operace zůstávají `topic-analysis` a `game-content-generation`;
- model/provider/system-instruction boundary nebyla funkčně měněna;
- storage/import/export datové toky nebyly funkčně měněny;
- aplikace není agentická (`AGENTIC=NO`), model nevolí nástroje ani autonomní side effecty.

## Stav
- GARP 2.5.1 tooling selftest: PASS 43/43.
- GARP 2.3 local security: PASS 48/48.
- legacy GARP gate: PASS 49/49.
- suite-session: PASS 27/27.
- SHIELD-PREP: AMBER do nezávislého Prompt E review.
- SHIELD-LIVE / RI-LIVE: NOT TESTED, školní server není připojen.
- Reálná studentská data: tímto kandidátem nejsou schválena.
