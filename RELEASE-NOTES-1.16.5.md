# LUDUS 1.16.5

**Datum:** 2026-08-04
**Etapa:** P0 – odolný start, bezpečná aktualizace a server-ready základ

## Změny

Opraveno zmrazování centrálního guardu v service workeru, deployment bootstrap je společný pro dílnu i všechny enginy a reportér neblokuje start. Migrace AI modelů a Core je P1.

## Hranice etapy

Serverový P0 build neobsahuje tajné údaje a nepředstírá hotovou serverovou autentizaci ani AI gateway. Aktivní zůstává kompatibilní podepsaný permit a dosavadní AI transport; cílový profil je přiložen jako šablona pro P1.

## Data uživatele

P0 nemění obsahové prompty ani záměrně nemigruje uložená uživatelská data. Před nasazením se přesto doporučuje vytvořit zálohu současného repozitáře a u aplikací s lokálními daty exportovat důležitou práci.
