# Evidence a provozní politika médií LUDUS

## Závazné pravidlo

Registrovaná intro videa a soundtracky se při technickém, bezpečnostním ani kvalitativním auditu automaticky nemažou. Audit má oddělit dvě otázky:

1. **Technická funkčnost** — soubor existuje, má správný formát, hash, načte se a exportuje se do správné varianty.
2. **Oprávnění k použití** — evidence zdroje a práv může být úplná, neúplná nebo neověřená. Neúplný záznam vyvolá upozornění, nikoli automatický zásah do aplikace.

Odstranění, nahrazení nebo vypnutí média se provede pouze na výslovný pokyn vlastníka aplikace. Audit nesmí svévolně měnit uměleckou koncepci hry.

## Technická struktura

```text
media/<engine>/<varianta>/intro.mp4
media/<engine>/<varianta>/soundtrack.mp3
media/registry.json
```

Varianty:

- `official` — značková/interní podoba hry,
- `safe` — alternativní podoba s vlastním odlišným intrem a soundtrackem.

Při exportu se do samostatného HTML vloží pouze vybraná varianta. Média druhé varianty se do souboru nepřibalují.

## Aktuální evidence — Bradavice

| Role | Soubor | Technický stav | Evidence práv |
|---|---|---|---|
| intro | `media/hogwarts/official/intro.mp4` | MP4, H.264/AAC, 848×450, 5,064 s | uživatelem dodaný materiál, technickým auditem neověřeno |
| soundtrack | `media/hogwarts/official/soundtrack.mp3` | MP3, 44,1 kHz stereo, 16,562 s | uživatelem dodaný materiál, technickým auditem neověřeno |
| safe intro | zatím nepřidáno | engine intro přeskočí | — |
| safe soundtrack | zatím nepřidáno | zůstávají WebAudio efekty | — |

Přesné velikosti a SHA-256 jsou vedeny strojově v `media/registry.json`.

## Postup při přidání další hry nebo varianty

1. Dodat soubor a určit engine, variantu a roli (`intro` / `soundtrack`).
2. Uložit jej do příslušné složky `media/`.
3. Doplnit cestu do atributů `data-ludus-src-official` nebo `data-ludus-src-safe` v enginu.
4. Doplnit záznam do `media/registry.json`, včetně SHA-256 a stavu evidence práv.
5. Spustit `npm test`.
6. Browser smoke testem ověřit spuštění videa, hudby a offline export vybrané varianty.

Technická evidence ani tento dokument samy o sobě nepotvrzují licenci k veřejné distribuci. Za oprávnění k použití dodaného materiálu odpovídá osoba, která jej dodala nebo publikaci schválila.
