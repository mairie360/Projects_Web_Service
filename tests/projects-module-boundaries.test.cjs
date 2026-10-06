const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync, existsSync } = require('node:fs');
const { join } = require('node:path');
const ts = require('typescript');

const root = join(__dirname, '..');
const source = (file) => readFileSync(join(root, file), 'utf8');
const ast = (file) => ts.createSourceFile(file, source(file), ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
const imports = (file) => ast(file).statements.filter(ts.isImportDeclaration).map(node => node.moduleSpecifier.text);

test('the Projects route only composes a stable controller and workspace', () => {
  const page = source('src/app/page.tsx');
  assert.match(page, /useProjectsController\(\)/);
  assert.match(page, /<ProjectsWorkspace/);
  assert.doesNotMatch(page, /useState|useEffect|useRef|bffProjectClient|ProjectModals/);
});

test('the controller owns existing state and commands without JSX or component dependencies', () => {
  const file = 'src/components/project/useProjectsController.ts';
  const tree = ast(file);
  let jsx = false;
  const visit = node => {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)) jsx = true;
    ts.forEachChild(node, visit);
  };
  visit(tree);
  assert.equal(jsx, false);
  assert.match(source(file), /export function useProjectsController/);
  assert.equal(imports(file).some(name => /ProjectViews|ProjectModals|ProjectsWorkspace|lib-components|Kanban/.test(name)), false);
});

test('the workspace renders controller props without duplicating business state or requests', () => {
  const file = 'src/components/project/ProjectsWorkspace.tsx';
  assert.match(source(file), /export function ProjectsWorkspace/);
  assert.doesNotMatch(source(file), /useState|useEffect|useRef|useProjectsController\(\)|getProjectsPage\(/);
  assert.equal(imports(file).some(name => /bffProjectClient|ProjectModals/.test(name)), false);
  assert.ok(imports(file).includes('./CreateProjectModal'));
  assert.ok(imports(file).includes('./ProjectDetailModal'));
});

test('creation and detail dialogs have separate stable top-level components', () => {
  for (const name of ['CreateProjectModal', 'ProjectDetailModal']) {
    const file = `src/components/project/${name}.tsx`;
    const functions = ast(file).statements.filter(ts.isFunctionDeclaration);
    assert.deepEqual(functions.map(node => node.name.text), [name]);
  }
  assert.equal(existsSync(join(root, 'src/components/project/ProjectModals.tsx')), false);
});
