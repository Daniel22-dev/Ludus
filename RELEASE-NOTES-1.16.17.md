# LUDUS 1.16.17 — GARP 2.3 bezpečnostní kandidát, kolo 1

Datum: 1. 9. 2026

Tento balíček je kandidát pro nezávislou kontrolu Claude, nikoli finální produkční release.

## Bezpečnostní změny
- Podepsané přístupové oprávnění se po úspěšném guardu nekopíruje do globálního `window`; zůstává pouze netajný příznak povoleného vstupu.
- Volné téma, importovaný obsah a přílohy jsou v AI prompt assembly explicitně označené jako nedůvěryhodná data a oddělené od systémových instrukcí.
- GHRAB AI Core přidává druhou vrstvu instrukcí proti prompt injection, úniku skrytého kontextu a nevyžádaným akcím.
- Import/AI výstup prochází centrálním allowlistovým normalizátorem s limity velikosti/hloubky/uzlů a validací otázek/odpovědí.
- AI EGRESS INSPECTION ověřuje testovací request payload; původní název přiloženého souboru se neposílá a syntetický e-mail je blokován před egress.
- Přidány `qa:garp23` a `qa:garp23:critical`, včetně prokázaných negativních kontrol v izolovaných pracovních kopiích.

## Omezení kandidáta
- Live AI-RED proti skutečnému produkčnímu provider/modelu nebyl v tomto lokálním auditu proveden; změna prompt assembly navíc ruší přenositelnost staršího behaviorálního AI evidence.
- Externí centrální Access Guard není součástí tohoto ZIPu, proto nelze lokálně uzavřít audience/scope/revocation a cross-app scénáře.
- Lokální Chromium je spravovanou politikou blokováno pro `http://127.0.0.1`, takže plné browser back/restore/multi-tab/SW runtime scénáře zůstávají k ověření v CI/nezávislém prostředí.
- Herní enginy ukládají průběh lokálně; cross-student izolace a retenční lifecycle na sdíleném zařízení nejsou v tomto prostředí plně uzavřeny.

**REÁLNÁ STUDENTSKÁ DATA: NEPOUŽÍVAT**  
**TESTOVACÍ PROVOZ POUZE SE SYNTETICKÝMI DATY**
