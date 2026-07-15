# LUDUS media

Média se ukládají mimo HTML enginy v této struktuře:

```text
media/<engine>/<varianta>/intro.mp4
media/<engine>/<varianta>/soundtrack.mp3
```

Podporované varianty jsou nyní `official` a `safe`. Každá varianta může mít vlastní intro i soundtrack. Chybějící soubor znamená, že se dané médium v této variantě nepoužije.

## Závazné pravidlo pro audity

Registrovaná média se při technickém nebo bezpečnostním auditu **automaticky nemažou**. Audit smí:

- ověřit existenci souboru, formát, hash a funkčnost,
- upozornit na chybějící nebo neověřený záznam práv,
- doporučit náhradu nebo omezení publikace.

Odstranění nebo nahrazení média se provede pouze na výslovný pokyn vlastníka aplikace. Evidence je v `media/registry.json` a `docs/MEDIA_PROVENANCE.md`.

Při exportu samostatné hry dílna vloží médium vybrané varianty do výsledného HTML jako datový zdroj. Export proto zůstává offline a neobsahuje média druhé varianty.
