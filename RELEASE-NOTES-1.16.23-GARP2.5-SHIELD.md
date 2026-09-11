# LUDUS 1.16.23 — GARP 2.5.1 SHIELD corrective candidate

Datum: 2026-09-11

Opravné kolo po nezávislém Prompt E auditu 1.16.22. Produkční schválení se tímto kandidátem neuděluje a při testech se používají pouze syntetická data.

## Změny
- LU-N15: `quality-report.json` obsahuje `status: passed|failed`; P5 release certifikace navíc odmítne nekonzistentní `summary.failed > 0`. Validní reporty musí projít, vadný browser report i vadný quality report musí selhat.
- LU-N16: read-only AI Core sync job nejprve provede `git add -A` nad přesně vymezenými cestami a exportuje `git diff --cached --binary`, takže patch obsahuje i nové vendor soubory.
- LU-N17: kanonický AI-boundary verifier kontroluje provider/API signature také v `engines/`, `runtime/`, `public/` a `scripts/`.
- LU-N18: kanonický secret scanner rekurzivně kontroluje obecné ZIP i OOXML archivy s fail-closed limity velikosti, počtu členů a hloubky.
- LU-N19: provenance subject je samostatně dodaný school payload ZIP, takže jednotnou PREP bránu lze opakovat bez nedodaného artefaktu.
- Kanonický selftest obsahuje nové negativní kontroly pro binary/CSS/SVG/OOXML/general ZIP a rozšířený AI-boundary drift.

Pedagogická logika, obsah enginů, prompty a AI instrukce jsou věcně beze změny.

School-server production: NEPOVOLENO. Reálná studentská data: NEPOUŽÍVAT.
