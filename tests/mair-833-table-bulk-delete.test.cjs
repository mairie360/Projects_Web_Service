const assert = require('node:assert/strict');
const { test, before, after, beforeEach, afterEach } = require('node:test');
const { requireTs } = require('./support/typescript.cjs');
const { installReactRuntime, mount } = require('./support/server-view.cjs');

// MAIR-833 (Figma F1 1.2 to 1.5): table selection and bulk deletion. Since MAIR-1089 the selection goes in one
// POST /projects/bulk-delete, answered per project; a refused one stays selected and is reported.

installReactRuntime();
const React = require('react');
const { createFrontHarness } = require('./support/front-harness.cjs');
const f = require('./support/bff-fixtures.cjs');
const Page = requireTs('src/app/projects-client.tsx').default;
const { bulkDeletionFeedback } = requireTs('src/components/ProjectsWorkspace/use-projects-controller.ts');

const harness = createFrontHarness();
const { bffProject } = harness;
const first = f.projectListItem({ id: 'project-1', title: 'Plan local d’urbanisme', tasks: { total: 7, completed: 2, active: 5, archived: 0 } });
const second = f.projectListItem({ id: 'project-2', title: 'Réfection de la place', tasks: { total: 5, completed: 1, active: 4, archived: 0 } });
const third = f.projectListItem({ id: 'project-3', title: 'Festival d’été' });
let view;
before(() => harness.start());
after(() => harness.stop());
beforeEach(() => { harness.reset(); harness.location.search = ''; harness.signIn(f.jwt(f.agents.marie.id)); });
afterEach(() => { view?.unmount(); view = undefined; assert.deepEqual(harness.violations(), []); });

const pageCalls = () => bffProject.calls('/projects-page', 'get');
const deletes = () => bffProject.calls('/projects/bulk-delete', 'post').flatMap((call) => call.body.projectIds);
const bulkReply = (refused = {}) => ({ body }) => ({ body: { results: body.projectIds.map((projectId) => ({ projectId, status: refused[projectId] ?? 'deleted' })) } });
const select = (title) => view.fire((props, _text, tag) => tag === 'input' && props.type === 'checkbox' && props.id && view.html.includes(title)
  && view.hostElements((p, text, t) => t === 'label' && p.htmlFor === props.id && text === `Sélectionner ${title}`).length === 1, 'onChange', { target: { checked: true } });

async function renderTable(projects = [first, second, third]) {
  bffProject.on('get', '/projects-page', { body: f.projectsPage(projects) });
  harness.location.search = '?view=table';
  view = mount(React.createElement(Page));
  await view.waitFor(() => view.find('TableView').length === 1);
}

test('MAIR-833: two selected projects are deleted after confirmation, announced and refreshed', async () => {
  await renderTable();
  await select(first.title);
  await select(second.title);
  assert.match(view.text(), /2 projets sélectionnés/);
  assert.match(view.html, /data-selected="true"/);

  await view.click((_props, text, tag) => tag === 'button' && text === 'Supprimer' && view.find('SelectionBar').length === 1);
  const modal = view.find('ConfirmModal').find((item) => item.props.title === 'Supprimer les projets');
  assert.equal(modal.props.open, true);
  assert.equal(modal.props.message, 'Les 2 projets sélectionnés et leurs 12 tâches seront supprimés. Cette action est irréversible.');
  assert.equal(deletes().length, 0, 'nothing is deleted before confirmation');

  bffProject.on('post', '/projects/bulk-delete', bulkReply());
  bffProject.on('get', '/projects-page', { body: f.projectsPage([third]) });
  const readsBefore = pageCalls().length;
  await view.act(() => modal.props.onConfirm());
  await view.waitFor(() => view.text().includes('2 projets supprimés') && pageCalls().length === readsBefore + 1 && view.props('TableView').projects.length === 1);

  assert.deepEqual(deletes().sort(), ['project-1', 'project-2']);
  assert.equal(bffProject.calls('/projects/bulk-delete', 'post').length, 1, 'one call for the whole selection');
  assert.equal(bffProject.calls('/projects/{projectId}', 'delete').length, 0);
  assert.match(view.text(), /« Plan local d’urbanisme » et « Réfection de la place » ont été supprimés\./);
  assert.equal(pageCalls().length, readsBefore + 1, 'the page is read again');
  assert.deepEqual(view.props('TableView').projects.map((project) => project.id), ['project-3']);
  assert.doesNotMatch(view.text(), /sélectionnés?/);
});

test('MAIR-833: a partial failure deletes the others and keeps the refused project selected', async () => {
  await renderTable();
  await select(first.title);
  await select(second.title);
  bffProject.on('post', '/projects/bulk-delete', bulkReply({ 'project-2': 'forbidden' }));
  bffProject.on('get', '/projects-page', { body: f.projectsPage([second, third]) });
  await view.act(() => view.props('ProjectsWorkspace').requestBulkProjectDeletion());
  await view.act(() => view.props('ProjectsWorkspace').confirmBulkProjectDeletion());
  await view.waitFor(() => view.text().includes('1 projet supprimé'));

  assert.match(view.text(), /1 projet n’a pas pu être supprimé : « Réfection de la place » \(suppression non autorisée\)\. Il reste sélectionné\./);
  assert.match(view.text(), /1 projet sélectionné/);
  assert.deepEqual(view.props('TableView').projects.map((project) => project.id), ['project-2', 'project-3']);
});

test('MAIR-1089: a refused bulk call keeps every project selected and reports the reason', async () => {
  await renderTable();
  await select(first.title);
  await select(second.title);
  bffProject.on('post', '/projects/bulk-delete', harness.errorReply(503, f.apiError('SERVICE_UNAVAILABLE', 'Le service des projets est indisponible')));
  await view.act(() => view.props('ProjectsWorkspace').requestBulkProjectDeletion());
  await view.act(() => view.props('ProjectsWorkspace').confirmBulkProjectDeletion());
  await view.waitFor(() => view.text().includes('2 projets n’ont pas pu être supprimés'));

  assert.match(view.text(), /« Plan local d’urbanisme » \(Le service des projets est indisponible\)/);
  assert.match(view.text(), /2 projets sélectionnés/);
});

test('MAIR-1089: a project already gone is reported and the page read again', async () => {
  await renderTable();
  await select(first.title);
  bffProject.on('post', '/projects/bulk-delete', bulkReply({ 'project-1': 'not_found' }));
  bffProject.on('get', '/projects-page', { body: f.projectsPage([second, third]) });
  const readsBefore = pageCalls().length;
  await view.act(() => view.props('ProjectsWorkspace').requestBulkProjectDeletion());
  await view.act(() => view.props('ProjectsWorkspace').confirmBulkProjectDeletion());
  await view.waitFor(() => pageCalls().length === readsBefore + 1);

  assert.match(view.text(), /« Plan local d’urbanisme » \(projet introuvable ou plus visible\)/);
});

test('MAIR-833: cancelling or clearing the selection deletes nothing', async () => {
  await renderTable();
  await select(first.title);
  await view.act(() => view.props('ProjectsWorkspace').requestBulkProjectDeletion());
  await view.click((_props, text, tag) => tag === 'button' && text === 'Annuler');
  assert.equal(view.find('ConfirmModal').find((item) => item.props.title === 'Supprimer les projets').props.open, false);
  await view.click((_props, text, tag) => tag === 'button' && text === 'Désélectionner');

  assert.doesNotMatch(view.text(), /sélectionné/);
  assert.equal(deletes().length, 0);
});

test('MAIR-833: « Tout sélectionner » selects the deletable projects of the page only', async () => {
  const locked = f.projectListItem({ id: 'project-4', title: 'Projet verrouillé', permissions: { ...f.projectListItem().permissions, canDelete: false } });
  await renderTable([first, second, locked]);
  await view.fire((props, _text, tag) => tag === 'input' && props.type === 'checkbox'
    && view.hostElements((p, text, t) => t === 'label' && p.htmlFor === props.id && text === 'Tout sélectionner').length === 1, 'onChange', { target: { checked: true } });

  assert.match(view.text(), /2 projets sélectionnés/);
  assert.deepEqual(view.props('TableView').selectedProjectIds, new Set(['project-1', 'project-2']));
});

test('MAIR-833: a filter change resets the selection explicitly', async () => {
  await renderTable();
  await select(first.title);
  await view.act(() => view.props('ProjectFiltersBar').onSearchChange('urbanisme'));
  await view.waitFor(() => pageCalls().at(-1).url.searchParams.get('q') === 'urbanisme');

  assert.doesNotMatch(view.text(), /sélectionné/);
});

test('MAIR-833: the deletion notification names the projects', () => {
  assert.deepEqual(bulkDeletionFeedback(['A']), { title: '1 projet supprimé', message: '« A » a été supprimé.' });
  assert.deepEqual(bulkDeletionFeedback(['A', 'B', 'C']), { title: '3 projets supprimés', message: '« A », « B » et « C » ont été supprimés.' });
});

test('MAIR-833: an impossible due date is never « En retard »', () => {
  const { isProjectOverdue } = requireTs('src/components/ProjectsWorkspace/project-card-meta.ts');
  const now = new Date('2026-11-19T10:00:00Z');
  assert.equal(isProjectOverdue({ dueDate: '2026-02-29', status: 'in-progress' }, now), false);
  assert.equal(isProjectOverdue({ dueDate: '2026-02-28', status: 'in-progress' }, now), true);
});
