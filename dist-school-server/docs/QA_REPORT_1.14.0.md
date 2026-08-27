> **Historický dokument:** Tento report se vztahuje k verzi 1.14.0 a jeho tehdejší provozní verdikt není platný pro aktuální stav. Pro verzi 1.16.0 použijte `../QA_REPORT_1.16.0.md` a `../AUDIT_IMPLEMENTACE_1.16.0.md`.

# LUDUS 1.14.0 — závěrečný QA report

Datum: 10. července 2026

## Automatické kontroly

- `npm test`: **PASS**
- `npm run build`: **PASS**
- 15 manifestových záznamů zkontrolováno
- 12 HTML enginů zkontrolováno na syntaxi, standardní blok, jazykový přepínač, učitelský režim a report
- GitHub Actions workflow pro průběžnou validaci přidán

## Jazyková kontrola

Browser smoke test ověřil u všech 12 existujících enginů přepnutí:

- CZ → EN: **PASS**
- EN → CZ: **PASS**
- `document.documentElement.lang`: **PASS**
- společná vrstva `window.LUDUS_I18N`: **PASS**

U Matrixu bylo navíc ověřeno, že se po přepnutí zastaví původní rozepsaná bootovací animace a zobrazí se kompletní anglický text.

Poznámka k testovacímu prostředí: při vložení obřího Hogwarts HTML do anonymního `about:blank` dokumentu Chromium hlásí omezení `localStorage`. Samotný jazykový test i převzetí obsahu prošly; toto omezení se netýká běžného provozu z GitHub Pages, kde má aplikace vlastní origin.

## Datový kontrakt dílny

Všechny enginy označené `builderCompatible: true` byly spuštěny se syntetickým obsahem vloženým stejným způsobem jako v dílně. Ve vnitřním herním modelu byl ověřen unikátní testovací marker:

- Hogwarts / Akademie Arkána: **PASS**
- Star Wars / Hvězdní rytíři: **PASS**
- LOTR / Rozlomené království: **PASS**
- Chronos / Časová hlídka: **PASS**
- Stranger Things / Javorová rokle: **PASS**
- Laughworks / Továrna na smích: **PASS**
- Jumanji / Zakletá aréna: **PASS**
- Middle-earth legacy alias: **PASS**
- D&D / Kostka osudu: **PASS**

## Ochrana před nefunkčním exportem

Browser test potvrdil:

- Orient Express / Frostline Detective: `builderCompatible: false`, export blokován
- Matrix / Illusion Detective: `builderCompatible: false`, export blokován
- Indiana Jones / Relic Hunters: `builderCompatible: false`, export blokován
- Lara Croft: `planned`, engine neexistuje, export blokován

## Katalog a Lara Croft

V hlavním rozhraní byla v mechanice Quest ověřena karta:

- brandovaný název: **Tomb Raider / Lara Croft**
- safe název: **Strážkyně ztracených relikvií**
- anglický safe název: **Guardian of Lost Relics**
- stav: **Plánovaná**

## Release rozhodnutí

Platforma LUDUS 1.14.0 splňuje podmínky pro oficiální interní školní provoz. Status `ready` zůstává vyhrazen jednotlivým enginům, které navíc projdou kompletním herním checklistem. Rozpracované enginy mohou být v katalogu, ale jejich exportní způsobilost je technicky oddělena a kontrolována.
