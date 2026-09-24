# LUDUS 1.16.29 — FINAL CLEAN-UP / AUDIT

Date: 2026-09-24

## Scope

Release-metadata and assurance-state cleanup only. No pedagogical behavior, game engine, AI operation, prompt, architecture policy or school-server implementation is changed.

## Findings closed

1. `public/config/release-acceptance.json` still claimed `not-yet-uploaded` after the application had already been promoted and deployed.
2. The same source file encoded `PENDING_REAL_CI` for trust/Node 24 even though those are commit-specific CI facts that source metadata must not self-certify.
3. `security/SHIELD-STATUS.json` and `security/ASSURANCE-STATUS.txt` contained stale wording saying release CI/external trust were pending for the already promoted r2 release.
4. `CHANGELOG.md` had two separate 1.16.28 headings for one security wave.

## Resolution

- Source metadata now uses stable states: `repository-tracked`, `REQUIRED_BY_RELEASE_CI` and `PASS_LOCAL_TRUST_PENDING`.
- GitHub Actions is explicitly the authority for commit-specific CI PASS.
- P5 verifies the new repository-tracked semantics.
- Stale CI blockers were removed; the intentional school-server/LIVE deferral remains.
- GARP 2.7 r2 / G-02, architecture-policy SHA and server decision are unchanged.

## Security status

- GARP 2.7 r2 reference package: PACKAGE_SELFTEST 19/19 PASS; CONTRACT_TEST 25/25 PASS; G-02 5/5 PASS.
- School server: DEFERRED_BY_OWNER_DECISION.
- SHIELD-LIVE / RI-LIVE: NOT_TESTED.
- Real student data: NOT APPROVED.
- Release eligibility: requires protected GitHub CI for the exact commit.
