# LUDUS 1.16.0 — QA report

**Datum:** 15. 7. 2026  
**Prostředí:** Node.js 22.16.0, čistá instalace přes `npm ci`  
**Výsledek:** **PASS**

## Provedené příkazy

```bash
rm -rf node_modules dist
npm ci
npm test
```

`npm ci` nainstalovalo 39 balíčků, audit závislostí hlásil **0 zranitelností**.

## Výsledek produkčního buildu

- dílna: `dist/index.html` — přibližně 317,5 kB,
- zkontrolováno 11 unikátních HTML enginů,
- manifest: 14 katalogových záznamů,
- největší engine: `hogwarts.html` — přibližně 375,3 kB,
- žádný engine nepřekročil limit 400 kB,
- žádný engine neobsahuje skutečná vložená base64 audio/video data.

## Automatická validace

```text
LUDUS validation OK
manifest records: 14
html engines checked: 11
in-app behavior: PASS
engine idle/i18n behavior: PASS
version: 1.16.0
```

## Behaviorální testy

- interní diagnostika dílny: **34/34**,
- neexistující kombinace svět + mechanika nevrací cizí engine,
- vygenerovaná třídní soutěž se syntakticky spustí,
- tři názvy na třech řádcích vytvoří přesně tři týmy,
- standardní blok reprezentativního enginu má v klidovém stavu **0 mutací patičky za 0,5 sekundy**,
- ověřené překlady dynamických frází jsou úplné,
- testovaný přechod CZ → EN → CZ vrací původní text bez chyby `Mapaa kobky`.

## CI a nasazení

- `.github/workflows/validate.yml` spouští `npm ci` a `npm test` při pushi, pull requestu a ručním spuštění,
- `.github/workflows/deploy.yml` spouští stejnou bránu před vytvořením Pages artefaktu,
- `dist/` není určen k verzování a není součástí GitHub-ready ZIPu.

## Známá omezení

- chráněná dílna vyžaduje online ověření přes AI Studio; offline fungují hotové exportované hry,
- úplná migrace lokalizace z náhrad řetězců na klíčové `data-i18n` je plánovaný architektonický refaktor,
- školní AI proxy bez API klíče v klientovi vyžaduje samostatnou serverovou infrastrukturu,
- jednotlivé enginy se i nadále řídí vlastním stavem `ready`, `draft` nebo `planned`; úspěšný build automaticky neznamená produkční připravenost každého enginu.
