#!/usr/bin/env node
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const SHA = /^[0-9a-f]{40}$/i;
const SHA256 = /^[0-9a-f]{64}$/i;

function parseDocument(bytes, name) {
  try {
    return JSON.parse(Buffer.from(bytes).toString('utf8'));
  } catch {
    throw new Error(`${name} is not valid JSON.`);
  }
}

// Validate the bytes fetched from Pages, never a version-only response.
// Both the expected SHA and expected artifact digest come from the same
// main-branch qa-build job, not from the live endpoint being inspected.
export function verifyLiveRelease({
  studioManifestBytes,
  patchAssuranceBytes,
  expectedVersion,
  expectedSourceSha,
  expectedPatchAssuranceSha256,
}) {
  if (!String(expectedVersion || '').trim() || !SHA.test(expectedSourceSha || '') ||
      !SHA256.test(expectedPatchAssuranceSha256 || '')) {
    throw new Error('Missing or invalid independent expected release identity.');
  }

  const studio = parseDocument(studioManifestBytes, 'studio-manifest.json');
  const patch = parseDocument(patchAssuranceBytes, 'patch-assurance.json');
  const actualDigest = createHash('sha256').update(patchAssuranceBytes).digest('hex');
  const expectedDigest = expectedPatchAssuranceSha256.toLowerCase();

  if (studio.schema !== 'ai-studio-app-manifest-v1' || studio.id !== 'ludus' ||
      studio.version !== expectedVersion) {
    throw new Error('Live Studio manifest app/schema/version mismatch.');
  }
  if (patch.schema !== 'ghrab-patch-assurance-manifest-v1' || patch.appId !== 'ludus' ||
      patch.version !== expectedVersion || patch.algorithm !== 'SHA-256') {
    throw new Error('Live patch-assurance manifest app/schema/version mismatch.');
  }
  if (!SHA.test(String(patch.sourceRevision || '')) ||
      patch.sourceRevision.toLowerCase() !== expectedSourceSha.toLowerCase()) {
    throw new Error('Live sourceRevision does not match the built main commit.');
  }
  if (studio.assurance?.schema !== 'ghrab-patch-assurance-v1' ||
      String(studio.assurance?.evidenceManifestSha256 || '').toLowerCase() !== actualDigest) {
    throw new Error('Live Studio manifest is not bound to the live assurance bytes.');
  }
  if (actualDigest !== expectedDigest) {
    throw new Error('Live assurance digest differs from the certified build artifact.');
  }

  return { sourceRevision: expectedSourceSha, version: expectedVersion, sha256: actualDigest };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    if (process.argv.length !== 4) {
      throw new Error('Usage: verify-live-release.mjs STUDIO_MANIFEST_PATH PATCH_ASSURANCE_PATH');
    }
    const result = verifyLiveRelease({
      studioManifestBytes: fs.readFileSync(process.argv[2]),
      patchAssuranceBytes: fs.readFileSync(process.argv[3]),
      expectedVersion: process.env.EXPECTED_VERSION,
      expectedSourceSha: process.env.EXPECTED_SOURCE_SHA,
      expectedPatchAssuranceSha256: process.env.EXPECTED_PATCH_ASSURANCE_SHA256,
    });
    console.log(`Verified LUDUS ${result.version} source ${result.sourceRevision} digest ${result.sha256}`);
  } catch (error) {
    console.error(`Live release verification failed: ${error.message}`);
    process.exitCode = 1;
  }
}
