# LUDUS 1.16.18 — GARP 2.3 kandidát pro druhou Claude kontrolu

Datum: 2026-09-01

Stav: **security-candidate-amber**

Tato verze vznikla ve Fázi C po nezávislé kontrole kandidáta 1.16.17 Claude. Všechny nálezy B-01 až B-08 byly proti kódu nezávisle ověřeny a technicky potvrzeny; distribuované opravy proto vyžadují podle GARP 2.3 druhou nezávislou Claude kontrolu stejného ZIPu.

Hlavní změny:
- produkční AI testovací háčky a legacy bypass odstraněny;
- filename přílohy je v AI wrapperu vždy generic `material`;
- Studio handoff používá stejné strukturální limity jako file import;
- engine identity/progress je tab/session-scoped a legacy persistentní engine state se před engine execution scrubuje;
- `LUDUSPrivacy.endWork()` je skutečně implementován a dostupný v builderu i enginech;
- storage manifesty odpovídají reálným legacy namespaces;
- static i school-server HTML build skutečně obsahuje CSP meta; blob preview je výslovně povolen;
- deployment config již není zbytečně SW-precached;
- standalone export inlinuje privacy + shared runtime.

Finální lokální brány: GARP 49/49, GARP 2.3 48/48, critical 13/13, privacy lifecycle 28/28, quality 102/102. Plný local-http runtime/axe a post-fix browser A/B lifecycle nelze v prostředí Fáze C spustit kvůli managed Chromium URLBlocklist; druhá Claude kontrola je musí zopakovat v neblokovaném prostředí.

**REÁLNÁ STUDENTSKÁ DATA: NEPOUŽÍVAT**

**TESTOVACÍ PROVOZ POUZE SE SYNTETICKÝMI DATY**
