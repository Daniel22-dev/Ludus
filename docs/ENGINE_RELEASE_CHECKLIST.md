# LUDUS — checklist vydání enginu

Engine smí být označen `ready` až po splnění všech bodů.

## Datový kontrakt

- [ ] Přijme kanonický `LUDUS_CONTENT v2` z dílny.
- [ ] Bez tichého přepsání použije vložené stanice, otázky a jazyk.
- [ ] Neplatný nebo neúplný obsah skončí srozumitelným fallbackem, nikoli pádem.
- [ ] `builderCompatible` je pravdivě nastaveno a ověřeno testem.

## Jazyk

- [ ] Start v češtině je celý česky.
- [ ] Start v angličtině je celý anglicky.
- [ ] Přepnutí CZ → EN → CZ funguje bez zbytkových textů.
- [ ] Překládá se učitelský panel, dialogy, titulky, tlačítka, aria-labely a report.

## Funkce

- [ ] Kompletní průchod od úvodu po výsledek.
- [ ] Všechny deklarované typy cvičení.
- [ ] Uložení, načtení, pokračování a smazání postupu.
- [ ] Učitelský režim přes trojklik i `?teacher=1`.
- [ ] Export nebo kopie učitelského reportu.
- [ ] Mobilní a desktopové rozlišení, klávesnice a základní přístupnost.

## Tematické a publikační režimy

- [ ] Interní brandovaná varianta.
- [ ] Veřejná safe varianta bez chráněných názvů a postav.
- [ ] Správné přepnutí obrázků, názvů a textů mezi režimy.
- [ ] `official` a `safe` mají správně přiřazené vlastní intro a soundtrack nebo výslovně prázdný fallback.
- [ ] Média jsou zapsána v `media/registry.json`; audit je nesmí automaticky odstranit.
- [ ] Offline export obsahuje pouze média zvolené varianty.

## Release

- [ ] `npm test` bez chyby.
- [ ] `npm run build` bez chyby.
- [ ] Browser smoke test bez page errorů.
- [ ] Manifest, verze, changelog a dokumentace aktualizovány.
