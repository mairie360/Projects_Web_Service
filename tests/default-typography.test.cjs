const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const css = readFileSync(path.join(__dirname, '../src/app/globals.css'), 'utf8');

test('Projects uses the rendered reference default scale and font without global small-text or fixed-header overrides', () => {
  assert.match(css, /html\s*\{\s*font-size: 17px;/);
  assert.match(css, /@theme inline\s*\{[^}]*--font-sans: system-ui, sans-serif;/);
  assert.match(css, /body\s*\{[^}]*font-family: system-ui, sans-serif;/);
  assert.doesNotMatch(css, /--text-(?:xs|sm)\s*:/);
  assert.doesNotMatch(css, /(?:header|\.h-16)\s*\{[^}]*(?:height|min-height|max-height):/);
});

test('Projects retains the reference sidebar rhythm and shadow without replacing shared navigation', () => {
  assert.match(css, /aside\[aria-label="Navigation principale"\]\s*\{[^}]*position:\s*relative;[^}]*z-index:\s*20;[^}]*box-shadow:\s*8px 0 24px rgb\(12 28 48 \/ 28%\);/);
  assert.match(css, /aside\[aria-label="Navigation principale"\]\s*>\s*nav button\s*\{[^}]*min-height:\s*44px;[^}]*flex-shrink:\s*0;/);
});

test('the mobile sidebar stays below the published Close control', () => {
  assert.match(css, /\[role="dialog"\]\[aria-label="Navigation mobile"\]\s+aside\[aria-label="Navigation principale"\]\s*\{[^}]*z-index:\s*0;/);
});
