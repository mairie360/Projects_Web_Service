const assert = require('node:assert/strict');
const { test, before, after, beforeEach, afterEach } = require('node:test');
const { requireTs } = require('./support/typescript.cjs');
const { installReactRuntime, mount } = require('./support/server-view.cjs');

// MAIR-1254: the projects list matches its validated artifact — header actions, filter bar without labels, view and
// column order, « Suspendu », `PRJ-<n>` keys, no access scope tag nor template management — and the business journey
// create → find the card in its column with its key → filter by status, on the contract-driven BFF mock.

installReactRuntime();
const React = require('react');
const { createFrontHarness } = require('./support/front-harness.cjs');
const f = require('./support/bff-fixtures.cjs');
const Page = requireTs('src/app/projects-client.tsx').default;
const { projectDueBounds, projectDueRange, projectDueCustomLabel, matchesProjectDueBounds } = requireTs('src/components/ProjectsWorkspace/project-due-range.ts');

const harness = createFrontHarness();
const { bffProject } = harness;
let view;
before(() => harness.start());
after(() => harness.stop());
beforeEach(() => { harness.reset(); harness.location.search = ''; harness.signIn(f.jwt(f.agents.marie.id)); });
afterEach(() => { view?.unmount(); view = undefined; assert.deepEqual(harness.violations(), []); });

const pageCalls = () => bffProject.calls('/projects-page', 'get').map((call) => Object.fromEntries(call.url.searchParams));
const ARTIFACT_COLUMNS = ['todo', 'in-progress', 'review', 'done', 'on-hold'];

async function renderPage(body = f.projectsPage()) {
  bffProject.on('get', '/projects-page', { body });
  bffProject.on('get', '/project-groups', { body: f.projectGroups([{ id: 'group-1', name: 'Voirie' }]) });
  view = mount(React.createElement(Page));
  await view.waitFor((html) => !html.includes('Chargement des projets'));
  await view.settle();
}

/** HTML of the Kanban column of a status, up to the next column. */
function columnHtml(status) {
  const start = view.html.indexOf(`data-project-status="${status}"`);
  assert.notEqual(start, -1, `column ${status} is rendered`);
  const next = ARTIFACT_COLUMNS.map((other) => view.html.indexOf(`data-project-status="${other}"`, start + 1)).filter((index) => index > start);
  return view.html.slice(start, next.length ? Math.min(...next) : undefined);
}

test('MAIR-1254 the header shows « Paramètres » then « Nouveau projet », without scope tag nor template management', async () => {
  await renderPage();
  assert.match(view.text(), /Pilotez les projets de votre mairie Paramètres Nouveau projet/);
  assert.doesNotMatch(view.text(), /Tous les projets municipaux|Projets de mon équipe|Mes projets assignés|Gérer les modèles/);
});

test('MAIR-1254 the filter bar has no label above its fields and an « Échéance » menu', async () => {
  await renderPage();
  const text = view.text();
  assert.match(view.html, /placeholder="Rechercher un projet, une étiquette…"/);
  assert.match(text, /Tous les statuts/);
  assert.match(text, /Toutes les priorités/);
  assert.match(text, /Échéance/);
  assert.doesNotMatch(text, /Échéance avant|Rechercher des projets/);
  assert.equal(view.hostElements((props, _text, tag) => tag === 'input' && props.type === 'date').length, 0, 'no native date input');
  const due = view.hostElements((props, _text, tag) => tag === 'select' && props['aria-label'] === 'Échéance');
  assert.equal(due.length, 1);
  // The visible search label is screen-reader only: nothing is printed above the field.
  assert.match(view.html, /<span class="sr-only">Rechercher un projet<\/span>/);
});

test('MAIR-1254 orders the views Kanban, Tableau, Grille', async () => {
  await renderPage();
  assert.deepEqual(view.props('SegmentedControl').options.map((option) => option.label), ['Kanban', 'Tableau', 'Grille']);
});

test('MAIR-1254 orders the Kanban columns like the artifact and labels on-hold « Suspendu »', async () => {
  await renderPage(f.projectsPage([f.projectListItem({ id: 'project-3', status: 'on-hold', title: 'Square du marché' })]));
  const order = ARTIFACT_COLUMNS.map((status) => view.html.indexOf(`data-project-status="${status}"`));
  assert.ok(order.every((index, position) => index !== -1 && (position === 0 || index > order[position - 1])), `columns in the artifact order: ${order}`);
  const onHold = columnHtml('on-hold');
  assert.match(onHold, /Suspendu/);
  assert.match(onHold, /Square du marché/);
  assert.match(onHold, /PRJ-3/);
});

test('MAIR-1254 shows the PRJ-<n> key instead of #<n>', async () => {
  await renderPage(f.projectsPage([f.projectListItem({ id: '42' })]));
  assert.match(view.text(), /PRJ-42/);
  assert.doesNotMatch(view.text(), /#42/);
});

test('MAIR-1254 the « Échéance » ranges send inclusive dueBefore / dueAfter bounds read in the instance day', () => {
  const now = new Date('2026-11-27T10:00:00Z');
  assert.deepEqual(projectDueBounds('overdue', now), { dueBefore: '2026-11-26', dueAfter: '' });
  assert.deepEqual(projectDueBounds('this-month', now), { dueBefore: '2026-11-30', dueAfter: '2026-11-27' });
  assert.deepEqual(projectDueBounds('later', now), { dueBefore: '', dueAfter: '2026-12-01' });
  assert.deepEqual(projectDueBounds('', now), { dueBefore: '', dueAfter: '' });
  assert.deepEqual(projectDueBounds('later', new Date('2026-12-20T10:00:00Z')), { dueBefore: '', dueAfter: '2027-01-01' });
  for (const range of ['overdue', 'this-month', 'later', '']) assert.equal(projectDueRange(projectDueBounds(range, now), now), range);
  assert.equal(projectDueRange({ dueBefore: '2026-12-31', dueAfter: '' }, now), '', 'bounds of an older link match no range');
  assert.equal(matchesProjectDueBounds('2026-11-30T00:00:00.000Z', projectDueBounds('this-month', now)), true);
  assert.equal(matchesProjectDueBounds('2026-12-01', projectDueBounds('this-month', now)), false);
  assert.equal(matchesProjectDueBounds('', projectDueBounds('overdue', now)), false, 'a project without due date is in no range');
  assert.equal(matchesProjectDueBounds('', projectDueBounds('', now)), true);
});

test('MAIR-1254 business journey: a created project is found in « À faire » with its PRJ key, then by its status filter', async () => {
  await renderPage();
  await view.click('Nouveau projet');
  await view.waitFor(() => view.find('CreateProjectModal').length === 1);

  const created = f.projectListItem({ id: 'project-16', title: 'Rénovation du gymnase', status: 'todo' });
  bffProject.on('post', '/projects', { status: 201, body: f.projectDetails(created, []) });
  bffProject.on('get', '/projects-page', { body: f.projectsPage([f.projectListItem(), created]) });
  await view.act(() => view.props('CreateProjectModal').onChange({ title: created.title, dueDate: '2027-06-30', groupId: 'group-1', status: 'todo', responsible: f.people.marie.id }));
  for (let step = 0; step < 4; step += 1) {
    await view.fire((props, _text, tag) => tag === 'form' && props['data-project-form'] !== undefined, 'onSubmit', { preventDefault() {} });
    await view.settle();
  }
  await view.waitFor(() => view.text().includes('Projet « Rénovation du gymnase » créé.'));
  assert.equal(bffProject.calls('/projects', 'post')[0].body.status, 'todo');

  // Found back in « À faire », first column of the board, with its key.
  await view.waitFor(() => view.html.includes('Rénovation du gymnase'));
  const todo = columnHtml('todo');
  assert.match(todo, /À faire/);
  assert.match(todo, /Rénovation du gymnase/);
  assert.match(todo, /PRJ-16/);
  assert.doesNotMatch(columnHtml('in-progress'), /Rénovation du gymnase/);

  // Filtered by its status: the BFF is asked for `todo` only and the card stays on the board.
  bffProject.on('get', '/projects-page', { body: f.projectsPage([created]) });
  const reads = pageCalls().length;
  await view.fire((props, _text, tag) => tag === 'select' && props['aria-label'] === 'Tous les statuts', 'onChange', { target: { value: 'todo' } });
  await view.waitFor(() => pageCalls().length > reads && !view.props('ProjectPagination').pending);
  assert.equal(pageCalls().at(-1).status, 'todo');
  assert.deepEqual(view.props('KanbanBoard').projects.map((project) => project.id), ['project-16']);
  assert.match(view.text(), /Tous les statuts : À faire/);
  assert.match(columnHtml('todo'), /PRJ-16/);
  assert.match(view.text(), /Effacer/);
});

test('MAIR-1254 bounds that match no « Échéance » range are named by their dates', () => {
  const now = new Date('2026-11-27T10:00:00Z');
  assert.equal(projectDueCustomLabel({ dueBefore: '', dueAfter: '' }, now), '');
  for (const range of ['overdue', 'this-month', 'later']) assert.equal(projectDueCustomLabel(projectDueBounds(range, now), now), '', range);
  assert.equal(projectDueCustomLabel({ dueBefore: '2026-12-31', dueAfter: '' }, now), 'Jusqu’au 31/12/2026');
  assert.equal(projectDueCustomLabel({ dueBefore: '', dueAfter: '2027-01-15' }, now), 'À partir du 15/01/2027');
  assert.equal(projectDueCustomLabel({ dueBefore: '2026-11-30', dueAfter: '2026-11-01' }, now), 'Du 01/11/2026 au 30/11/2026');
  // A « Ce mois-ci » kept past its day no longer matches the range and shows its dates.
  assert.equal(projectDueCustomLabel(projectDueBounds('this-month', now), new Date('2026-11-28T10:00:00Z')), 'Du 27/11/2026 au 30/11/2026');
});

test('MAIR-1254 a restored link with custom due bounds shows them in « Échéance » and keeps sending them', async () => {
  harness.location.search = '?dueBefore=2099-12-31';
  await renderPage();
  assert.equal(pageCalls()[0].dueBefore, '2099-12-31');
  const due = view.hostElements((props, _text, tag) => tag === 'select' && props['aria-label'] === 'Échéance')[0];
  assert.equal(due.props.value, 'custom');
  assert.match(view.text(), /Jusqu’au 31\/12\/2099/);
  assert.match(view.text(), /Effacer/, 'the active filter can be cleared');
});
