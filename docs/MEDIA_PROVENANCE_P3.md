# LUDUS media packaging – P3

Tematická audiovizuální média jsou záměrnou součástí her LUDUS. Výchozí profil `official` balí všechna média, která jsou zapsaná v `media/registry.json` a schválená vlastníkem aplikace.

Technická brána ověřuje:

- existenci souboru;
- shodu cesty, velikosti a SHA-256;
- vazbu na konkrétní engine a roli (`intro`, `soundtrack` apod.);
- že distribuční build skutečně obsahuje registrované soubory.

Registr není nezávislým právním posudkem. Eviduje rozhodnutí vlastníka aplikace a technickou integritu souborů. Média se automaticky nemažou ani nevyřazují z buildu.

Další hry lze doplnit podle konvence:

```text
media/<engine>/official/intro.mp4
media/<engine>/official/soundtrack.mp3
```

Po přidání souboru se doplní záznam do `media/registry.json` a `media/rights-records.json`; build pak kontroluje jeho hash a zahrne jej do GitHub i school-server distribuce.
