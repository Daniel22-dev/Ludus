# LUDUS 1.16.25 - A06/A07 assurance hardening

This patch does not change classroom functionality. It closes repository/audit controls around the existing GARP 2.5.1 and AUTO PATCH flow.

## A06 - protected main

The repository default branch is protected by the active `Protect main` ruleset (ruleset 23551158): deletion and non-fast-forward updates are blocked, pull requests are required, required checks are `test`, `p5-release-gate`, and `axe`, and no bypass actor is configured.

## A07 - cryptographic patch evidence binding

A real GitHub build emits `patch-assurance.json` and adds an `assurance` block to the live `studio-manifest.json`. The assurance manifest is SHA-256 bound and in turn binds these deployed artifacts:

- GARP security evidence manifest;
- source CycloneDX SBOM;
- deployment CycloneDX SBOM;
- AI assurance fingerprint.

AI Studio centrally requires `ghrab-patch-assurance-v1` for LUDUS auto-promotion and fails closed when a URL, identity, version, schema, or SHA-256 digest does not match.

`SHIELD-LIVE` and `RI-LIVE` remain outside this patch and require the real school-server deployment.
