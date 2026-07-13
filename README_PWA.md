# LUDUS PWA

Tato verze přidává instalovatelnou PWA vrstvu pro LUDUS.

## Co je přidáno

- `public/manifest.webmanifest` — název, barvy, ikony a režim standalone.
- `public/sw.js` — service worker s verzovanou cache `ludus-pwa-v1.15.0`.
- `public/icons/` — ikony aplikace včetně `maskable` varianty pro Android.
- `scripts/build.mjs` kopíruje obsah `public/` do `dist/`, aby GitHub Pages nasazoval i PWA soubory.

## Instalace na mobilu

1. Po nasazení otevřít adresu GitHub Pages pro LUDUS.
2. V Chromu zvolit `⋮ → Přidat na plochu / Instalovat aplikaci`.
3. Aplikace se má zobrazit s vlastní ikonou LUDUS a otevřít v samostatném okně.

## Při další aktualizaci

Při změně PWA souborů zvednout číslo verze cache v `public/sw.js`, aby se uživatelům nedržela stará verze.

Aktuální cache: `ludus-pwa-v1.15.0`.
