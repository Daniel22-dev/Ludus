# LUDUS 1.16.30 - revize balíčku r2

**Datum:** 28. 9. 2026

**Stav:** opravený lokální zdrojový balíček. Nenahráno na GitHub, nenasazeno online.

**Verze aplikace:** 1.16.30 zůstává, protože dosud nebyla zveřejněna. `r2` označuje revizi předávaného balíčku.

## Co bylo opraveno

Sekce O aplikaci zůstává zachována včetně autora, technických verzí a rozbalovací historie. Nejsou přidány odložené bloky podpory, licence ani Práce s daty.

1. **Chybějící názvy herních průběhů.** Katalog obsahoval šest modelů, které chyběly ve slovníku `FLOW_MODELS`: `timelineRestore`, `roomsCluesAccusation`, `scenesEvidenceAccusation`, `roomsCodesFinalLock`, `stationsSynthesis`, `arenaRoundsBoss`. Doplněny české popisy. Manifesty, herní algoritmy a exportní způsobilost se nemění.
2. **Zastaralý test Laboratoře.** Původní podmínka požadovala, aby neexistoval žádný engine s mechanikou `lab`. To již neplatí kvůli `laughworks:lab`. Nová podmínka kontroluje existenci podporované dvojice svět + Laboratoř bez vlastního enginu. Samostatný test skutečné obsluhy tlačítka ověřuje tvorbu obsahu bez stahování neexistující hry.
3. **Přísnější testování.** Nový `npm run qa:catalog` je součástí `npm test` i obou P5 kontrol. Test O aplikaci již netoleruje dvě historická selhání; požaduje průchod všech diagnostických položek a předem dokončí načtení katalogu. Odstraněn alternativní in-memory režim a úprava CSP; zablokovaná navigace se vykazuje jako neúspěšný běh, nikoli jako PASS. Chybějící Chromium je ověřeno před spuštěním lokálního serveru.
4. **Evidence GARP.** Nový test byl zařazen do inventáře AI hranice, nikoli vyjmut z kontroly. Otisky a příslušné SBOM byly přegenerovány standardním postupem. Pravidla GARP, přístupová ochrana a workflow nebyly oslabeny. Rozměrové limity zůstaly stejné; zkrácen byl pouze popisný komentář katalogu.

## Skutečně provedené kontroly r2

| Kontrola | Výsledek |
|---|---|
| Nový test na původním 1.16.30 | 50/58; reprodukuje obě diagnostické chyby a šest chybějících popisů |
| `qa:catalog` po opravě | 58/58 |
| `qa:quality` | 102/102, bez varování |
| `qa:garp` v pipeline FOUNDATION | 45/45 |
| Kontrakt GARP 2.7 | 32/32 |
| Mutační testy GARP 2.7 | 9/9 |
| Suite session | 27/27 |
| PC01 | 93/93 |
| PWA, XSS inventory, dependency lock | PASS v rozsahu existujících kontrol |
| `npm run garp27:foundation` | PASS_LOCAL_TRUST_PENDING; LIVE NOT_TESTED |
| Sestavení a `scripts/validate.mjs` v `npm test` | PASS; 14 záznamů manifestu, 11 HTML enginů |
| `npm test` jako celek | **Neprošel v tomto prostředí:** končí v `qa:about` na `net::ERR_BLOCKED_BY_ADMINISTRATOR` |
| GitHub CI a nasazení | NESPUŠTĚNO; nebyl vytvořen commit |

Jednotkové testy používají skutečné definice katalogu, diagnostické podmínky, předběžné kontroly a obsluhu tlačítka. AI, stahování a prvek tlačítka jsou testovací náhrady. Testy neprovádějí živá AI volání. Procházejí větve bez enginu, plánovaného enginu, hotového enginu a neúplného zadání.

Vstupní HTML má 314 886 B z limitu 315 000 B; kritické vstupní soubory 547 397 B z 548 000 B; největší inline skript 269 793 B z 270 000 B. Rezerva HTML je pouze 114 B. Další funkce je nutné držet mimo hlavní HTML, nebo samostatně provést ověřenou modularizaci.

## Omezení ověření

Lokální prostředí poskytuje Node 22.16.0, zatímco projekt požaduje Node 24. Není deklarován čistý instalační test `npm ci`, plný P5 CI, nový UI screenshot r2 ani úspěšný test autentizovaného provozu. Původní snímky a výsledek 95/95 v adresáři `ABOUT-1.16.30` jsou historickou evidencí předchozí revize, nikoli novým výsledkem r2. Historický behavior baseline nebyl přepsán.

Volitelná oficiální média Hogwarts nadále nejsou v neoficiálním zdrojovém profilu; validátor to uvádí jako varování.

## GitHub a předání

Poslední přečtený `main` v `Daniel22-dev/Ludus` je `22586442be63f1a6127059f781652d0e2d637ddb` s verzí 1.16.29. Git tree původního nahraného ZIPu byl lokálně přepočten a přesně odpovídá stromu tohoto commitu: `4eb1b77ee2c2043d91b93b7380e8461958d781f9`.

V tomto běhu konektor zpřístupnil pouze čtecí operace, bez vytvoření commitu nebo push. Přímé stažení přes Git selhalo na DNS `github.com`; GitHub CLI není instalováno. Zápis do repozitáře ani nasazení nebyly provedeny. To není vada kódu Ludusu.

Kompletní ZIP obsahuje zdroje a oddělenou evidenci. Neobsahuje `dist`, `node_modules`, `.git` ani dočasné pracovní složky. Samostatný čitelný Git patch obsahuje zdrojové změny proti uvedenému stromu bez objemné obrazové evidence. Před použitím patche ověřit, zda se větev neposunula; `git apply --check` nic nepublikuje.
