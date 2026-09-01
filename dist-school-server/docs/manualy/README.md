# LUDUS manuály

Závazná sada manuálů LUDUS 00–07. Tyto soubory patří ke konkrétní verzi repozitáře a mají sloužit jako zdroj pravidel pro další vývoj enginů, manifestu a exportů.

## Sada

- 00_Rozcestnik_LUDUS_manualy.docx
- 01_LUDUS_architektura_a_enginy.docx
- 02_Format_hry_a_manifest.docx
- 03_Struktura_jednoho_HTML_enginu.docx
- 04_Typy_cviceni_a_validace.docx
- 05_Jazyky_branding_safe_official_export.docx
- 06_Roadmap_migrace_a_testovani.docx
- 07_Model_mechanik_a_hernich_konceptu.docx

## Poznámka pro vývoj

Stav a běžná metadata enginů se mají udržovat v `engines/manifest.json`. `src/index.html` obsahuje jen fallback registr pro režim, kdy manifest nejde načíst.
