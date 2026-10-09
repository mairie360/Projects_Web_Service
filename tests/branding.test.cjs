const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { loadRootLayout } = require('./support/root-layout.cjs');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => readFileSync(path.join(root, relativePath));

test('browser and app icons use the same Mairie360 mark', () => {
  const logo = read('public/mairie360-logo.png');
  const appleIcon = read('src/app/apple-icon.png');
  const faviconPng = read('public/mairie360-favicon.png');
  const appIcon = read('src/app/icon.png');
  const faviconIco = read('src/app/favicon.ico');

  assert.deepEqual(logo, appleIcon);
  assert.deepEqual(faviconPng, appIcon);
  assert.deepEqual(faviconIco.subarray(22), faviconPng);
  assert.equal(logo.readUInt32BE(16), 192);
  assert.equal(logo.readUInt32BE(20), 192);
  assert.equal(existsSync(path.join(root, 'src/app/icon0.svg')), false);
  assert.equal(existsSync(path.join(root, 'src/app/icon1.png')), false);
});

test('manifest and page metadata expose the branded assets', () => {
  const manifest = JSON.parse(read('src/app/manifest.json').toString('utf8'));
  const { metadata, default: RootLayout } = loadRootLayout(() => require('./support/typescript.cjs').requireTs('src/app/layout.tsx'));
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');

  assert.equal(manifest.icons.length, 1);
  assert.match(manifest.icons[0].src, /^\/mairie360-logo\.png\?v=/);
  assert.equal(manifest.icons[0].purpose, 'any');
  assert.equal(metadata.title, "Projets | Mairie360");
  const icon = metadata.icons.icon.find(item => new URL(item.url, 'https://frontend.test').pathname === '/mairie360-favicon.png');
  assert.ok(icon, 'metadata contains the public browser icon');
  assert.ok(new URL(icon.url, 'https://frontend.test').searchParams.get('v'), 'the icon keeps its cache key');
  const appleIcon = metadata.icons.apple.find(item => new URL(item.url, 'https://frontend.test').pathname === '/mairie360-logo.png');
  assert.ok(appleIcon, 'metadata contains the public app icon');
  assert.ok(new URL(appleIcon.url, 'https://frontend.test').searchParams.get('v'), 'the app icon keeps its cache key');
  const html = renderToStaticMarkup(React.createElement(RootLayout, null, React.createElement('span', { id: 'branding-child' }, 'Preserved child')));
  assert.match(html, /<span id="branding-child">Preserved child<\/span>/);
});
