# Changelog

## 1.16.29 — 2026-09-24 — Final clean-up and assurance metadata audit

- Bez změny pedagogické logiky, herních enginů, AI operací nebo GARP 2.7 r2 security policy.
- Opraveny čtyři stavové nesrovnalosti odhalené finálním auditem: veřejná release evidence už netvrdí `not-yet-uploaded`, SHIELD/ASSURANCE už nevedou dávno proběhlý Node 24 CI a externí trust jako „pending“ a release metadata sama sobě nepřidělují CI PASS.
- `release-acceptance.json` používá stabilní semantiku `repository-tracked` + `REQUIRED_BY_RELEASE_CI`; commit-specific PASS zůstává výhradně autoritou GitHub Actions evidence.
- P5 acceptance gate nově ověřuje, že repository-tracked release není označen jako odložený upload a že Node 24 i externí policy trust jsou povinné v release CI.
- SHIELD/ASSURANCE evidence rozlišuje source-level `PASS_LOCAL_TRUST_PENDING` od externě ověřeného release commitu; jediným trvalým blockerem zůstává úmyslně odložený school-server/LIVE scope.
- Historické duplicitní bloky 1.16.28 byly sloučeny do jednoho záznamu.

## 1.16.28 — 2026-09-23 — GARP 2.7 CONSOLIDATED r2 / G-02 hardening

- Aktivní bezpečnostní autorita byla povýšena na GARP 2.7; historický GARP 2.5.1 zůstal beze změny jako regresní baseline.
- Přidány konsolidované kontrakty, architecture-integrity gate, mutační negativní testy, externí CI trust anchor a oddělená release-assurance fáze s čerstvým SBOM/AI fingerprint/evidence manifestem.
- G-02 uzavřen: policy validator ověřuje appId proti důvěryhodnému inventáři, platný semver, zákaz 0.0.0, sémantický obsah všech deseti sekcí a exact/substr placeholdery.
- Foundation policy Ludusu byla převedena z mode-only tvaru na konkrétní sémantický kontrakt.
- Referenční selftesty: PACKAGE 19/19, CONTRACT 25/25 včetně 5/5 G-02 negativních případů.
- School-server implementace zůstává DEFERRED_BY_OWNER_DECISION; SHIELD-LIVE a RI-LIVE jsou NOT_TESTED a neoslabují FOUNDATION.
- Zpřísněna školní AI hranice a přílohy: direct provider je ve school profilu fail-closed a AI vstupy jsou omezeny na JPG/PNG/WebP/PDF do 12 MB.
- CI cílí na Node 24; architecture policy vyžaduje externí SHA-256 očekávání a r2 tuto policy neměnil.

## 1.16.25 - A06/A07 assurance hardening

- closes A06 evidence drift after activation of the `Protect main` ruleset;
- emits `ghrab-patch-assurance-v1` metadata from the GitHub build;
- publishes a SHA-256-bound patch assurance manifest covering the GARP evidence manifest, source SBOM, deployment SBOM, and AI assurance fingerprint;
- preserves GARP/N5 behavior and keeps SHIELD-LIVE / RI-LIVE explicitly pending school-server validation.

## 1.16.24 — 2026-09-16 — AI Studio auto-patch manifest contract

- Opraven postprocessor GHRAB Platform tak, aby výsledný `dist/studio-manifest.json` zachoval canonical pole vyžadovaná AI Studiem (`schema`, `requiredPlatformRange`, `swContract`, `studioBridge`, `artifactEnvelope`, `storagePrefix`, `cacheName`).
- Platformní conformance doplněna o regresní kontroly skutečného publikovaného Studio manifestu; chyba se nyní zachytí až po buildu, nikoli jen ve zdrojové šabloně.
- Verze aplikace, runtime identit, PWA cache, Studio/AI manifestů a QA očekávání sjednocena na 1.16.24.
- Bezpečnostní logika a `security/garp25` tooling nejsou touto patch změnou funkčně měněny; historická evidence 1.16.23 zůstává zachována.
- Cíl vydání: end-to-end ověření automatické patch promotion AI Studia z 1.16.23 na 1.16.24.

## 1.16.23 — 2026-09-11 — GARP 2.5.1 SHIELD corrective candidate, kolo LU-N15 až LU-N19
- Opraven LU-N15: quality report nyní nese striktní `status` a P5 certifikace má pozitivní i dvě negativní kontroly.
- Opraven LU-N16: AI Core sync exportuje staged binary patch včetně nových untracked vendor souborů; samostatná kontrola simuluje novou verzi jádra, `git apply` a následný build.
- Zesílen kanonický GARP tooling pro LU-N17/LU-N18: širší AI-boundary drift detekce a bounded recursive scan obecných ZIP/OOXML archivů.
- LU-N19: reprodukovatelný provenance subject je dodáván jako samostatný payload ZIP pro opakovatelnou 10/10 PREP bránu.
- Pedagogická logika, enginy, prompty a AI instrukce se věcně nemění; mění se pouze release/security/build/CI vrstva a číslo verze.

## 1.16.22 — 2026-09-11 — GARP 2.5.1 SHIELD corrective candidate
- Opravné kolo LU-N1 až LU-N14 podle nezávislé kontroly 1.16.21.
- Bez věcné změny pedagogické logiky, enginů, promptů a AI instrukcí.

## 1.16.21 — GARP 2.5.1 SHIELD-PREP (2026-09-10)

- Přidána kumulativní GARP 2.5.1 TOOLING-R2 assurance vrstva, CycloneDX 1.7 SBOM, AI-boundary fingerprint, evidence manifest a release-integrity tooling.
- Service worker už neukládá bezpečnostně kritické deployment/platform/privacy assety do Cache API; kritické cesty jsou obslouženy network-only/no-store před cache-first větví.
- `ghrab-platform.js`, `ghrab-platform.consumer.json`, `access/deployment-config.js`, `runtime/ludus-privacy.js` a kritické config/RI cesty jsou součástí autoritativního security-critical seznamu.
- Build respektuje `GHRAB_BUILD_TIME`, takže PREP lze reprodukovat; dva school-server buildy se shodným timestampem mají identický GARP artifactDigest.
- Source a deployment jsou odděleny; `dist-school-server/` se negeneruje do source kandidáta a je předáván jako samostatný deployment artefakt.
- Funkční AI prompt/provider/model boundary se tímto kolem nemění; kandidát zůstává AMBER do nezávislého Prompt E review a SHIELD-LIVE na skutečném školním serveru.

## 1.16.20 — Platform 1.1.2 Studio manifest alignment (2026-09-06)

- Zdrojový Studio manifest byl srovnán s reálnou Platformou 1.1.2 a rozsahem `>=1.1.2 <2.0.0`.
- Cache v šabloně je navázána na `__APP_VERSION__`, takže source fallback AI Studia nepřevezme zastaralou verzi.
- Produkční suite-session cleanup, PC-01 storage ownership ani AI Core chování se nemění.

## 1.16.19 — GHRAB Platform 1.1.2 ecosystem wave candidate (2026-09-05)

- Migrována přesná vendorizovaná GHRAB Platform 1.1.2 a requiredRange zvýšen na `>=1.1.2 <2.0.0`.
- Přidán `ghrab-suite-session-v1` lifecycle handler s replay, per-tab generation baseline, verified cleanupem, write-quarantine a fail-closed ACK.
- Data manifest PC-01 byl srovnán se skutečnými storage writery včetně engine progress/images, Gemini credentialů, manuálu a lifecycle tombstones.
- Platforma se nyní injektuje i do engine HTML; builder načítá privacy runtime před odemčením chráněných skriptů bez navýšení performance budgetu.
- Přidán suite-session regresní test s open-child, delayed-open, multi-tab, BFCache/pageshow, fail-closed canary a povinnou negativní kontrolou.
- Kandidát zůstává pouze pro koordinovanou ecosystem release wave a nezávislou kontrolu; E-01 není považován za uzavřený pro celý ekosystém.

## 1.16.18 — GARP 2.3 opravné kolo po Claude B, kandidát pro druhou kontrolu (2026-09-01)

- Odstraněny produkční AI testovací háčky a legacy přímý bypass; QA nyní nahrazuje AI vrstvu pouze uvnitř izolovaného testovacího harnessu.
- Původní filename přílohy je v AI Core wrapperu vždy nahrazen generickým `material`; handoff import používá stejné strukturální limity jako souborový import.
- Přidán `LUDUSPrivacy.endWork()` a tab/session izolace herního jména, postupu a výsledků; staré persistentní engine klíče jsou před načtením herního kódu odstraněny.
- Datový manifest eviduje legacy engine namespaces a pravdivě odkazuje na implementovaný privacy mechanismus.
- CSP se při buildu vkládá do HTML standardního i school-server profilu; `frame-src` výslovně povoluje interní blob preview.
- Service worker již nepředcachuje deployment konfigurace, které runtime záměrně obchází.
- Export her vkládá privacy/shared runtime přímo do výsledného HTML, aby ochrana nebyla závislá na vedlejším souboru.
- Kandidát zůstává GARP AMBER a je určen k druhé nezávislé kontrole Claude; reálná studentská data jsou nadále zakázána.

## 1.16.17 — GARP 2.3 bezpečnostní kandidát, kolo 1 (2026-09-01)

- Odstraněno zbytečné kopírování podepsaného přístupového oprávnění do globálního `window`; po úspěšném guardu se publikuje pouze netajný stav `granted`.
- AI prompt assembly odděluje systémové instrukce od nedůvěryhodných témat/importů/příloh, přidává explicitní untrusted-data hranice a defense-in-depth pravidla v GHRAB AI Core.
- Importované a AI-generované stanice procházejí jedním centrálním normalizátorem s allowlisty, limity a odstraňováním řídicích/bidi znaků.
- AI EGRESS INSPECTION ověřuje testovací request payload: osobní údaje blokuje preflight a původní název přílohy se do requestu nepřenáší.
- Přidány GARP 2.3 regresní a kritické testy včetně bezpečných negativních kontrol.
- Kandidát je do nezávislé kontroly a uzavření browser/privacy položek omezen na syntetická data; stav není produkční schválení.

### Historická poznámka k 1.16.17 před auditním přebuildem
- Předchozí pracovní hotfix synchronizoval `sharedAccessVersion` a opravil vložení `access-gate.css`; tyto opravy jsou v kandidátu zachovány.

## 1.16.15 — GARP bezpečnostní kandidát, kolo 2 (2026-08-27)
- Opraven potvrzený HIGH nález z Claude kola 1: nedůvěryhodné hodnoty herního obsahu se na dotčených cestách v enginech Chronos, Hogwarts, LOTR a Laughworks již nevkládají jako aktivní HTML.
- Náhled sestavené hry běží uvnitř sandboxovaného iframe bez `allow-same-origin`, takže herní dokument nemá same-origin přístup k localStorage/IndexedDB builderu.
- Hogwarts wordbank používá číselné indexy místo vkládání obsahu slov do atributů `id`/`onclick`; preview režim bezpečně toleruje nedostupný localStorage.
- GARP regresní brána rozšířena o kontroly L1 output encodingu a izolace preview.

## 1.16.14 — GARP bezpečnostní kandidát (2026-08-27)
- School-server build při nedostupné nebo neplatné deployment konfiguraci už nesmí degradovat do serverless profilu; bootstrap zůstane zamčený fail-closed.
- Ruční JSON import má 2MB limit, limit hloubky/počtu uzlů a odmítá strukturální klíče použitelné pro prototype-pollution řetězce.
- Náhled exportované hry otevírá novou kartu přes `rel="noopener noreferrer"`.
- GitHub Actions jsou připnuté na neměnné commit SHA; doplněna samostatná GARP regresní brána.

## 1.16.13 — oprava GitHub Actions (2026-08-13)

- Playwright Chromium se ve validačním, nasazovacím a AI Core synchronizačním workflow instaluje před `npm test` a předává se přes `CHROMIUM_PATH`.
- Interní validace nově hlídá správné pořadí instalace prohlížeče a aplikačních testů, aby se chyba v CI nevrátila.
- Funkce aplikace, reportér i registrovaná média zůstaly beze změny; PWA cache je `ghrab-ludus-v1.16.13`.

## 1.16.12 — sjednocení reportéru (2026-08-13)

- Reportér používá dvoukrokové vytvoření a skutečné stažení diagnostického ZIPu; Gmail je dostupný až po kliknutí na stažení.
- Rozhraní i e-mail vyžadují ruční přiložení ZIPu a pomocné video je bezpečně skryté uvnitř reportéru i při scrollování.
- Regresní sada fyzicky ověřuje stažený ZIP, jeho snímky a diagnostiku, jednu instanci reportéru, motivy, mobilní zobrazení a klávesnici.
- Herní enginy, média a jejich licence nebyly měněny; PWA cache je `ghrab-ludus-v1.16.12`.

## 1.16.11 — P5 (2026-08-05)
### CI hotfix 2026-08-08
- Opraveny GitHub QA brány podle reálných axe/visual/combinatorial/media evidence artefaktů.
- Zachována politika private official médií: veřejný source je nemusí obsahovat, přítomné soukromé soubory se hashově ověřují a public dist je nesmí balit.



## 1.16.11 — P5 R2

- Veřejný a školní build používá profil unofficial a neobsahuje nedoložená oficiální média.
- Official média jsou oddělena do soukromého owner-controlled doplňku.
- Doplněny přístupné názvy polí hráčů a runtime audit všech enginů.


- Předprodukční akceptace bez povinného školního serveru.
- Nulové otevřené automatické a11y nálezy jsou podmínkou P5 brány.
- Přidán aktualizovaný release-acceptance kontrakt a odložený GitHub upload.

# Changelog

## 1.16.9 — P4 FINAL (2026-08-04)

- Finální certifikace, čisté buildy, přístupnost, výkon, bezpečnost a release evidence.
- Přidána povinná `qa:p4:ci` brána.

## 1.16.8 - 2026-08-04 (P3)

- Platforma 1.1.0, pristupnost, performance budgety a modularizace P3.

## 1.16.7 — P2: sjednocení platformy GHRAB (2026-08-04)

- jeden kanonický školní logotyp a jednotná autorská patička;
- GHRAB Platform 1.0.0: motiv, storage namespace s vratnou migrací, Studio Bridge 2.0 a artifact envelope v1;
- jednotný název PWA cache `ghrab-ludus-v1.16.7` a řízená aktualizace;
- platformní konformitní test je součástí buildu a CI.


## 1.16.6 — P1 (2026-08-04)

- Produkční bezpečnost, serverový profil, datové manifesty a jednotná observability vrstva.
- GHRAB AI Core 1.0.0 a přepínání direct-gemini / school-gateway.

# Changelog

## 1.16.5 — 2026-08-04

- Etapa P0: service worker už nezmrazuje centrální Access Guard, bootstrap všech enginů používá server-ready konfiguraci a reportér neblokuje start.
## 1.16.4 – Sjednocený reportér chyb ve všech stránkách LUDUSu

- hlavní dílna i samostatné enginy používají jednu lokální kopii společného reportéru AI Studia;
- centrální reportér app-guardu je vypnutý, takže na žádné stránce nevzniká dvojí tlačítko ani dvojí sada posluchačů;
- adaptér rozpozná explicitní motiv a u starších enginů bezpečně odvodí světlý či tmavý vzhled z pozadí;
- reportér je součástí PWA cache a manuál odkazuje na aktuální centrální návod;
- herní mechaniky, média a exporty zůstaly beze změny.

## 1.16.3 – Aktuální manuál uvnitř AI Studia

- interaktivní manuál byl ověřen a aktualizován pro současné mechaniky, světy, importy a výstupy LUDUSu;
- tlačítko manuálu otevírá příručku ve stejném pracovním rámci místo nové karty;
- zvýšena verze PWA cache, aby se změna načetla i ve dříve nainstalované aplikaci.

## 1.16.2

- Engine Stranger Things se po pozdním uvolnění centrální brány spustí i tehdy, když již proběhl `DOMContentLoaded`; prázdná obrazovka pod krycí vrstvou je opravena.

- Překladová vrstva nahrazuje krátké tokeny pouze jako samostatná slova; vlastní jména jako JONES ani slova CONSOLE, NOON, OFFLINE a OKLAHOMA se již nepoškodí.

- zavedena jednotná certifikační brána GHRAB QA Standard 1.0.1;
- doplněny skutečné Chromium screenshoty hlavní dílny a všech herních enginů;
- release verdikt je vázán na verzi a SHA-256 buildu a bez deployed smoke testu zůstává AUTOMATED_READY.

Všechny významné změny LUDUSu jsou vedeny na jednom místě. Verze odpovídá `package.json`, aplikaci, PWA cache i manuálu.

## 1.16.1 — 2026-07-15

Mediální opravná verze: Bradavicím bylo vráceno původní intro a soundtrack a vznikl trvalý systém správy médií pro oficiální a alternativní varianty.

### Změněno

- média jsou uložena mimo HTML v `media/<hra>/<varianta>/`,
- `media/registry.json` eviduje soubory, hash, stav práv a závazné pravidlo „varovat, nikoli automaticky mazat“,
- engine přepíná intro a soundtrack podle varianty `official` / `safe`,
- dílna při exportu vloží pouze média vybrané varianty přímo do HTML, takže hra zůstává offline,
- build kopíruje mediální složku do `dist/media`,
- validace ověřuje existenci, SHA-256, velikost, propojení enginu a funkci offline vložení,
- Bradavické intro (MP4) a soundtrack (MP3) byly obnoveny z uživatelem dodané verze 1.15.0.

## 1.16.0 — 2026-07-15

Auditní opravná verze: odstraněna nekonečná překladová smyčka, opraveno dělení týmů, striktní vazba svět + mechanika, CI brána, PWA registrace a bezpečnější export enginů.

### Opraveno

- překladová vrstva enginů už v klidu nepřepisuje DOM a nevytěžuje hlavní vlákno,
- třídní soutěž správně čte jeden tým z každého řádku,
- dílna použije engine jen pro přesnou kombinaci světa a mechaniky,
- interní diagnostika je znovu zelená a běží také v automatické validaci,
- nasazení na GitHub Pages proběhne pouze po úspěšném `npm test`,
- service worker se registruje i po pozdějším spuštění chráněných skriptů,
- PWA cache má bezpečné fallbacky a vlastní stabilní `id`,
- export vkládá obsah přes DOM namísto křehké řetězcové náhrady `<head>`,
- redundantní `middle-earth-en.html` byl odstraněn,
- tehdejší nedoložené vložené audio/video bylo dočasně odstraněno; od verze 1.16.1 je obnoveno v řízeném mediálním registru,
- trvalé uložení Gemini klíče vyžaduje výslovné potvrzení,
- chybné JSON odpovědi modelu mají srozumitelnou hlášku.

### Dokumentace

- LUDUS je označen jako pilotní interní nástroj, nikoli jako schválený produkční systém,
- dokumentace výslovně uvádí, že statické hry nejsou určeny pro klasifikované testování,
- offline fungují exportované hry; otevření chráněné dílny vyžaduje ověření přes AI Studio,
- přidány `LICENSE` a `docs/MEDIA_PROVENANCE.md`.

## 1.15.0

Anonymní technické metriky výstupů bez témat, promptů a identity uživatele.

## 1.14.6

Integrovaný interaktivní manuál.

## 1.14.5

Oprava umístění centrálního přístupového bootstrapu.

## 1.14.4

Zpřesnění stavů enginů a kontraktu `builderCompatible`.
