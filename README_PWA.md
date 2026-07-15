# LUDUS PWA 1.16.1

LUDUS obsahuje instalovatelnou PWA vrstvu pro pohodlné otevření dílny v samostatném okně.

## Součásti

- `public/manifest.webmanifest` — stabilní identita `/Ludus/`, název, barvy, ikony a režim `standalone`.
- `public/sw.js` — service worker s cache `ludus-pwa-v1.16.1`.
- `public/icons/` — běžné a maskable ikony pro Android.
- `scripts/build.mjs` — kopíruje PWA soubory do `dist/`.

## Důležité omezení

Přístup do dílny ověřuje centrální ochrana AI Studia. Toto ověření je mimo scope service workeru a vyžaduje síť. Instalovaná PWA proto není deklarována jako plně offline aplikace.

Hotové herní exporty jsou samostatné HTML soubory a lze je otevřít bez internetu. Pro výuku v místě s nejistým připojením je vhodné hru předem vyexportovat a uložit do zařízení.

## Instalace

1. Otevřít nasazenou adresu LUDUSu v Chromu nebo Edge.
2. Zvolit `Instalovat aplikaci` / `Přidat na plochu`.
3. Ověřit, že se LUDUS otevře ve vlastním okně a že je přístup potvrzen přes AI Studio.

## Aktualizace

Při změně PWA assetů je nutné zvýšit jméno cache v `public/sw.js` a verzi v dokumentaci. Aktuální cache: `ludus-pwa-v1.16.1`.
