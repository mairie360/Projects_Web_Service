const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const sharp = require('sharp');

const root = path.join(__dirname, '..');
const readJson = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));

test('the Next image runtime resolves the patched sharp release from the lock', () => {
  const manifest = readJson('package.json');
  const lock = readJson('package-lock.json');
  assert.equal(manifest.overrides.next.sharp, '^0.35.5');
  assert.equal(lock.packages['node_modules/sharp'].version, sharp.versions.sharp);
  const [major, minor, patch] = sharp.versions.sharp.split('.').map(Number);
  assert(major > 0 || minor > 35 || (minor === 35 && patch >= 5));
});

test('the prebuilt image runtime includes the corrected librsvg dependency', () => {
  const [major, minor, patch] = sharp.versions.rsvg.split('.').map(Number);
  assert(major > 2 || (major === 2 && (minor > 63 || (minor === 63 && patch >= 2))));
});

test('a small ordinary SVG remains renderable as a PNG', async () => {
  // Harmless image fixture only, not a reproduction of a vulnerability.
  const input = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12"><circle cx="6" cy="6" r="4" fill="#336699"/></svg>');
  const png = await sharp(input).png().toBuffer();
  const metadata = await sharp(png).metadata();
  assert.equal(metadata.format, 'png');
  assert.equal(metadata.width, 12);
  assert.equal(metadata.height, 12);
  assert.equal(metadata.hasAlpha, true);
});
