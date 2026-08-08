# LUDUS 1.16.11 — CI hotfix 2026-08-08

Oprava vychází z GitHub Actions běhů 31265410073 / 31265410078 / 31265410081.

- exact axe: zvýšen kontrast sekundárních popisků v D&D, Indiana Jones a Star Wars; Matrix má explicitní kontrast placeholderu a přechod obrazovek už nesnižuje opacity ovládacích prvků;
- visual QA: při vizuálním testu se Studio ochrana explicitně stripuje stejným způsobem jako v runtime auditu, takže engine stránky nejsou falešně blokovány chybějícím platform unlock helperem;
- combinatorial QA: validátor respektuje externí sdílený runtime `data-ludus-shared-runtime` a strukturované SKINS v Indiana Jones;
- media provenance: soukromá official média nejsou vyžadována ve veřejném GitHub source balíku; pokud jsou přítomna, jejich SHA-256 se dál ověřuje. Public dist je musí dál vylučovat.

Verze aplikace zůstává 1.16.11.
