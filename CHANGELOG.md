# Changelog

Všechny významné změny LUDUSu jsou vedeny na jednom místě. Verze odpovídá `package.json`, aplikaci, PWA cache i manuálu.

## 1.16.1 — 2026-07-15

Mediální opravná verze: Bradavicím bylo vráceno původní intro a soundtrack a vznikl trvalý systém správy médií pro oficiální a alternativní varianty.

### Změněno

- média jsou uložena mimo HTML v `media/<hra>/<varianta>/`,
- `media/registry.json` eviduje soubory, hash, stav práv a závazné pravidlo „varovat, nikoli automaticky mazat“,
- engine přepíná intro a soundtrack podle varianty `official` / `safe`,
- dílna při exportu vloží pouze média vybrané varianty přímo do HTML, takže hra zůstává offline,
- build kopíruje mediální složku do `dist/media`,
- validace ověřuje existenci, SHA-256, velikost, propojení enginu a funkci offline vložení,
- Bradavické intro (MP4) a soundtrack (MP3) byly obnoveny z uživatelem dodané verze 1.15.0.

## 1.16.0 — 2026-07-15

Auditní opravná verze: odstraněna nekonečná překladová smyčka, opraveno dělení týmů, striktní vazba svět + mechanika, CI brána, PWA registrace a bezpečnější export enginů.

### Opraveno

- překladová vrstva enginů už v klidu nepřepisuje DOM a nevytěžuje hlavní vlákno,
- třídní soutěž správně čte jeden tým z každého řádku,
- dílna použije engine jen pro přesnou kombinaci světa a mechaniky,
- interní diagnostika je znovu zelená a běží také v automatické validaci,
- nasazení na GitHub Pages proběhne pouze po úspěšném `npm test`,
- service worker se registruje i po pozdějším spuštění chráněných skriptů,
- PWA cache má bezpečné fallbacky a vlastní stabilní `id`,
- export vkládá obsah přes DOM namísto křehké řetězcové náhrady `<head>`,
- redundantní `middle-earth-en.html` byl odstraněn,
- tehdejší nedoložené vložené audio/video bylo dočasně odstraněno; od verze 1.16.1 je obnoveno v řízeném mediálním registru,
- trvalé uložení Gemini klíče vyžaduje výslovné potvrzení,
- chybné JSON odpovědi modelu mají srozumitelnou hlášku.

### Dokumentace

- LUDUS je označen jako pilotní interní nástroj, nikoli jako schválený produkční systém,
- dokumentace výslovně uvádí, že statické hry nejsou určeny pro klasifikované testování,
- offline fungují exportované hry; otevření chráněné dílny vyžaduje ověření přes AI Studio,
- přidány `LICENSE` a `docs/MEDIA_PROVENANCE.md`.

## 1.15.0

Anonymní technické metriky výstupů bez témat, promptů a identity uživatele.

## 1.14.6

Integrovaný interaktivní manuál.

## 1.14.5

Oprava umístění centrálního přístupového bootstrapu.

## 1.14.4

Zpřesnění stavů enginů a kontraktu `builderCompatible`.
