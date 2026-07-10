# LUDUS

Dílna výukových her.

## Aktuální stav

Verze: **1.14.2**

## Provozní verdikt

Jádro LUDUS 1.14.2 je připraveno jako oficiální interní školní nástroj. Hratelné exporty jsou povoleny pouze enginům s pravdivě ověřeným `builderCompatible: true`; rozpracované náhledové enginy zůstávají v katalogu, ale nemohou vytvořit nefunkční HTML výstup. Stav `ready` je vyhrazen produkčně ověřeným enginům.

- build: `npm run build`
- testy: `npm test`
- zdroj dílny: `src/index.html`
- samostatné enginy: `engines/*.html`
- kanonický katalog enginů: `engines/manifest.json`
- PWA soubory: `public/`
- dokumentace: `docs/` a `docs/manualy/`

## Manifest enginů

`engines/manifest.json` je hlavní místo pro běžná metadata enginů. LUDUS z něj po načtení přebírá zejména:

- `status` hry (`ready`, `draft`, `planned`),
- `gameId`, `skinId`, `mechanicId` a `gameKey`,
- soubor enginu (`file` / `url`),
- `flowModel`, podporované typy cvičení, jazyky a brand režimy,
- `builderCompatible` (zda lze bezpečně vytvořit hratelný export),
- `capabilities`, `contract` a `progressApi`.

`src/index.html` obsahuje ještě fallback registr pro případ, kdy se manifest nenačte, například při lokálním otevření přes `file://`.

## PWA verze

LUDUS obsahuje instalovatelnou PWA vrstvu: manifest, service worker a vlastní ikony. Build kopíruje složku `public/` do `dist/`.

## Učitelský režim

Každý engine má sjednocený bezpečnostní vstup:

- logo `#ludusBadge` vlevo nahoře,
- 3× ťuknutí do 1,2 s,
- URL přepínač `?teacher=1`,
- standardní záchranný dock pro učitele,
- export / kopírování základního učitelského reportu.

Jednotlivé hry mohou mít vlastní bohatší učitelský panel. Standardní dock je pojistka, aby učitel nemusel u každé hry hledat jiný vstup.

## Testy

Spusť:

```bash
npm test
npm run build
```

Testy hlídají manifest, pravdivé pole `builderCompatible`, existenci engine souborů, CZ/EN standardní vrstvu, progress API, verze dokumentace/PWA cache, syntaxi všech vložených skriptů, nepřítomnost tvrdě vloženého Gemini klíče a to, že se nevrací stará aktivace učitele jménem.

## Dokumentace

- `docs/PROVOZNI_NASAZENI_LUDUS.md` — pravidla oficiálního interního provozu.
- `docs/ENGINE_RELEASE_CHECKLIST.md` — povinná brána před označením enginu jako hotového.
- `docs/SABLONY_UCIVA_LUDUS.md` — knihovna hotových šablon a doporučené použití.
- `docs/manualy/` — závazná sada manuálů 00–07.

## 1.14.2

- Přidán přímý lokální import z AI Studia GHRAB přes krátkodobou předávku `ghrab-handoff-v1`.
- Přidán ruční import souborů `ghrab-material-v1` a `LUDUS_CONTENT v2`.
- Podporované strukturované úlohy se převádějí na stanice a připraví hratelný engine, třídní soutěž i lesson pack bez dalšího AI volání.
- Předávka se po načtení smaže; data se neposílají na server.
- Zvýšena PWA cache na `ludus-pwa-v1.14.2`.

## 1.14.1

- Všechny hry se stavem `draft` / rozpracovaná nyní v katalogu svítí fialově, včetně enginů označených „pouze náhled“.
- Zeslabené zůstávají pouze plánované světy bez hotového enginu.
- Exportní způsobilost se dál pravdivě rozlišuje štítkem „export k testování“ nebo „pouze náhled“; vizuální stav už se s technickou kompatibilitou nemíchá.
- Do kroku Svět přibylo tlačítko **Zpět na mechaniky** a do kroku Obsah tlačítko **Zpět na světy**. Na mobilu jsou tlačítka široká a při posouvání zůstávají přichycená nahoře.
- Zvýšena PWA cache na `ludus-pwa-v1.14.1`, aby se po nasazení nenačítalo staré rozhraní.

## 1.14.0

- Všech 12 existujících enginů má jednotný přepínač CZ/EN, bilingvní učitelský dock a report.
- Stav vývoje je oddělen od exportní způsobilosti přes `builderCompatible`; náhledový engine už nemůže vytvořit rozbitý HTML export.
- Laughworks a Stranger Things byly opraveny tak, aby skutečně používaly obsah vložený dílnou místo vlastního dema.
- Orient Express, Matrix a Indiana Jones jsou pravdivě označeny jako náhledové, dokud nedostanou plný adaptér svého speciálního herního flow.
- Opravena lokalizace Chronosu, přepínání bootovací animace Matrixu, duplicitní patičky a legacy anglická kopie Middle-earth.
- Lara Croft / Tomb Raider je zobrazena jako plánovaný svět mechaniky Quest.
- Přidány přísnější validační testy, GitHub Actions kontrola, provozní dokumentace a povinný release checklist enginů.
- Sjednocena čísla verzí v `package.json`, README, PWA dokumentaci a service worker cache.

## 1.12.0

- Přidány rozpracované enginy Lovci relikvií a Kostka osudu.
- Pokračovala unifikace učitelského režimu, owner footeru a PWA nasazení.

## 1.10.1

- Sjednoceno ukládání rozehraných her napříč hotovými enginy.
- Každý hotový engine deklaruje LUDUS progress API v1: `saveProgress`, `loadProgress`, `resumeProgress`, `clearProgress`, `getProgressSummary`.
- Pas hry a `engines/manifest.json` ukazují schopnost save/load/resume.

## Napojení na AI Studio GHRAB

Build vytváří veřejný soubor `dist/studio-manifest.json`. AI Studio z něj automaticky načítá aktuální verzi, stav, adresu a metadata LUDUSu.

Pro okamžitou synchronizaci nastav v repozitáři secret `AI_STUDIO_DISPATCH_TOKEN`. Bez něj Studio změnu zachytí při pravidelné hodinové kontrole.

Verze 1.14.2 obsahuje přímý Studio Bridge v1 a ruční import `ghrab-material-v1` / `LUDUS_CONTENT v2`. Podporované úlohy převádí na stanice a může připravit hratelný engine, třídní soutěž a lesson pack bez dalšího AI volání.
