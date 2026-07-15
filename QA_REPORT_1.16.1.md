# QA report — LUDUS 1.16.1

Datum ověření: 15. 7. 2026

## Předmět vydání

Obnova Bradavického intro videa a soundtracku a zavedení trvalého systému správy médií pro varianty `official` a `safe`.

## Automatické testy

Spuštěno:

```bash
npm ci
npm test
```

Výsledek:

- produkční build: PASS,
- kontrola 11 HTML enginů: PASS,
- interní diagnostika dílny: PASS,
- klidový test enginu a i18n: PASS,
- integrita mediálního registru: PASS,
- SHA-256 a velikost Bradavických médií: PASS,
- kopie médií do `dist/media`: PASS,
- vložení pouze zvolené varianty do offline exportu: PASS,
- safe export bez oficiálního média, pokud safe soubor není dodán: PASS.

Validace záměrně vypisuje dvě neblokující výstrahy: technický audit neověřuje oprávnění k použití dodaného Bradavického videa a soundtracku. Podle nové politiky se registrované soubory zachovají a audit pouze upozorní.

## Technická kontrola médií

### Intro

- soubor: `media/hogwarts/official/intro.mp4`,
- kontejner: MP4,
- video: H.264, 848 × 450,
- zvuková stopa videa: AAC stereo, 44,1 kHz,
- délka: 5,063958 s,
- velikost: 1 019 636 B,
- SHA-256: `47479798aa100a6fd83d1e9ce4f5a4f351c70b469cc1c76347e8c05915c8bc7a`.

### Soundtrack

- soubor: `media/hogwarts/official/soundtrack.mp3`,
- formát: MP3 stereo, 44,1 kHz,
- délka dle ffprobe: 16,561633 s,
- velikost: 265 403 B,
- SHA-256: `161ccb0055b39c99529f422910fa16ef28f9e247c44ec99e03d17e02403021d2`.

## Browser smoke test

Reálný headless Chromium načetl engine s vloženými skutečnými daty médií:

- vybraná varianta: `official`,
- video `readyState`: 4,
- naměřená délka videa: 5,063958 s,
- audio `readyState`: 4,
- naměřená délka audia v Chromium: 16,509388 s,
- po kliknutí na vstup do Bradavic video běželo (`paused = false`, čas > 0),
- současně běžel soundtrack (`paused = false`, čas > 0),
- postupné zesílení soundtracku fungovalo.

Jediná konzolová výstraha testovacího prostředí se týkala zakázaného `localStorage` v neprůhledném dokumentu vytvořeném přes `page.set_content`; nesouvisí s médii ani s běžným HTTP/GitHub Pages provozem.

## Výsledek

**PASS.** Bradavické intro a soundtrack jsou obnovené a funkční. Zdrojový engine zůstává malý, média se spravují samostatně a stažená hra dostane pouze média vybrané varianty přímo do offline HTML.
