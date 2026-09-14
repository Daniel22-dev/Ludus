# LUDUS 1.16.23 — audit médií a distribučního profilu

Datum: 14. 9. 2026

## Výsledek
- Dodaný zdrojový balík neobsahuje žádné soubory MP4/MP3/WAV/OGG/WEBM.
- `media/registry.json` eviduje Bradavické intro a soundtrack jako volitelný profil `official/private-only`, `owner-supplied-unverified`, `publishable:false`, `legalDetermination:false`.
- `media/rights-records.json` stanoví `publicRelease:false` a výchozí profil `unofficial`.
- Standardní `npm run build` i `npm run build:school-server` používají profil `unofficial`.
- `npm run validate:media`, standardní build, media QA, `npm test` i school-server build prošly.
- Po buildu nejsou v `dist/` ani `dist-school-server/` žádná audio/video média uvedeného typu.

## Oprava dokumentace
Kořenový README obsahoval starý text, že registrovaná tematická média jsou součástí běžného GitHub a school-server buildu. Tento text odporoval skutečné release policy a build skriptům. README je v tomto balíku opraven bez změny runtime nebo verze aplikace.

## Právní dopad
LUDUS 1.16.23 lze v Příloze A rámcové dohody ponechat. Předmětem školní licence je předaná školní verze v profilu `unofficial`; volitelná `official/private-only` média nejsou součástí školní verze ani licence, dokud nejsou samostatně právně vypořádána a výslovně předána.
