# Komentář změn — LUDUS 1.14.5

## Co bylo rozbité

Buildová funkce pro centrální přístup vkládala přístupový bootstrap před **první** výskyt `</body>`. LUDUS však uvnitř hlavního JavaScriptu obsahuje také celou HTML šablonu třídního kvízu. První `</body>` proto nepatřilo hlavní stránce, ale této vložené šabloně.

Do JavaScriptového řetězce se tím vložil skutečný tag `<script>…</script>`. Prohlížeč předčasně ukončil hlavní skript a zbytek kódu zobrazil jako obyčejný text pod zápatím.

## Oprava

- bootstrap se vkládá před **poslední** `</body>` hlavního dokumentu;
- přidán regresní test pořadí exportních funkcí, bootstrapu a koncového `</body>`;
- verze a PWA cache zvýšeny na 1.14.5;
- znovu sestaven celý `dist/` a ověřeny všechny enginy.

## Dopad

Oprava nemění herní ani obsahovou logiku. Týká se správného sestavení nasazené stránky a centrální přístupové vrstvy.
