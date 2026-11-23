const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join, resolve } = require('node:path');
const { test, before, after, beforeEach, afterEach } = require('node:test');
const { requireTs } = require('./support/typescript.cjs');
const { installReactRuntime, mount } = require('./support/server-view.cjs');

// MAIR-1134 (Figma F12, F4): collapsible Kanban columns (lib KanbanColumn) remembered per browser, the view switch
// on its own row, the 280 ms fold (lib) and 260 ms view transitions without motion under prefers-reduced-motion,
// « Modifier » in the three « … » menus and the page subtitle.

installReactRuntime();
const React = require('react');
const { createFrontHarness } = require('./support/front-harness.cjs');
const f = require('./support/bff-fixtures.cjs');
const Page = requireTs('src/app/projects-client.tsx').default;
const { COLLAPSED_PROJECT_COLUMNS_KEY, COLLAPSED_TASK_COLUMNS_KEY } = requireTs('src/components/ProjectsWorkspace/use-collapsed-columns.ts');

const root = resolve(__dirname, '..');
const read = (file) => readFileSync(join(root, file), 'utf8');
const harness = createFrontHarness();
const { bffProject } = harness;
let view;

before(() => harness.start());
after(() => harness.stop());
beforeEach(() => {
  harness.reset();
  harness.location.search = '';
  harness.signIn(f.jwt(f.agents.marie.id));
  bffProject.on('get', '/projects-page', { body: f.projectsPage() });
});
afterEach(() => {
  view?.unmount();
  view = undefined;
  assert.deepEqual(harness.violations(), []);
});

test('MAIR-1134: both boards fold their columns with the lib KanbanColumn and remember them under their own key', () => {
  assert.equal(COLLAPSED_PROJECT_COLUMNS_KEY, 'm360-collapsed-projects');
  assert.equal(COLLAPSED_TASK_COLUMNS_KEY, 'm360-collapsed-tasks');
  const projects = read('src/components/ProjectsWorkspace/components/KanbanBoard/KanbanBoard.tsx');
  const tasks = read('src/components/ProjectsWorkspace/components/ProjectPage/components/ProjectTasksTab/components/TaskBoard/TaskBoard.tsx');
  for (const [source, key] of [[projects, 'COLLAPSED_PROJECT_COLUMNS_KEY'], [tasks, 'COLLAPSED_TASK_COLUMNS_KEY']]) {
    assert.match(source, /<KanbanColumn\b[^]*collapsible[^]*onCollapsedChange=/);
    assert.match(source, new RegExp(`useCollapsedColumns\\(${key}\\)`));
    assert.match(source, /dropActive=/);
  }
});

test('MAIR-1134 C8: a view change fades and rises in for 260 ms, and not under prefers-reduced-motion', () => {
  const css = read('src/app/globals.css');
  assert.match(css, /\.m360-view-enter\s*{\s*animation: m360-view-enter 260ms/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*{\s*\.m360-view-enter\s*{\s*animation: none;/);
  assert.match(read('src/components/ProjectsWorkspace/ProjectsWorkspace.tsx'), /<div key={viewMode} className="m360-view-enter">/);
  assert.match(read('src/components/ProjectsWorkspace/components/ProjectPage/components/ProjectTasksTab/ProjectTasksTab.tsx'), /<div key={view} className="m360-view-enter">/);
});

test('MAIR-1134: the page subtitle, the view switch on its own row and the folding chevrons', async () => {
  view = mount(React.createElement(Page));
  await view.waitFor((html) => !html.includes('Chargement des projets'));
  assert.match(view.html, /<p[^>]*>Pilotez les projets de votre mairie<\/p>/);
  assert.match(view.html, /aria-label="Replier la colonne À faire"/);
  assert.match(view.html, /aria-label="Replier la colonne Terminé"/);
  const bar = view.props('ProjectFiltersBar');
  for (const mode of ['grid', 'table', 'kanban']) {
    await view.act(() => bar.onViewModeChange(mode));
    assert.match(view.html, /role="radiogroup" aria-label="Vue des projets"/);
  }
});

test('MAIR-1134 C14: « Modifier » of a card menu opens the project edit window', async () => {
  view = mount(React.createElement(Page));
  await view.waitFor((html) => !html.includes('Chargement des projets'));
  const [project] = view.props('KanbanBoard').projects;
  assert.equal(typeof view.props('KanbanBoard').onProjectEdit, 'function');
  bffProject.on('get', '/projects/{projectId}', { body: f.projectDetails(project) });
  await view.act(() => view.props('KanbanBoard').onProjectEdit(project));
  await view.waitFor(() => view.find('CreateProjectModal').length === 1);
  assert.equal(view.props('CreateProjectModal').mode, 'edit');
  assert.equal(bffProject.requests.filter((request) => request.method !== 'GET').length, 0);
});
