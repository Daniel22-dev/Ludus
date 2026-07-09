# UNIFIKACE HER LUDUS — stav a plán (1.12.0, 2026-07-09)

## Standard, který musí splnit každá hra (checklist do každého vlákna)

1. **Intro video/animace + min. 1 soundtrack** — sloty pro média dodá Daniel; engine má mít `AUDIO`/`INTRO` slot (base64 nebo upload v učitelském panelu), intro přeskočitelné ťuknutím.
2. **Logo LUDUS vlevo nahoře** (`#ludusBadge`), **3× ťuk do 1,2 s** otevře učitelský náhled. Aktivace zadáním jména „Daniel Baláž" je **zrušena** — nikde nesmí zůstat.
3. **Sloty na obrázky** s animací (Ken Burns) — obrázky dodá Daniel per hra, nahrávají se přes učitelský panel (localStorage, SVG fallback).
4. **Učitelský panel jako v LOTR** — proklik všemi částmi hry: intro → mapa → každá stanice → boss → výsledek; per-cvičení skip.
5. **Vpravo nahoře: zvuk on/off + fullscreen** (`#sndBtn`, `#fsBtn`).
6. **Skin (safe/official) a jazyk CS/EN přepínatelné v učitelském panelu**; safe je výchozí.
7. **Owner footer** dole: „Vlastník aplikace: Daniel Baláž · Gymnázium, Ostrava-Hrabůvka · © 2026 …".

## Matice souladu (stav v tomto repu, 2026-07-09)

| Hra | logo+3×ťuk | ?teacher=1 | zvuk+FS | dock | footer | dual skin | i18n | teacher skoky | img sloty |
|---|---|---|---|---|---|---|---|---|---|
| star-wars | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ EN | ✓ | ✗ |
| indiana-jones | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ EN | ✓ | ✗ |
| dnd (nová) | ✓ (1.12.0) | ✓ | ✓ (1.12.0) | ✗ | ✓ (1.12.0) | ✓ | ✓ | ✗ | ✗ |
| lotr | ✓ logo | ✗ ťuk | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✗ |
| hogwarts | ✓ logo | ✗ ťuk | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| middle-earth-en | ✓ logo | pattern jiný | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| orient-express | ✓ logo | pattern jiný | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ |
| chronos | ✗ | pattern jiný | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ |
| jumanji | ✗ | pattern jiný | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| matrix | ✗ | pattern jiný | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ |
| stranger-things | ✗ | pattern jiný | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ |
| laughworks | ✗ | pattern jiný | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ |

Pozn.: „pattern jiný" = teacher aktivace existuje, ale jinak pojmenovaná — vlákno hry ověří a sjednotí na `#ludusBadge` + 3× ťuk. Intro video/soundtrack sloty zatím nemá žádná hra ve standardizované podobě — doplní se, až dodáš média (bod 1).

## Originalita (měřeno sdílenými funkcemi, Jaccard)

- **star-wars × indiana-jones: 98 % — skin swap**, nejvyšší priorita odlišení
- middle-earth-en × lotr: 66 % — příbuzný pár (EN derivát)
- dnd × star-wars/indiana-jones: ~50 % — společný základ, už divergovala (kostka)
- vše ostatní ≤ 22 % — chronos, jumanji, matrix, orient-express, stranger-things, laughworks, hogwarts jsou originály

### Návrh unikátní mechaniky (každá ve svém vlákně)
- **indiana-jones**: artefakty a pasti — sbírání relikvií do inventáře, past = časový tlak na vybraných otázkách, mapa jako postupně odkrývaný náčrt deníku
- **star-wars**: souboj světelných mečů jako rytmus správných odpovědí (kombo ničí štít protivníka), volba světlé/temné cesty větví pořadí stanic
- **dnd**: už má kostku — rozvinout: hod k20 ovlivňuje obtížnost otázky a odměnu, HP/inventář, náhodná setkání mezi stanicemi
- **middle-earth-en**: odlišit od LOTR CS — putování s mapou cesty tam a zpět, břemeno prstenu = handicap rostoucí s chybami

## Šablona promptu pro vlákno jedné hry

```
KONTEXT: Repo Daniel22-dev/Ludus, engine engines/<HRA>.html (přikládám). Platí
UNIFIKACE-HER.md (checklist 1–7). Builder se needituje. Manifest engines/manifest.json
edituj jen u záznamu této hry.
ÚKOL: 1) Doplň chybějící body checklistu: <vyjmenuj z matice>. 2) Zachovej vše ostatní.
3) <případná unikátní mechanika z plánu originality>.
OVĚŘENÍ: jsdom smoke test (boot bez chyb, 3× ťuk na #ludusBadge otevře teacher panel,
?teacher=1 funguje, zvuk toggle, fullscreen, footer viditelný, safe skin výchozí).
VÝSTUP: hotový soubor ke stažení + krátký seznam změn. Aktivace učitele jménem nesmí existovat.
```
