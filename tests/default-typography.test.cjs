const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { referenceDocument } = require('./support/document-styles.cjs');

const css = readFileSync(path.join(__dirname, '../src/app/globals.css'), 'utf8');

test('Projects applies the reference scale and body font while retaining global style policies', (t) => {
  const window = referenceDocument(t);
  assert.equal(window.getComputedStyle(window.document.documentElement).fontSize, '17px');
  assert.equal(window.getComputedStyle(window.document.body).fontFamily, 'system-ui, sans-serif');
});

test('Projects retains the reference sidebar rhythm and shadow without replacing shared navigation', () => {
  assert.match(css, /aside\[aria-label="Navigation principale"\]\s*\{[^}]*position:\s*relative;[^}]*z-index:\s*20;[^}]*box-shadow:\s*8px 0 24px rgb\(12 28 48 \/ 28%\);/);
  assert.match(css, /aside\[aria-label="Navigation principale"\]\s*>\s*nav button\s*\{[^}]*min-height:\s*44px;[^}]*flex-shrink:\s*0;/);
});

test('the mobile sidebar stays below the published Close control', () => {
  assert.match(css, /\[role="dialog"\]\[aria-label="Navigation mobile"\]\s+aside\[aria-label="Navigation principale"\]\s*\{[^}]*z-index:\s*0;/);
});
