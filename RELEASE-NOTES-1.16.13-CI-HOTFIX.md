# LUDUS 1.16.13 — CI hotfix

Opravná verze mění pořadí kroků GitHub Actions: připnuté Playwright Chromium se nainstaluje a `CHROMIUM_PATH` nastaví ještě před spuštěním `npm test`. Stejná ochrana je doplněna do validačního, nasazovacího a AI Core synchronizačního workflow.

Interní test zároveň kontroluje, že instalace prohlížeče ve všech třech workflow předchází aplikačním testům. Funkce LUDUSu, reportér a registrovaná média nebyly změněny.
