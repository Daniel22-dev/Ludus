# LUDUS — knihovna hotových šablon učiva

Verze: 1.14.0

Šablony slouží jako rychlý start bez zbytečného nastavování. V dílně nastaví téma, doporučenou mechaniku, svět a jazyk obsahu. Nejde o uzamčený obsah — učitel může šablonu dál upravit, vygenerovat hru přes Gemini nebo z ní vytvořit lesson pack.

## Aktuální šablony v dílně

| Šablona | Předmět | Úroveň | Doporučená mechanika | Doporučený svět |
|---|---|---|---|---|
| AJ B1 · vztažné věty | Angličtina | B1 | Akademie | Akademie Arkána |
| AJ B1 · present perfect vs past simple | Angličtina | B1 | Detektivka | Zimní expres |
| AJ B1/B2 · conditionals | Angličtina | B1/B2 | Quest | Lovci relikvií |
| AJ A2 · nepravidelná slovesa | Angličtina | A2 | Boss / dril | Last One Standing |
| ŠJ A2 · pretérito indefinido | Španělština | A2 | Akademie | Akademie Arkána |
| ŠJ B1 · indefinido vs imperfecto | Španělština | B1 | Detektivka | Zimní expres |
| Dějepis · příčiny 1. světové války | Dějepis | SŠ | Časová osa | Časová hlídka |
| Biologie · fotosyntéza jako proces | Biologie | SŠ | Laboratoř | Forenzní laboratoř |

## Jak přidat další šablonu

V `src/index.html` doplň položku do `TEMPLATE_LIBRARY`. Každá položka by měla mít `id`, `label`, `subject`, `level`, `topicId` nebo vlastní `topic`, `frame`, `skin`, `contentLang`, `supportLang` a krátkou poznámku `note`.

Po úpravě spustit:

```bash
npm test
npm run build
```
