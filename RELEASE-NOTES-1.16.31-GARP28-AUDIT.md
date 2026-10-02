# LUDUS 1.16.31 — GARP 2.8 audit hardening

Date: 2026-10-02

## Scope

Bezpečnostní patch podle auditu GARP 2.8. UI/UX, pedagogická logika, workflow aplikace, závislosti, GHRAB Platform, přístupová brána AI Studia a připnuté SHA GitHub Actions se nemění.

## Změny

1. Přidán `public/frame-guard.js` v přesném znění auditu S-BRW-12. Build jej vkládá jako první klasický skript bezprostředně za CSP meta do všech 13 HTML stránek; same-origin rám AI Studia je povolen, cizí origin a opaque sandbox jsou blokovány.
2. `frame-guard.js` je součástí `CORE_ASSETS` service workeru.
3. Při vytváření samostatné studentské hry LUDUS frame guard odstraní společně s deployment access gate. Nasazené stránky zůstávají chráněné, existující izolovaný náhled a stažené offline hry se nezablokují.
4. `sanitizeTechnicalText()` odstraňuje také holý Google API klíč `AIza…` a hodnoty parametrů `key`, `api_key` a `apikey`.
5. `npm test` obsahuje regresní kontrolu frame guardu na všech 13 buildových stránkách a samostatný unit test sanitizace klíče.

## Ověření

- `npm test` musí projít s `CHROMIUM_PATH` nastaveným stejně jako v CI.
- Nezávislé GARP 2.8 browser ověření clickjackingu/CSP zůstává následným krokem podle auditu.
