# LUDUS — provozní nasazení ve škole

## Účel

LUDUS je lokální dílna výukových her určená k oficiálnímu internímu používání. Převádí učivo do herních forem, umožňuje nastavit jazyk rozhraní, obsah a podpůrná vysvětlení a vytváří samostatné HTML výstupy bez nutnosti žákovských účtů.

## Provozní režim

1. Učitel pracuje pouze s anonymizovaným obsahem a nevkládá osobní údaje žáků.
2. Pro veřejné sdílení používá bezpečnou tematickou variantu. Brandované varianty jsou určeny jen pro interní výuku.
3. Hratelný HTML export je dostupný jen u enginů s `builderCompatible: true`.
4. Rozpracované enginy označené „pouze náhled“ lze prohlížet, ale LUDUS z nich záměrně nevytvoří neověřenou hru.
5. Hotový engine musí projít checklistem v `ENGINE_RELEASE_CHECKLIST.md` a teprve potom může získat stav `ready`.

## Doporučené zavedení

- určit správce aplikace a vlastníka vydání,
- používat GitHub Pages jako jednotný distribuční bod,
- každé vydání ověřit příkazy `npm test` a `npm run build`,
- změny nasazovat přes kontrolovaný release ZIP,
- udržovat krátký changelog a evidenci ověřených enginů.

## Ochrana dat

LUDUS nevyžaduje jména ani jiné identifikátory žáků. Do AI generování nesmí vstupovat citlivé údaje, hodnocení konkrétního žáka ani dokumenty obsahující osobní údaje bez anonymizace.

## Stav verze 1.14.0

Jádro dílny je připraveno pro oficiální interní provoz. Produkčně doporučené jsou pouze enginy se stavem `ready`; rozpracované enginy jsou jednoznačně označeny a jejich exportní způsobilost je řízena samostatným polem `builderCompatible`.
