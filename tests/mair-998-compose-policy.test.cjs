'use strict';
// MAIR-998: bffImageRefs keeps the whole BFF image reference, suffix or digest included, so a
// compose file cannot pass the stage-tag policy with `${UPSTREAM_TAG:-dev}-old` or a digest.
const test = require('node:test');
const assert = require('node:assert/strict');
const { bffImageRefs } = require('./support/compose-policy.cjs');

test('MAIR-998 bffImageRefs keeps what follows the interpolated stage tag', () => {
  const services = {
    suffix: { image: '${BFF_X_IMAGE:-ghcr.io/mairie360/bff-x:${UPSTREAM_TAG:-dev}-old}' },
    digest: { image: 'ghcr.io/mairie360/bff-x:${UPSTREAM_TAG:-dev}@sha256:abc' },
    plain: { image: '${BFF_X_IMAGE:-ghcr.io/mairie360/bff-x:${UPSTREAM_TAG:-dev}}' },
  };
  assert.deepEqual(bffImageRefs(services), [
    'ghcr.io/mairie360/bff-x:${UPSTREAM_TAG:-dev}-old',
    'ghcr.io/mairie360/bff-x:${UPSTREAM_TAG:-dev}@sha256:abc',
    'ghcr.io/mairie360/bff-x:${UPSTREAM_TAG:-dev}',
  ]);
});
