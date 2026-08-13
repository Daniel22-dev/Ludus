## 1.16.12 — sjednocení reportéru (2026-08-13)

- Reportér používá dvoukrokové vytvoření a skutečné stažení diagnostického ZIPu; Gmail je dostupný až po kliknutí na stažení.
- Rozhraní i e-mail vyžadují ruční přiložení ZIPu a pomocné video je bezpečně skryté uvnitř reportéru i při scrollování.
- Regresní sada fyzicky ověřuje stažený ZIP, jeho snímky a diagnostiku, jednu instanci reportéru, motivy, mobilní zobrazení a klávesnici.
- Herní enginy, média a jejich licence nebyly měněny; PWA cache je `ghrab-ludus-v1.16.12`.

## 1.16.11 — P5 (2026-08-05)
### CI hotfix 2026-08-08
- Opraveny GitHub QA brány podle reálných axe/visual/combinatorial/media evidence artefaktů.
- Zachována politika private official médií: veřejný source je nemusí obsahovat, přítomné soukromé soubory se hashově ověřují a public dist je nesmí balit.



## 1.16.11 — P5 R2

- Veřejný a školní build používá profil unofficial a neobsahuje nedoložená oficiální média.
- Official média jsou oddělena do soukromého owner-controlled doplňku.
- Doplněny přístupné názvy polí hráčů a runtime audit všech enginů.


- Předprodukční akceptace bez povinného školního serveru.
- Nulové otevřené automatické a11y nálezy jsou podmínkou P5 brány.
- Přidán aktualizovaný release-acceptance kontrakt a odložený GitHub upload.

# Changelog

## 1.16.9 — P4 FINAL (2026-08-04)

- Finální certifikace, čisté buildy, přístupnost, výkon, bezpečnost a release evidence.
- Přidána povinná `qa:p4:ci` brána.

## 1.16.8 - 2026-08-04 (P3)

- Platforma 1.1.0, pristupnost, performance budgety a modularizace P3.

## 1.16.7 — P2: sjednocení platformy GHRAB (2026-08-04)

- jeden kanonický školní logotyp a jednotná autorská patička;
- GHRAB Platform 1.0.0: motiv, storage namespace s vratnou migrací, Studio Bridge 2.0 a artifact envelope v1;
- jednotný název PWA cache `ghrab-ludus-v1.16.7` a řízená aktualizace;
- platformní konformitní test je součástí buildu a CI.


## 1.16.6 — P1 (2026-08-04)

- Produkční bezpečnost, serverový profil, datové manifesty a jednotná observability vrstva.
- GHRAB AI Core 1.0.0 a přepínání direct-gemini / school-gateway.

# Changelog

## 1.16.5 — 2026-08-04

- Etapa P0: service worker už nezmrazuje centrální Access Guard, bootstrap všech enginů používá server-ready konfiguraci a reportér neblokuje start.
## 1.16.4 – Sjednocený reportér chyb ve všech stránkách LUDUSu

- hlavní dílna i samostatné enginy používají jednu lokální kopii společného reportéru AI Studia;
- centrální reportér app-guardu je vypnutý, takže na žádné stránce nevzniká dvojí tlačítko ani dvojí sada posluchačů;
- adaptér rozpozná explicitní motiv a u starších enginů bezpečně odvodí světlý či tmavý vzhled z pozadí;
- reportér je součástí PWA cache a manuál odkazuje na aktuální centrální návod;
- herní mechaniky, média a exporty zůstaly beze změny.

## 1.16.3 – Aktuální manuál uvnitř AI Studia

- interaktivní manuál byl ověřen a aktualizován pro současné mechaniky, světy, importy a výstupy LUDUSu;
- tlačítko manuálu otevírá příručku ve stejném pracovním rámci místo nové karty;
- zvýšena verze PWA cache, aby se změna načetla i ve dříve nainstalované aplikaci.

## 1.16.2

- Engine Stranger Things se po pozdním uvolnění centrální brány spustí i tehdy, když již proběhl `DOMContentLoaded`; prázdná obrazovka pod krycí vrstvou je opravena.

- Překladová vrstva nahrazuje krátké tokeny pouze jako samostatná slova; vlastní jména jako JONES ani slova CONSOLE, NOON, OFFLINE a OKLAHOMA se již nepoškodí.

- zavedena jednotná certifikační brána GHRAB QA Standard 1.0.1;
- doplněny skutečné Chromium screenshoty hlavní dílny a všech herních enginů;
- release verdikt je vázán na verzi a SHA-256 buildu a bez deployed smoke testu zůstává AUTOMATED_READY.

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
