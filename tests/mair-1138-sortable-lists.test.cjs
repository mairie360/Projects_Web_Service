const assert = require('node:assert/strict');
const { test, before, after, beforeEach, afterEach } = require('node:test');
const { requireTs } = require('./support/typescript.cjs');
const { installReactRuntime, mount } = require('./support/server-view.cjs');

// MAIR-1138: the lists sort by a click on their header with the lib DataTable mechanism (1st click ascending, 2nd
// descending, `aria-sort`), business orders for the state and the priority, empty values always last: the task list
// of a project (by due date first) and the projects table.

installReactRuntime();
const React = require('react');
const { createFrontHarness } = require('./support/front-harness.cjs');
const f = require('./support/bff-fixtures.cjs');
const Page = requireTs('src/app/projects-client.tsx').default;
const { sortRows, statusRank, priorityRank, sortableDate } = requireTs('src/components/ProjectsWorkspace/table-sort.ts');

const harness = createFrontHarness();
const { bffProject } = harness;
const project = f.projectListItem();
const tasks = [
  f.projectTask({ id: 'task-1', title: 'Relevé', dueDate: '2026-11-20T00:00:00.000Z', priority: 'low' }),
  f.projectTask({ id: 'task-2', title: 'Audit', dueDate: '', priority: 'high', status: 'in-progress' }),
  f.projectTask({ id: 'task-3', title: 'Budget', dueDate: '2026-10-01T00:00:00.000Z', priority: 'medium', status: 'done' }),
];
let view;

before(() => harness.start());
after(() => harness.stop());
beforeEach(() => {
  harness.reset();
  harness.location.search = '';
  harness.signIn(f.jwt(f.agents.marie.id));
});
afterEach(() => {
  view?.unmount();
  view = undefined;
  assert.deepEqual(harness.violations(), []);
});

const sortHeader = (label) => (props, text, tag) => tag === 'button' && text === label && typeof props.onClick === 'function';
const ariaSort = (label) => new RegExp(`<th[^>]*aria-sort="([a-z]+)"[^>]*><button[^>]*><span[^>]*>${label}<`).exec(view.html)?.[1];

test('MAIR-1138 helper: empty values last in both directions, numbers and French text compared', () => {
  const rows = [{ v: 'b' }, { v: '' }, { v: 'A' }, { v: null }, { v: 'é' }];
  const valueOf = { v: (row) => row.v };
  assert.deepEqual(sortRows(rows, { key: 'v', direction: 'asc' }, valueOf).map((row) => row.v), ['A', 'b', 'é', '', null]);
  assert.deepEqual(sortRows(rows, { key: 'v', direction: 'desc' }, valueOf).map((row) => row.v), ['é', 'b', 'A', '', null]);
  assert.deepEqual(sortRows([{ v: 10 }, { v: 9 }], { key: 'v', direction: 'asc' }, valueOf).map((row) => row.v), [9, 10]);
  assert.deepEqual(sortRows(rows, null, valueOf), rows);
  assert.ok(statusRank('todo') < statusRank('in-progress') && statusRank('in-progress') < statusRank('done'));
  assert.ok(priorityRank('high') < priorityRank('medium') && priorityRank('medium') < priorityRank('low'));
  assert.equal(sortableDate('2026-10-01T00:00:00.000Z'), '2026-10-01');
  assert.equal(sortableDate('Sans échéance'), '');
});

test('MAIR-1138: the task list sorts by due date first, then by the clicked header', async () => {
  bffProject.on('get', '/projects-page', { body: f.projectsPage([project]) });
  bffProject.on('get', '/projects/{projectId}', { body: f.projectDetails(project, tasks) });
  view = mount(React.createElement(Page));
  await view.waitFor((html) => !html.includes('Chargement des projets'));
  await view.act(() => view.props('KanbanBoard').onProjectOpen(view.props('KanbanBoard').projects[0]));
  await view.waitFor(() => view.find('ProjectPage').length === 1);
  await view.act(() => view.props('TaskToolbar').onViewChange('list'));
  const order = () => view.props('DataTable').rows.map((item) => item.task.id);
  // The projects table is hidden behind the page: the first DataTable is the task list.
  assert.equal(view.props('DataTable').label, 'Tâches du projet');
  assert.deepEqual(order(), ['task-3', 'task-1', 'task-2'], 'by due date, the task without one last');
  assert.equal(ariaSort('Échéance'), 'ascending');

  await view.click(sortHeader('Échéance'));
  assert.deepEqual(order(), ['task-1', 'task-3', 'task-2'], 'descending, still without due date last');
  assert.equal(ariaSort('Échéance'), 'descending');

  await view.click(sortHeader('Priorité'));
  assert.deepEqual(order(), ['task-2', 'task-3', 'task-1'], 'Haute < Moyenne < Basse');
  assert.equal(ariaSort('Priorité'), 'ascending');
  assert.equal(ariaSort('Échéance'), 'none');

  await view.click(sortHeader('État'));
  assert.deepEqual(order(), ['task-1', 'task-2', 'task-3'], 'À faire < En cours < Terminé');
  await view.click(sortHeader('Tâche'));
  assert.deepEqual(order(), ['task-2', 'task-3', 'task-1']);
  assert.equal(bffProject.requests.filter((request) => request.method !== 'GET').length, 0, 'sorting never writes');
});

test('MAIR-1138: the projects table sorts with the same mechanism, empty due dates last', async () => {
  const projects = [
    f.projectListItem({ id: 'project-1', title: 'Éclairage', status: 'done', priority: 'low', dueDate: '2026-12-15' }),
    f.projectListItem({ id: 'project-2', title: 'Voirie', status: 'todo', priority: 'high', dueDate: '' }),
    f.projectListItem({ id: 'project-3', title: 'Accueil', status: 'in-progress', priority: 'medium', dueDate: '2026-11-01' }),
  ];
  bffProject.on('get', '/projects-page', { body: f.projectsPage(projects) });
  view = mount(React.createElement(Page));
  await view.waitFor((html) => !html.includes('Chargement des projets'));
  await view.act(() => view.props('SegmentedControl').onChange('table'));
  await view.waitFor(() => view.find('DataTable').length === 1);
  const order = () => view.props('DataTable').rows.map((row) => row.id);
  await view.click(sortHeader('Échéance'));
  assert.deepEqual(order(), ['project-3', 'project-1', 'project-2']);
  await view.click(sortHeader('Échéance'));
  assert.deepEqual(order(), ['project-1', 'project-3', 'project-2']);
  await view.click(sortHeader('Statut'));
  assert.deepEqual(order(), ['project-2', 'project-3', 'project-1']);
  assert.equal(ariaSort('Statut'), 'ascending');
  await view.click(sortHeader('Priorité'));
  await view.click(sortHeader('Priorité'));
  assert.deepEqual(order(), ['project-1', 'project-3', 'project-2']);
  assert.equal(ariaSort('Priorité'), 'descending');
});
