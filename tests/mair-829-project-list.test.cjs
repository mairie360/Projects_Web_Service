const assert = require('node:assert/strict');
const { test, before, after, beforeEach, afterEach } = require('node:test');
const { requireTs } = require('./support/typescript.cjs');
const { installReactRuntime, mount } = require('./support/server-view.cjs');

// MAIR-829 (Figma F1, F2, F4): the V2 project list. Column « + » opens the creation in that status, a search or a
// filter without result offers « Réinitialiser les filtres », a status change from the card menu is confirmed by
// the « Statut mis à jour » toast, and a refused change leaves the card where it was.

installReactRuntime();
const React = require('react');
const { createFrontHarness } = require('./support/front-harness.cjs');
const f = require('./support/bff-fixtures.cjs');
const Page = requireTs('src/app/projects-client.tsx').default;
const { isProjectOverdue } = requireTs('src/components/ProjectsWorkspace/project-card-meta.ts');

const harness = createFrontHarness();
const { bffProject } = harness;
const project = f.projectListItem();
let view;
before(() => harness.start());
after(() => harness.stop());
beforeEach(() => { harness.reset(); harness.location.search = ''; harness.signIn(f.jwt(f.agents.marie.id)); });
afterEach(() => { view?.unmount(); view = undefined; assert.deepEqual(harness.violations(), []); });

const pageCalls = () => bffProject.calls('/projects-page', 'get').map((call) => Object.fromEntries(call.url.searchParams));
async function renderPage(body = f.projectsPage([project])) {
  bffProject.on('get', '/projects-page', { body });
  view = mount(React.createElement(Page));
  await view.waitFor((html) => !html.includes('Chargement des projets'));
}

test('MAIR-829: the « + » of a column opens the creation with that status', async () => {
  await renderPage();
  await view.click((props) => props['aria-label'] === 'Ajouter dans En revue');
  await view.waitFor(() => view.find('CreateProjectModal').length === 1);

  assert.equal(view.props('CreateProjectModal').form.status, 'review');
  assert.equal(bffProject.requests.filter(({ method }) => method !== 'GET').length, 0);
});

test('MAIR-829: a search without result offers « Réinitialiser les filtres », which reloads the unfiltered page', async () => {
  await renderPage();
  bffProject.on('get', '/projects-page', ({ url }) => ({ body: f.projectsPage(url.searchParams.get('q') ? [] : [project]) }));
  await view.act(() => view.props('ProjectFiltersBar').onSearchChange('introuvable'));
  await view.waitFor((html) => pageCalls().length === 2 && html.includes('Aucun projet à afficher'));

  assert.equal(view.find('KanbanBoard').length, 0, 'the empty state replaces the empty columns');
  assert.match(view.text(), /Aucun projet ne correspond à la recherche ou aux filtres sélectionnés\./);
  await view.click((_props, text, tag) => tag === 'button' && text === 'Réinitialiser les filtres');
  await view.waitFor(() => pageCalls().length === 3 && view.find('KanbanBoard').length === 1);

  assert.equal(pageCalls()[2].q, undefined);
  assert.match(view.text(), new RegExp(project.title));
});

test('MAIR-829: an empty page without filter keeps the Kanban columns', async () => {
  await renderPage(f.projectsPage([]));
  assert.equal(view.find('KanbanBoard').length, 1);
  assert.doesNotMatch(view.text(), /Réinitialiser les filtres/);
});

test('MAIR-829: a status change refused by the BFF leaves the card in its column, without toast', async () => {
  await renderPage();
  bffProject.on('patch', '/projects/{projectId}', harness.errorReply(403, f.apiError('FORBIDDEN', 'Modification du projet interdite')));
  await view.act(() => view.props('KanbanBoard').onMoveProject(project, 'done'));

  assert.equal(view.props('KanbanBoard').projects[0].status, 'in-progress');
  assert.match(view.text(), /Modification du projet interdite/);
  assert.doesNotMatch(view.text(), /Statut mis à jour/);
});

test('MAIR-829: « En retard » follows the instance day and never flags a done project', () => {
  const now = new Date('2026-11-19T10:00:00Z');
  assert.equal(isProjectOverdue({ dueDate: '2026-11-18', status: 'in-progress' }, now), true);
  assert.equal(isProjectOverdue({ dueDate: '2026-11-19', status: 'in-progress' }, now), false, 'due today is not late');
  assert.equal(isProjectOverdue({ dueDate: '2026-11-18', status: 'done' }, now), false);
  assert.equal(isProjectOverdue({ dueDate: '', status: 'todo' }, now), false);
});
