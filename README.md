# LUDUS

Dílna výukových her pro interní pilotní provoz Gymnázia, Ostrava-Hrabůvka.

## Aktuální stav

Verze: **1.16.1**

LUDUS je připraven k řízenému školnímu pilotu. Jednotlivé hry se posuzují samostatně podle stavu v `engines/manifest.json`; označení `ready` znamená produkčně ověřený engine, `draft` rozpracovanou hru a `planned` pouze plán. Export je dovolen jen enginům s `builderCompatible: true`.

- build: `npm run build`
- testy: `npm test`
- zdroj dílny: `src/index.html`
- samostatné enginy: `engines/*.html`
- kanonický katalog enginů: `engines/manifest.json`
- PWA soubory: `public/`
- dokumentace: `docs/`

## Důležité provozní omezení

**LUDUS není nástroj pro klasifikované testování.** Exportované hry jsou samostatné statické HTML soubory. Učitelský režim lze otevřít parametrem `?teacher=1` a řešení jsou technicky součástí souboru. LUDUS je určen pro výuku, procvičování, opakování a formativní zpětnou vazbu, nikoli pro zabezpečené známkované testy.

Při práci s obsahem je nutná anonymizace. Do AI generování se nevkládají jména žáků, individuální hodnocení ani jiné osobní či citlivé údaje.

## Manifest enginů a volba hry

`engines/manifest.json` je hlavní zdroj metadat enginů. Dílna z něj načítá zejména:

- stav hry (`ready`, `draft`, `planned`),
- přesnou dvojici `skinId` + `mechanicId`,
- soubor enginu (`file` / `url`),
- podporované typy cvičení, jazyky a režimy brandingu,
- `builderCompatible`, `capabilities`, `contract` a `progressApi`.

Engine se nyní vybírá **výhradně podle přesné kombinace světa a mechaniky**. Dílna už nesmí tiše nahradit zvolenou mechaniku jiným enginem stejného světa. `src/index.html` obsahuje fallback registr pro lokální otevření přes `file://`, ale zachovává stejné pravidlo.

## PWA a offline provoz

LUDUS obsahuje instalovatelnou PWA vrstvu s vlastní identitou, service workerem a ikonami. Samotná dílna je však chráněna centrální přístupovou bránou AI Studia, jejíž ověření vyžaduje síť. Proto není slibován plně offline start chráněné dílny.

**Hotové exportované hry fungují offline** jako samostatné HTML soubory. To je doporučený režim pro výuku bez spolehlivého internetu.

## Média her a pravidlo pro budoucí audity

Každá hra může mít samostatné intro a soundtrack pro variantu `official` i `safe`. Soubory jsou mimo HTML v `media/<hra>/<varianta>/` a jejich technická evidence je v `media/registry.json`. Dílna při exportu vloží do samostatného HTML pouze média aktuálně zvolené varianty; export proto funguje offline a nenese média druhé varianty.

**Registrovaná média se při auditu automaticky nemažou.** Audit kontroluje funkčnost, formát, velikost a integritu a může upozornit na neověřená práva. Odstranění nebo náhrada proběhne pouze na výslovný pokyn vlastníka aplikace. Za oprávnění k použití a veřejné distribuci dodaného materiálu odpovídá osoba, která médium dodala nebo publikaci schválila.

Aktuálně mají Bradavice obnoveno původní intro i soundtrack v `official` variantě. `safe` varianta je připravena na vlastní odlišná média.

## Učitelský režim

Každý engine má sjednocený vstup:

- logo `#ludusBadge` vlevo nahoře,
- 3× rychlé klepnutí,
- URL parametr `?teacher=1`,
- standardní učitelský dock,
- export nebo kopírování základního reportu.

Tento režim je praktická pomůcka, nikoli bezpečnostní ochrana před žáky.

## Testy a CI

Spuštění lokálně:

```bash
npm ci
npm test
```

`npm test` vytvoří produkční build a spustí statické i behaviorální regresní testy. Kontroluje mimo jiné:

- syntaxi zdrojových a vygenerovaných skriptů,
- konzistenci manifestu, verzí a PWA cache,
- přesné párování světa a mechaniky,
- funkční dělení týmů v třídní soutěži,
- výsledek interní diagnostiky dílny,
- klidový stav standardního bloku enginů bez nekonečných DOM mutací,
- integritu registrovaných médií, jejich hashů a oddělení variant,
- vložení pouze vybrané mediální varianty do offline exportu,
- ochranu proti tvrdě vloženému API klíči,
- dostupnost licence a evidence původu médií.

GitHub Actions spouští `npm test` samostatně při pushi a pull requestu a znovu před nasazením na GitHub Pages. Pro skutečně povinnou bránu je na GitHubu vhodné zapnout ochranu větve `main` a vyžadovat zelený check **Validate LUDUS**.

## Dokumentace

- `CHANGELOG.md` — jediný zdroj pravdy pro historii verzí.
- `AUDIT_IMPLEMENTACE_1.16.0.md` — vyhodnocení a realizace hloubkového auditu.
- `QA_REPORT_1.16.1.md` — aktuální ověřovací protokol médií a exportu.
- `QA_REPORT_1.16.0.md` — historický ověřovací protokol auditní opravy.
- `docs/PROVOZNI_NASAZENI_LUDUS.md` — pravidla pilotního provozu.
- `docs/ENGINE_RELEASE_CHECKLIST.md` — povinná brána před stavem `ready`.
- `docs/MEDIA_PROVENANCE.md` — evidence médií a jejich původu.
- `docs/SABLONY_UCIVA_LUDUS.md` — doporučené šablony učiva.
- `docs/manualy/` — sada manuálů 00–07.

## Napojení na AI Studio GHRAB

Build vytváří `dist/studio-manifest.json`. AI Studio z něj načítá aktuální verzi, stav, adresu a metadata LUDUSu.

Pro okamžitou synchronizaci lze v repozitáři nastavit secret `AI_STUDIO_DISPATCH_TOKEN`. Bez něj Studio změnu zachytí při pravidelné kontrole.

LUDUS 1.16.1 podporuje Studio Bridge v1 a ruční import `ghrab-material-v1` / `LUDUS_CONTENT v2`. Podporované strukturované úlohy převádí na stanice a připraví engine, třídní soutěž nebo lesson pack bez dalšího AI volání.

## Licence

Zdrojový kód a školní identita jsou chráněny podmínkami v souboru `LICENSE`. Veřejný repozitář automaticky neuděluje právo aplikaci převzít, dále šířit nebo komerčně využívat.
