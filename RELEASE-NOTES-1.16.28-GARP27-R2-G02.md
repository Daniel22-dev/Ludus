# LUDUS 1.16.28 — GARP 2.7 r2 / G-02 hardening

Date: 2026-09-23

## Scope

Security-contract patch only. Pedagogical game behavior is unchanged.

## Changes

- Rebased the application from GARP 2.7 consolidated r1 to r2.
- Closed G-02 policy-admission false-PASS path.
- Added trusted ecosystem app inventory to policy admission.
- Policy appVersion must be valid semver and cannot be 0.0.0.
- Every required policy section must contain recognized semantic content.
- Exact and substring placeholder values are rejected fail-closed.
- LUDUS foundation policy was migrated from mode-only declarations to concrete semantic controls.
- Reference contract selftest expands from 20 to 25 checks, including 5 G-02 negative cases.
- Reference package selftest is recorded as 19/19.
- School-server implementation remains DEFERRED_BY_OWNER_DECISION; SHIELD-LIVE and RI-LIVE remain NOT_TESTED.
- Architecture policy itself is unchanged, therefore the external architecture trust-anchor SHA is intentionally unchanged.

## Promotion

Promote only after protected GitHub CI is green. Real student data remains NOT APPROVED.
