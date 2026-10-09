const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { JSDOM, VirtualConsole } = require('jsdom');
const postcss = createRequire(require.resolve('next/package.json'))('postcss');

function referenceDocument(t) {
  const css = readFileSync(path.join(__dirname, '../../src/app/globals.css'), 'utf8');
  const errors = [];
  const console = new VirtualConsole();
  console.on('jsdomError', (error) => errors.push(error.message));
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
    url: 'https://frontend.example/',
    virtualConsole: console,
  });
  t.after(() => dom.window.close());
  const style = dom.window.document.createElement('style');
  style.textContent = css;
  dom.window.document.head.append(style);
  assert.deepEqual(errors, [], 'The application stylesheet must be accepted');
  const parsed = postcss.parse(css);
  let themeFont;
  parsed.walkDecls((declaration) => {
    assert.equal(['--text-xs', '--text-sm'].includes(declaration.prop), false, 'Do not override global small-text tokens');
    if (declaration.prop === '--font-sans' && declaration.parent.type === 'atrule' && declaration.parent.name === 'theme') {
      themeFont = declaration.value.split(',').map((name) => name.trim());
    }
    if (declaration.parent.type === 'rule' && ['height', 'min-height', 'max-height'].includes(declaration.prop)) {
      const selectors = declaration.parent.selectors.map((selector) => selector.trim());
      assert.equal(selectors.some((selector) => selector === 'header' || selector === '.h-16'), false, 'Do not add global fixed-header dimensions');
    }
  });
  assert.deepEqual(themeFont, ['system-ui', 'sans-serif'], 'Keep the declared Tailwind system-font token');
  return dom.window;
}

module.exports = { referenceDocument };
