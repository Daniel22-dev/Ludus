# LUDUS 1.16.0 — vyhodnocení a implementace hloubkového auditu

**Vstup:** audit LUDUS 1.15.0 ze dne 15. 7. 2026  
**Opravená verze:** 1.16.0  
**Datum implementace:** 15. 7. 2026  
**Výsledek:** audit byl z větší části věcně správný. Kritické funkční nálezy byly potvrzeny měřením a opraveny. U několika architektonických doporučení bylo zvoleno bezpečnější nebo postupné řešení.

## 1. Celkové stanovisko k auditu

Audit správně odhalil zásadní rozdíl mezi „zelenou kontrolou řetězců“ a skutečným chováním aplikace. Potvrdily se všechny čtyři hlavní funkční vady: překladová smyčka v enginech, poškozené dělení týmů, neexistující CI validační brána a ignorování zvolené mechaniky.

Audit byl velmi kvalitní, ale ne zcela bezchybný:

- u třídního kvízu navrhoval, aby generovaný zdroj obsahoval fyzické konce řádků uvnitř jednou uvozeného JavaScriptového řetězce; to by vytvořilo syntakticky neplatný export. Oprava proto používá správně escapované `\n` v generovaném skriptu a behaviorální test ověřuje, že výsledná textarea i dělení týmů skutečně pracují se třemi řádky;
- audit lokalizace správně popsal konstrukční dluh, ale kompletní migrace všech textů na `data-i18n` by byla samostatný refaktor s vysokým regresním rizikem. V opravné verzi byla odstraněna smyčka, zrychlen překlad, opravena kolizní mapa a prokázané chybné fráze; úplná migrace zůstává plánovaným samostatným vydáním;
- audit našel vložená média v Bradavicích, ale přehlédl další přibližně 800kB vloženou hudební stopu v enginu Středozemě. Odstraněny byly obě skupiny nedoložených médií.

## 2. Stav jednotlivých nálezů

### Kritické nálezy P0

| Nález | Verdikt | Provedená změna |
|---|---|---|
| **P0-1 MutationObserver ↔ překladová smyčka** | Souhlas | Opraveno ve společném bloku všech 11 enginů. Observer se při vlastním zápisu odpojí, záznamy se vyčistí, zápis proběhne jen při skutečné změně a další průchod je sloučen přes `requestAnimationFrame`. Klíče překladů se řadí pouze jednou. Behaviorální test měří nulové mutace patičky v klidovém stavu. |
| **P0-2 dělení týmů** | Souhlas s upřesněním implementace | V generovaném skriptu je bezpečné `Tým 1\nTým 2\nTým 3` a dělení `.split(/\r?\n+/)`. Po spuštění exportu má textarea tři skutečné řádky a test kliknutím ověří vytvoření tří týmů Alfa, Beta a Gama. |
| **P0-3 CI nespouští validaci** | Souhlas | Přidán `.github/workflows/validate.yml`. Deploy workflow nyní spouští `npm ci` a `npm test` před nahráním artefaktu. Povinnou branch protection je nutné zapnout ručně v nastavení GitHubu; nelze ji uložit do ZIPu. |
| **P0-4 ignorování mechaniky** | Souhlas | Zvolena doporučená varianta A. `getGameEngine(skinId, frame)` vrací pouze přesnou dvojici svět + mechanika, jinak `null`. Interní self-test i CI regresní test tuto vlastnost ověřují. |
| **P0-5 nedoložená vložená média** | Souhlas | Odstraněno base64 video i audio z `hogwarts.html` a navíc nedoložená hudba z `lotr.html`. Přidány `LICENSE` a `docs/MEDIA_PROVENANCE.md`. Hogwarts klesl přibližně na 375 kB, LOTR na 164 kB. Staré objekty mohou zůstat v předchozí Git historii; její přepsání je samostatný administrátorský krok a z dodaného ZIPu jej nelze provést. |

### Závažné nálezy P1

| Nález | Verdikt | Provedená změna |
|---|---|---|
| **P1-1 vadná jazyková vrstva** | Souhlas, částečný refaktor | Odstraněn duplicitní klíč `ZAHÁJIT VÝPRAVU`, předpočítány seřazené klíče, doplněna kanonická hodnota textových uzlů a atributů pro bezpečnější CZ → EN → CZ a opraveny prokázané dynamické fráze. Testuje se například `Legenda o draku`, počet životů, počet chyb a návrat `Mapa kobky`. Kompletní přechod na `data-i18n` je ponechán jako samostatný architektonický úkol. |
| **P1-2 rozpor PWA a přístupové brány** | Souhlas | Nebyla oslabena centrální ochrana neověřenou offline výjimkou. Zvolena poctivá dokumentační varianta: chráněná dílna vyžaduje síťové ověření, zatímco hotové exportované hry fungují offline. README, PWA dokumentace i manuál to výslovně uvádějí. |
| **P1-3 pozdní registrace service workeru** | Souhlas | Registrace kontroluje `document.readyState`; po proběhlém `load` se spustí okamžitě, jinak jednorázově čeká na událost. Stejně byl ošetřen i Studio handoff. |
| **P1-4 duplicitní middle-earth-en.html** | Souhlas | Soubor odstraněn a redundantní záznam z manifestu smazán. Angličtinu zajišťuje přepínač v `lotr.html`. Historický audit připravenosti byl označen jako neaktuální. |
| **P1-5 self-test 32/34** | Souhlas | Changelog byl omezen na 10 položek a přesné párování enginu opraveno. Interní testy jsou zelené a jejich výsledek je součástí CI behaviorální kontroly. |
| **P1-6 API klíč v prohlížeči** | Souhlas, infrastrukturní část otevřená | Trvalé uložení nyní vyžaduje výrazné potvrzení s varováním před sdíleným zařízením. Režim relace zůstává výchozí. Školní proxy nelze poctivě dokončit jen úpravou tohoto statického repozitáře; vyžaduje samostatný backend a správu školního klíče. |
| **P1-7 tři významy verze 1.15.0** | Souhlas | Přidán jediný `CHANGELOG.md`; jednorázové komentáře změn byly odstraněny. Verze aplikace, balíčku, PWA, manuálu a dokumentace je 1.16.0 a validace jejich shodu kontroluje. |
| **P1-8 PWA manifest bez id** | Souhlas | Přidáno stabilní `"id": "/Ludus/"`; orientace změněna na `any`. |
| **P1-9 učitelský režim není zabezpečení** | Souhlas | README, provozní dokumentace a interaktivní manuál výslovně říkají, že LUDUS není pro klasifikované testování a že řešení ve statickém HTML nelze utajit. Záměrně nebylo přidáno falešné „zabezpečení“. |
| **P1-10 verzovaný dist** | Souhlas | `dist/` zůstává v `.gitignore` a není součástí výsledného GitHub ZIPu. GitHub Actions jej vytváří znovu. Pokud byl v předchozím repozitáři sledován, při nahrání celé nové sady souborů je nutné starý adresář na GitHubu odstranit. |

### Střední nálezy P2

| Nález | Stav a komentář |
|---|---|
| **P2-1 stará cache enginu** | Opraveno: `force-cache` nahrazeno `no-cache`, takže prohlížeč může použít ETag, ale ověří aktuálnost. |
| **P2-2 křehká injekce přes `<head>`** | Opraveno: použit `DOMParser` a vložení do skutečného `document.head`. |
| **P2-3 all-or-nothing instalace SW** | Opraveno: kritické a volitelné assety jsou odděleny, volitelné se cachují best-effort přes `Promise.allSettled`. |
| **P2-4 HTML fallback pro JSON** | Opraveno: fallback na `index.html` se používá jen pro navigační požadavky. |
| **P2-5 portrait-only** | Opraveno: manifest používá `orientation: any`. |
| **P2-6 nesprávný jazyk dokumentu** | Opraveno u `hogwarts.html` a `lotr.html` na `lang="cs"`. |
| **P2-7 toast bez aria-live** | Opraveno: kontejner toastu má `role="status"`, `aria-live="polite"` a `aria-atomic="true"`. |
| **P2-8 falešný QA report** | Starý soubor odstraněn. Nahrazen strukturovaným `QA_REPORT_1.16.0.md` založeným na skutečném běhu `npm test`. |
| **P2-9 procesní soubory v kořeni** | Jednorázové soubory byly odstraněny; historie změn je v `CHANGELOG.md`. |
| **P2-10 chybějící licence** | Přidány `LICENSE` a evidence původu médií. Text licence je restriktivní a neuděluje automatické právo třetím stranám. |
| **P2-11 rozpor pilot / oficiální provoz** | README a provozní dokumentace byly sjednoceny na řízený interní pilot. Stav jednotlivých enginů zůstává pravdivě v manifestu. |

### Drobné nálezy P3

| Nález | Stav a komentář |
|---|---|
| **P3-1 reduced motion v manuálu** | Opraveno. |
| **P3-2 self-testy přes `toString()`** | Částečně. Nejcennější kritické vlastnosti jsou nově ověřovány skutečným chováním v jsdom. Starší pomocné self-testy nebyly všechny přepsány, protože to nemá vliv na opravu kritických regresí. |
| **P3-3 nevalidní JSON modelu** | Opraveno: vrací srozumitelnou chybu `BAD_JSON`. |
| **P3-4 screenshots v PWA manifestu** | Neprovedeno. Jde o kosmetické rozšíření instalačního dialogu a v balíčku nebyly k dispozici ověřené aktuální snímky. Nevytvářely se zástupné nebo zastaralé obrázky jen kvůli splnění položky. |
| **P3-5 chybějící npm ci** | Opraveno ve validačním i deploy workflow. |

## 3. Nové automatické pojistky

`scripts/validate.mjs` nyní kromě statických pravidel spouští chování aplikace v jsdom:

1. provede interní diagnostiku dílny a odmítne každý neúspěšný test;
2. ověří, že neexistující kombinace svět + mechanika nevrátí cizí engine;
3. skutečně vygeneruje třídní soutěž, spustí ji a ověří tři týmy;
4. otevře reprezentativní engine, změří klidové mutace patičky a ověří je na nule;
5. ověří klíčové překlady a jejich návrat;
6. kontroluje společný hash standardního bloku ve všech enginech;
7. zakazuje base64 audio/video a engine větší než 400 kB;
8. kontroluje PWA identitu, cache, CI workflow, licenci, dokumentaci a konzistenci verze.

## 4. Ruční kroky po nahrání na GitHub

Tyto kroky nelze zabalit do ZIPu:

1. V repozitáři odstranit případný starý sledovaný adresář `dist/`; nový vzniká automaticky v Actions.
2. V **Settings → Branches / Rulesets** zapnout ochranu větve `main` a vyžadovat zelený check **Validate LUDUS**.
3. Zkontrolovat, že workflow **Deploy to GitHub Pages** proběhlo až po úspěšném testu.
4. Pokud byla nedoložená média v dřívější veřejné Git historii, rozhodnout, zda je nutné historii vyčistit pomocí `git filter-repo`. To je invazivní operace měnící historii a nemá se provádět naslepo z exportovaného ZIPu.
5. Po nasazení otevřít DevTools → Application a ověřit aktivní cache `ludus-pwa-v1.16.0`.

## 5. Provozní verdikt po opravě

Verze 1.16.0 odstraňuje potvrzené kritické funkční vady a zavádí reálnou automatickou bránu před nasazením. Je vhodná pro **řízený interní pilot** a pro další ověřování jednotlivých enginů podle release checklistu.

Neznamená to, že všech 11 enginů je automaticky produkčně hotových. Jejich stav zůstává pravdivě uveden v manifestu. Otevřenými architektonickými tématy jsou především úplná klíčová lokalizace bez překladu DOM a školní AI proxy bez klíče v klientském prohlížeči.


## Následná změna ve verzi 1.16.1

Na výslovný pokyn vlastníka byla změněna mediální strategie. Bradavické intro a soundtrack byly obnoveny jako samostatné registrované soubory. Budoucí audit smí u registrovaných médií upozornit na právní nebo provozní riziko, nesmí je však automaticky odstranit. Podrobnosti jsou v `media/registry.json` a `docs/MEDIA_PROVENANCE.md`.
