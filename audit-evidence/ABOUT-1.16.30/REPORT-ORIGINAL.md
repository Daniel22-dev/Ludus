# LUDUS 1.16.30 — sekce O aplikaci

**Datum vydání:** 28. 9. 2026  
**Výchozí podklad:** `Ludus-main(20260928-050538).zip`, verze 1.16.29  
**Výsledek:** kompletní upravený zdrojový balíček 1.16.30. Změna nebyla nahrána do GitHubu ani nasazena online.

## 1. Co je hotové

V horní navigaci i v patě aplikace je nyní **O aplikaci**. Nahrazuje samostatné ovládací prvky Changelog a Vlastník. Otevírá se ve stávajícím dialogu; hlavní pracovní plocha ani postup přípravy hry nebyly přestavěny.

Rozložení zachovává tmavý fialovo-zlatý vzhled Ludusu a podporuje také světlý režim. Na počítači je identita aplikace vlevo a souhrnné údaje vpravo, na úzké obrazovce se obsah skládá pod sebe.

| Oblast | Obsah |
|---|---|
| Identita | LUDUS — Dílna výukových her; součást ekosystému AI Studio |
| Autor a vývojový garant | Daniel Baláž |
| Školní projekt | Gymnázium, Ostrava-Hrabůvka |
| Verze a datum | 1.16.30; 28. 9. 2026 |
| Technický stav | GHRAB Platform 1.1.2; GHRAB AI Core 1.0.0; GARP 2.7 FOUNDATION |
| Provozní stav | Ověřováno v pilotu; LIVE dosud neověřen, školní server odložen |
| Doplňující obsah | Účel a odpovědnost, provozní zásady, rozbalovací Historie vydání |

Podpora, licenční/právní blok ani samostatná sekce Práce s daty nebyly přidány. Původní soubor LICENSE zůstává v repozitáři beze změny. O aplikaci nemá dodatečné omezení na administrátora; existující přístupová ochrana celé aplikace se nemění.

## 2. Historie, metadata a aktualizace

Všech deset dosavadních záznamů historie dostupných v rozhraní zůstalo zachováno. Přibyl záznam pro 1.16.30. Hlavní seznam má deset položek, nejstarší dosavadní záznam je dostupný pod Starší záznamy. Starší obsah `CHANGELOG.md` je zachován beze změny.

Build skládá metadata karty z `package.json` a existujících manifestů Platform, AI Core, SHIELD a AI Studia. Není třeba ručně udržovat nezávislou kopii technických verzí v dialogu. Aktuální identita vydání, manifesty, PWA cache a příslušné testovací reference byly sjednoceny na 1.16.30. Historické reporty nebyly zpětně přeznačovány.

GARP zůstává na 2.7. Změna nepředstavuje přechod na 2.8, aktivaci LIVE ani certifikaci produkčního provozu.

## 3. Technické provedení

Nové soubory `runtime/ludus-about.js` a `runtime/ludus-about.css` se načítají až při otevření sekce. Jsou také zařazeny do seznamu PWA precache. Existující velikostní limity nebyly zvýšeny. Selhání načítání je ošetřeno hlášením a možností opakovat otevření.

Dialog lze zavřít křížkem, klávesou Escape i kliknutím na pozadí. Fokus se po zavření vrací na vyvolávací tlačítko. Tab a Shift+Tab zůstávají uvnitř otevřeného dialogu; skryté prvky sbalené historie se do cyklu nezapočítávají. Pozadí se dočasně zneaktivní a jeho posouvání se uzamkne. Po zavření se původní stav obnoví. Kontrola zahrnuje také otevření stávajícího Návodu.

Nový regresní test `scripts/qa-about.mjs` je zapojen do `npm test` a obou variant P5 kontroly. Nebyly přidány nové balíčkové závislosti. Zámek verzí závislostí zůstává zachován.

## 4. Skutečně provedené kontroly

| Kontrola | Výsledek |
|---|---|
| `LUDUS_ABOUT_MEMORY=1 npm test` | PASS: sestavení, validace, integrace Platform a test O aplikaci |
| O aplikaci | 95 / 95 kontrol; 8 snímků |
| Existující kontrola kvality | 102 / 102; bez varování |
| GARP security | 45 / 45 |
| GARP 2.7 contract | 32 / 32; FOUNDATION `PASS_LOCAL_TRUST_PENDING`, LIVE `NOT_TESTED` |
| GARP 2.7 architecture | Bez nálezů v lokálním rozsahu; externí důvěra neověřena |
| GARP 2.7 master contracts | Balíček 19 / 19; kontrakty 25 / 25; LIVE deferred kontrola PASS |
| GARP 2.7 mutation tests | 9 / 9 |
| Suite session | 27 / 27 |
| PC01 | 93 / 93 |
| Kontrola PWA | PASS, 0 nálezů |
| Kontrola XSS sinků a dependency lock | PASS v rozsahu existujících kontrol |
| Statická assurance pipeline | PASS, včetně SBOM, AI fingerprintu, SW a deployment scanů |
| Srovnání nedotčených částí zdroje | 22 / 22 invariantů |

UI bylo prověřeno při šířkách 1366, 1024, 390 a 320 pixelů, pokaždé v tmavém a světlém režimu. Kontroly zahrnují otevření, historii, klávesnici, zavírání, návrat fokusu, zachování rozpracované hry a nulové neošetřené chyby JavaScriptu v tomto scénáři.

### Velikostní limity

| Metrika | Skutečnost | Limit |
|---|---:|---:|
| Vstupní HTML | 314 873 B | 315 000 B |
| Kritické vstupní soubory | 547 384 B | 548 000 B |
| Největší inline skript | 269 780 B | 270 000 B |
| PWA precache | 1 103 479 B | 1 220 000 B |

Rezerva vstupního HTML je pouze 127 B. Další rozšiřování je vhodné držet v oddělených modulech; zde nebyl limit skrytě uvolněn.

## 5. Zachování původních funkcí a známé nálezy

Přímé porovnání potvrdilo shodu hlavní herní logiky a inicializace. U všech jedenácti HTML enginů, AI integrace, engine runtime, privacy runtime a generátoru přístupové ochrany se liší pouze označení verze. Architektonická politika GARP a deployment konfigurace jsou identické. To je kontrola zdrojového rozdílu, nikoli tvrzení, že byly ručně odehrány všechny hry.

**Ve výchozí verzi 1.16.29 existují dvě neúspěšné položky interní herní diagnostiky:**

1. `GAME_ENGINES: flowModel, capabilities a smlouva hotové hry`
2. `Mechanika bez enginu nevyžaduje engine (fallback)`

Obě byly reprodukovány spuštěním původního sestavení ve stejném lokálním testovacím prostředí a odpovídají také již uloženému historickému behavior baseline. V 1.16.30 nepřibyla další neúspěšná položka. Tato změna je neopravuje ani nemaskuje; příčina a dopad potřebují samostatnou kontrolu. **95 / 95 znamená splnění regresního testu nové sekce, nikoliv nulový počet starších vad celé aplikace.**

Kontrola médií hlásila také již existující nepřítomnost volitelných oficiálních intro/hudebních souborů Hogwarts v tomto neoficiálním sestavení. Do balíčku nebyla doplňována cizí média.

## 6. Hranice ověření

Lokální běh použil Node 22.16.0 a systémový Chromium; projekt předepisuje Node 24. Instalace `npm ci` v tomto prostředí nedoběhla, proto není deklarován čistý instalační test ani úspěšný Node 24 CI běh.

Spravovaný prohlížeč blokoval navigaci na lokální HTTP adresu chybou `net::ERR_BLOCKED_BY_ADMINISTRATOR`. Původní `qa:runtime` proto nedoběhl. Politika prohlížeče nebyla měněna. UI kontrola proběhla pomocí povoleného vykreslení dokumentu v paměti s reálným načtením nových lokálních JS/CSS souborů. Pouze testovací dokument upravuje CSP a storage pro neprůhledný původ a odstraňuje přístupovou bránu z testovací odpovědi; produkční zdroje a sestavení tyto úpravy neobsahují. Test navíc kontroluje, že původní ochrana v produkčním sestavení zůstává.

Nebyly provedeny živé AI požadavky, test provozu na školním serveru, test externí důvěry bezpečnostní politiky, plný axe audit ani plná browser QA všech her. Historický `qa/behavior-baseline.json` nebyl přepsán. Nové UI záměrně mění DOM; kompletní nový behavior snapshot a jeho schválení patří do plného CI ověření, které zde není vydáváno za hotové.

## 7. Předání a reprodukce

ZIP zachovává složku `Ludus-main/` a obsahuje všechny původní zdrojové soubory, upravené zdroje, nový modul, test, tento report a auditní podklady. Neobsahuje `node_modules`, pracovní cache ani sestavený `dist`. Nejde o hotovou složku určenou k přímému zkopírování na web bez buildu.

V podporovaném prostředí Node 24 se stávajícími CI závislostmi a dostupným Chromium:

```sh
npm ci
npm test
npm run qa:quality
npm run qa:about
```

`qa:about` standardně používá lokální HTTP fixture. Proměnná `LUDUS_ABOUT_MEMORY=1` volí popsaný omezený in-memory UI běh; nenahrazuje plný CI ani test produkční autentizace. Stávající pravidla externí důvěry a CI nebyla uvolněna.

Důkazy jsou v `audit-evidence/ABOUT-1.16.30/`: strojové reporty, osm snímků, protokoly příkazů, původní self-testy a srovnání zdrojů. Soubor `CHANGE-INVENTORY.json` eviduje nové a změněné soubory včetně SHA-256. Znovu vytvořené SBOM a AI fingerprint zůstávají ve standardní složce `security/`. Git revize není v lokálním ZIP známa a není v evidenci domýšlena.
