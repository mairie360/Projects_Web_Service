const assert = require('node:assert/strict');
const { readFileSync, readdirSync, statSync } = require('node:fs');
const { join, resolve } = require('node:path');
const { test } = require('node:test');

// MAIR-1133: the module runs on lib-components 2.3 as published — white frame without footer, the lib visuals
// (buttons, pills, cards, modals, toasts, tooltips, counter) never overridden by local CSS or `!` utilities.
const root = resolve(__dirname, '..');
const read = (file) => readFileSync(join(root, file), 'utf8');

function sources(dir) {
  return readdirSync(join(root, dir)).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(join(root, path)).isDirectory()) return sources(path);
    return /\.tsx$/.test(name) && !/\.test\./.test(name) ? [path] : [];
  });
}

test('MAIR-1133: lib-components is pinned to exactly 2.3.0, installed and locked', () => {
  const manifest = JSON.parse(read('package.json'));
  const lock = JSON.parse(read('package-lock.json'));
  assert.equal(manifest.dependencies['@mairie360/lib-components'], '2.3.0');
  assert.equal(lock.packages['node_modules/@mairie360/lib-components'].version, '2.3.0');
  assert.equal(JSON.parse(read('node_modules/@mairie360/lib-components/package.json')).version, '2.3.0');
});

test('MAIR-1133: no local stylesheet rule targets a lib component', () => {
  const css = read('src/app/globals.css');
  for (const selector of ['aside[', '.projects-shell', '[role="tablist"]', '[role="dialog"]', 'nav button', '> main', 'footer']) {
    assert.equal(css.includes(selector), false, `globals.css must not override ${selector}`);
  }
});

test('MAIR-1133: lib components are not restyled with important utilities, the shell shows no footer', () => {
  for (const file of sources('src/components')) {
    const source = read(file);
    for (const match of source.matchAll(/<(Button|IconButton|StatusPill|StatusBadge|Tag|Card|Panel|Modal|Drawer|Counter)\b[^>]*className="([^"]*)"/g)) {
      assert.doesNotMatch(match[2], /(^|\s)!|!bg-|!text-|!border-|!rounded/, `${file}: ${match[1]} keeps the lib look`);
    }
  }
  const workspace = read('src/components/ProjectsWorkspace/ProjectsWorkspace.tsx');
  assert.doesNotMatch(workspace, /showFooter|footerPlacement|className="projects-shell"/);
});
