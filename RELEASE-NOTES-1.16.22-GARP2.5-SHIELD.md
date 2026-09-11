# LUDUS 1.16.22 — GARP 2.5.1 SHIELD corrective candidate

Datum: 2026-09-11

Toto je bezpečnostní opravný kandidát po nezávislé kontrole 1.16.21. Pedagogická logika, enginy, prompty a AI instrukce nejsou věcně měněny.

## Hlavní změny
- aktualizovaný kumulativní GARP 2.5.1 tooling s opravou LU-N2 a rozšířeným secret scanem;
- service worker splňuje fail-closed security-critical routing a kryje `integrity-status.json`;
- opravený zdrojový i deployment SBOM s nezávislým verifierem;
- rozšířený AI assurance fingerprint o egress/runtime/build hranice;
- least-privilege CI a oddělený read-only sync AI Core / write-only PR job;
- striktní P5 report status, build-time P3 critical-asset guard a SW postbuild gate;
- evidence manifest v2, source snapshot, provenance baseline commit + delta;
- PREP release integrity zůstává neprodukční; GitHub Pages je výslovně mimo RI-PREP.

Produkční school-server approval: NE. Reálná studentská data: NE.
