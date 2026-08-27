# LUDUS 1.16.15 — GARP kandidát pro Claude, kolo 2

Opravná verze po nezávislé kontrole kandidáta 1.16.14.

## Potvrzený nález L1
Importovaný herní obsah mohl na některých cestách přejít z `GAME_CONTENT` do `innerHTML` bez output encodingu. Zároveň se náhled otevíral z `blob:` URL v originu builderu.

## Oprava
- dotčené dynamické hodnoty v Chronos, Hogwarts, LOTR a Laughworks jsou escapovány nebo vloženy přes `textContent`;
- Hogwarts wordbank již nevkládá nedůvěryhodné slovo do inline atributů;
- preview používá sandboxovaný iframe s `allow-scripts`, ale bez `allow-same-origin`;
- GARP gate kontroluje izolaci preview a známé regresní sinky.

CSP `unsafe-inline` zůstává zdokumentovaným kompatibilitním dluhem a není v tomto bezpečnostním patchi vydáváno za odstraněné.
