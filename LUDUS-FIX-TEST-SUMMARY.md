# LUDUS 1.16.11 — CI fix summary (2026-08-08)

GitHub failures addressed from the failing run evidence:

- exact axe-core 4.12.1: 20 serious blockers
  - D&D segment descriptions: fixed contrast to 6.58:1 / 5.59:1
  - Indiana Jones segment descriptions: fixed contrast to 6.23:1 / 5.53:1
  - Star Wars segment descriptions: fixed contrast to 5.84:1 / 5.19:1
  - Matrix placeholder: explicit solid muted color, calculated 6.28:1
  - Matrix start button: opacity animation removed; solid-state contrast 10.74:1
- media provenance: private official A/V remains optional and excluded from public GitHub source; hashes are still verified whenever the private files are present.
- combinatorial QA: validator aligned with the shared runtime marker and structured Indiana Jones skin labels; pairwise coverage remains required.
- visual QA: test-only static server strips Studio protection for direct engine rendering; production access protection is unchanged.

Local verification completed:

- npm test: PASS
- platform conformance: 104/104 PASS
- qa:media: PASS
- qa:combinatorial: PASS, 55/660 scenarios, pairwise 100%
- qa:technical: PASS, 0 findings
- qa:security: PASS, 0 findings
- qa:pwa: PASS, 0 findings
- qa:quality: PASS, 102/102
- qa:browser: PASS
- qa:xss: PASS
- test:reporter static: 50 PASS / 0 FAIL
- qa-p5-lock: PASS
- visual HTTP engine preflight: 11/11 PASS, HTTP 200, expected text present, Studio-protected bootstrap removed

Not claimed locally:

- full Playwright visual/critical suite and exact axe rerun. The local managed Chromium / package mirror prevents reproducing the GitHub browser environment exactly. The fixes above are based directly on the GitHub evidence artifacts from the failed run.
