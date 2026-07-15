# LUDUS 1.16.1 — komentář k médiím a budoucím auditům

## Co bylo změněno

Bradavické intro video a soundtrack byly obnoveny z původního uživatelem dodaného balíčku. Nejsou znovu vloženy jako obří Base64 bloky přímo ve zdrojovém `hogwarts.html`; jsou vedeny jako samostatné soubory:

```text
media/hogwarts/official/intro.mp4
media/hogwarts/official/soundtrack.mp3
```

Engine je načítá podle zvolené varianty. Dílna při stažení samostatné hry převede pouze média právě zvolené varianty na datové zdroje uvnitř výsledného HTML. Výsledná hra je tedy stále jeden offline soubor.

## Proč je toto řešení lepší

- zdrojový engine zůstává přehledný a malý,
- video a hudba se dají vyměnit bez zásahu do tisíců řádků HTML,
- `official` a `safe` mohou mít úplně jiné intro i soundtrack,
- veřejný safe export nedostane oficiální média,
- interní official export dostane pouze oficiální média,
- audit ověřuje soubor a hash, ale automaticky ho nemaže,
- při chybějícím médiu se daná část korektně přeskočí.

## Závazné pravidlo pro další audity

Registrované médium se smí odstranit nebo nahradit pouze na výslovný pokyn vlastníka aplikace. Chybějící nebo neověřený právní záznam je důvod k upozornění, nikoli k automatickému zásahu do kódu.

Strojově čitelné pravidlo je v `media/registry.json`; lidsky čitelný postup v `docs/MEDIA_PROVENANCE.md` a `media/README.md`.

## Jak přidávat média příště

Pro každou hru se používá tato struktura:

```text
media/<hra>/official/intro.mp4
media/<hra>/official/soundtrack.mp3
media/<hra>/safe/intro.mp4
media/<hra>/safe/soundtrack.mp3
```

Není nutné dodat všechny čtyři soubory najednou. Prázdná varianta intro přeskočí a bez soundtracku zůstanou běžné zvukové efekty hry.

Po vložení souborů se:

1. doplní cesty do enginu,
2. doplní `media/registry.json`,
3. vypočtou nové SHA-256,
4. spustí `npm test`,
5. v Chromiu se ověří spuštění videa a zvuku,
6. ověří se offline export official i safe varianty.

## Aktuální výsledek Bradavic

- intro: MP4, H.264/AAC, 848 × 450, přibližně 5,064 s,
- soundtrack: MP3 stereo, přibližně 16,562 s,
- intro i soundtrack se po kliknutí současně spustily v reálném Chromiu,
- official offline export média obsahuje,
- safe export oficiální média neobsahuje.
