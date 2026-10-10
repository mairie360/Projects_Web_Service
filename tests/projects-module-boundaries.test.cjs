const assert = require('node:assert/strict');
const { test } = require('node:test');
const { existsSync } = require('node:fs');
const { join } = require('node:path');
const { ts, parse, nodes, imported, exportedCallable, callName, calls, importedCallNames } = require('./support/module-policy.cjs');
const root = join(__dirname, '..');
const imports = source => imported(source).map(row => row.specifier);
const names = source => { const aliases = importedCallNames(source); return calls(source).map(node => aliases.get(callName(node.expression)) ?? callName(node.expression)); };
// AST architecture policy only. Real dialog/rerender/draft behavior is tested separately.
test('the Projects route only composes a stable controller and workspace', () => {
  const page = parse('src/app/page.tsx');
  const aliases = importedCallNames(page);
  const controller = calls(page).filter(node => (aliases.get(callName(node.expression)) ?? callName(node.expression)) === 'useProjectsController');
  assert.equal(controller.length, 1); assert.equal(controller[0].arguments.length, 0);
  const workspace = nodes(page, node => ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)).filter(node => (aliases.get(callName(node.tagName)) ?? callName(node.tagName)) === 'ProjectsWorkspace');
  assert.equal(workspace.length, 1);
  assert.equal(names(page).some(name => ['useState', 'useEffect', 'useRef'].includes(name)), false);
  assert.equal(imports(page).some(name => /bffProjectClient|ProjectModals/.test(name)), false);
});
test('the controller owns existing state and commands without JSX or component dependencies', () => {
  const source = parse('src/components/project/useProjectsController.ts');
  assert.equal(nodes(source, node => ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)).length, 0);
  assert.ok(exportedCallable(source, 'useProjectsController'));
  assert.equal(imports(source).some(name => /ProjectViews|ProjectModals|ProjectsWorkspace|lib-components|Kanban/.test(name)), false);
});
test('the workspace renders controller props without duplicating business state or requests', () => {
  const source = parse('src/components/project/ProjectsWorkspace.tsx');
  assert.ok(exportedCallable(source, 'ProjectsWorkspace'));
  assert.equal(names(source).some(name => ['useState', 'useEffect', 'useRef', 'useProjectsController', 'getProjectsPage'].includes(name)), false);
  assert.equal(imports(source).some(name => /bffProjectClient|ProjectModals/.test(name)), false);
  assert.ok(imports(source).includes('./CreateProjectModal'));
  assert.ok(imports(source).includes('./ProjectDetailModal'));
});
test('creation and detail dialogs have separate stable top-level components', () => {
  for (const name of ['CreateProjectModal', 'ProjectDetailModal']) {
    const source = parse(`src/components/project/${name}.tsx`);
    assert.ok(exportedCallable(source, name));
  }
  assert.equal(existsSync(join(root, 'src/components/project/ProjectModals.tsx')), false);
});
