import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { verifyLiveRelease } from './verify-live-release.mjs';

const SHA = 'a'.repeat(40);
const VERSION = '1.16.31';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

function fixtures({ sourceRevision = SHA, patchVersion = VERSION, studioVersion = VERSION, otherApp = false } = {}) {
  const patchAssuranceBytes = Buffer.from(JSON.stringify({
    schema: 'ghrab-patch-assurance-manifest-v1',
    appId: otherApp ? 'other-app' : 'ludus',
    version: patchVersion,
    algorithm: 'SHA-256',
    sourceRevision,
    artifacts: {},
  }));
  const studioManifestBytes = Buffer.from(JSON.stringify({
    schema: 'ai-studio-app-manifest-v1',
    id: 'ludus',
    version: studioVersion,
    assurance: {
      schema: 'ghrab-patch-assurance-v1',
      evidenceManifestSha256: digest(patchAssuranceBytes),
    },
  }));
  return { studioManifestBytes, patchAssuranceBytes, expectedVersion: VERSION,
    expectedSourceSha: SHA, expectedPatchAssuranceSha256: digest(patchAssuranceBytes) };
}

test('accepts a source-bound live deployment with identical artifact bytes', () => {
  const result = verifyLiveRelease(fixtures());
  assert.equal(result.sourceRevision, SHA);
});

test('rejects previous SHA even when published version is unchanged', () => {
  assert.throws(() => verifyLiveRelease(fixtures({ sourceRevision: 'b'.repeat(40) })), /sourceRevision/);
});

test('rejects different live bytes even if self-consistent and version matches', () => {
  const evidence = fixtures();
  evidence.expectedPatchAssuranceSha256 = digest(Buffer.from('some different release'));
  assert.throws(() => verifyLiveRelease(evidence), /digest differs/);
});

test('rejects modified live assurance bytes not reflected in live Studio manifest', () => {
  const evidence = fixtures();
  evidence.patchAssuranceBytes = Buffer.from(evidence.patchAssuranceBytes.toString('utf8') + ' ');
  assert.throws(() => verifyLiveRelease(evidence), /not bound/);
});

test('rejects changed version or application identity', () => {
  assert.throws(() => verifyLiveRelease(fixtures({ studioVersion: '0.0.0' })), /Studio manifest/);
  assert.throws(() => verifyLiveRelease(fixtures({ patchVersion: '0.0.0' })), /patch-assurance/);
  assert.throws(() => verifyLiveRelease(fixtures({ otherApp: true })), /patch-assurance/);
});

test('fails closed for malformed JSON, empty expected digest and SHA', () => {
  const evidence = fixtures();
  assert.throws(() => verifyLiveRelease({ ...evidence, patchAssuranceBytes: Buffer.from('{bad') }), /not valid JSON/);
  assert.throws(() => verifyLiveRelease({ ...evidence, expectedSourceSha: '' }), /Missing or invalid/);
  assert.throws(() => verifyLiveRelease({ ...evidence, expectedPatchAssuranceSha256: '' }), /Missing or invalid/);
});
