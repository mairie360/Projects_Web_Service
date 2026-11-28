const { test } = require('node:test');
const assert = require('node:assert/strict');
const { referenceDocument } = require('./support/document-styles.cjs');

test('Projects applies the reference scale and body font while retaining global style policies', (t) => {
  const window = referenceDocument(t);
  assert.equal(window.getComputedStyle(window.document.documentElement).fontSize, '16px'); // MAIR-1254: root size of the artifacts
  assert.equal(window.getComputedStyle(window.document.body).fontFamily, 'system-ui, sans-serif');
});
