> **Historický dokument:** Tento audit popisuje starší stav řady 1.14.x a není zdrojem aktuálního provozního verdiktu. Aktuální stav je v `AUDIT_IMPLEMENTACE_1.16.0.md`, `CHANGELOG.md` a `QA_REPORT_1.16.0.md`.

# LUDUS 1.14.0 — hloubkový audit č. 2

Datum: 10. července 2026

## Verdikt

**Ano: jádro LUDUS 1.14.0 je připraveno stát se oficiálním interním školním nástrojem.**

Tento verdikt se vztahuje na dílnu, manifest, exportní ochrany, jazykovou vrstvu, dokumentaci a produkčně označené enginy. Neznamená, že všechny rozpracované herní světy jsou hotové. LUDUS nyní tuto hranici hlídá technicky: stav enginu a schopnost přijímat obsah z dílny jsou oddělené a neověřený engine nemůže vytvořit rozbitý HTML export.

## Silné stránky

- výrazná a jednotná vizuální identita,
- promyšlený tříkrokový tok mechanika → svět → obsah,
- samostatné offline HTML hry bez žákovských účtů,
- interní brandovaný a veřejný safe režim,
- centrální manifest enginů a jejich schopností,
- učitelský režim, uložení postupu a report,
- PWA/GitHub Pages distribuce,
- knihovna šablon a oddělení jazyka UI, obsahu a podpory.

## Závažné nálezy a provedené opravy

1. **Deklarovaná dvojjazyčnost nebyla všude skutečná.** Všechny existující enginy dostaly společnou CZ/EN vrstvu, přepínač, překlad učitelského panelu a obousměrné přepnutí.
2. **Některé rozpracované enginy ignorovaly nebo přepisovaly obsah z dílny.** Laughworks nyní používá vložený obsah před demem; Stranger Things umí převést stanice a cvičení z builderu.
3. **Jiné enginy vyžadují speciální datový dialekt.** Orient Express, Matrix a Indiana Jones jsou pravdivě označeny jako „pouze náhled“ a jejich hratelný export je blokován.
4. **Stav `draft` se dříve choval jako automaticky hratelný.** Nové pole `builderCompatible` samostatně řídí exportní způsobilost.
5. **Společný učitelský panel a report byly pouze česky.** Nyní respektují zvolený jazyk.
6. **Chronos mohl v úvodu zobrazit `[object Object]`.** Lokalizace úvodního textu byla opravena.
7. **Legacy `middle-earth-en.html` byl oddělený anglický duplikát.** Nyní používá udržovanou dvojjazyčnou implementaci.
8. **Některé stránky měly duplicitní vlastnickou patičku.** Duplicitní prvky jsou odstraněny společnou vrstvou.
9. **Matrix mohl při přepnutí jazyka ponechat rozepsaný český bootovací řádek.** Animace se při změně jazyka bezpečně ukončí a překreslí.
10. **Validační testy byly příliš mělké.** Kontrolují unikátní identifikátory, cs/en, `builderCompatible`, smlouvu, progress API, syntaxi skriptů a přítomnost společné vrstvy.
11. **Chyběla automatická kontrola na GitHubu.** Přidán workflow `Validate LUDUS` pro test a build při pushi a pull requestu.
12. **Aplikace se stále popisovala jako pilot.** Dokumentace byla převedena na provozní nasazení s jasným release procesem.
13. **Lara Croft nebyla v roadmapě.** Je přidána do mechaniky Quest jako plánovaný svět v češtině i angličtině; engine se zatím záměrně nevytváří.

## Stav enginů

### Produkčně doporučené

- Enginy se stavem `ready` a `builderCompatible: true`.

### Rozpracované s exportem k testování

- Enginy ve stavu `draft`, které prokazatelně přijímají obsah z dílny. Nejsou ještě označeny jako produkčně hotové; před povýšením musí projít `docs/ENGINE_RELEASE_CHECKLIST.md`.

### Pouze náhled

- Orient Express / Frostline Detective,
- Matrix / Illusion Detective,
- Indiana Jones / Relic Hunters.

Tyto světy zůstávají dostupné pro další vývoj a vizuální kontrolu, ale dílna z nich nevytvoří hratelný export, dokud nebude dokončen jejich vlastní adaptér a celý herní průchod.

## Podmínky dlouhodobě profesionálního provozu

- Nepovyšovat engine na `ready` bez kompletního checklistu.
- Do AI nevkládat osobní ani citlivé údaje žáků; podklady anonymizovat.
- Veřejně sdílet jen safe tematické varianty.
- Každé vydání ověřit testem, buildem a browser smoke testem.
- Udržovat jednu kanonickou implementaci každého enginu a pouze řízené aliasy.

## Závěr

LUDUS už není jen demonstrátor konceptu. Verze 1.14.0 má dostatečně jasný provozní model, ochranu proti nefunkčním kombinacím, jednotnou jazykovou a učitelskou vrstvu, pravdivý katalog enginů a automatizovanou kontrolu. Jako platforma může být oficiálně používána; jednotlivé nové enginy budou postupně získávat produkční status až po samostatném QA.
