const assert = require('node:assert/strict');
const { test, before, after, beforeEach, afterEach } = require('node:test');
const { requireTs } = require('./support/typescript.cjs');
const { installReactRuntime, mount } = require('./support/server-view.cjs');

// MAIR-846 (Figma F5 5.1 to 5.11): a project opens as an addressable page in place of the list — breadcrumb,
// header (status, « Modifier », « … »), indicators, tabs and overview — and its edit sends only what changed.

installReactRuntime();
const React = require('react');
const { createFrontHarness } = require('./support/front-harness.cjs');
const f = require('./support/bff-fixtures.cjs');
const Page = requireTs('src/app/projects-client.tsx').default;
const { changedProjectBody } = requireTs('src/components/ProjectsWorkspace/use-projects-controller.ts');
const { projectPageSearch, projectTabFromSearch } = requireTs('src/lib/projectDeepLink.ts');
const { projectToFormState } = requireTs('src/lib/projectPageState.ts');

const harness = createFrontHarness();
const { bffProject } = harness;
const project = f.projectListItem();
let view;
let history;

// The harness window has no history: a minimal one records the URLs the page writes.
function installHistory(search = '') {
  const location = harness.location;
  const origin = new URL(location.href).origin;
  const go = (value) => { location.search = value; location.href = `${origin}/${value}`; };
  location.pathname = '/';
  location.hash = '';
  go(search);
  const listeners = [];
  history = {
    state: null, entries: [search], index: 0,
    pushState(state, _title, url) { this.entries.splice(this.index + 1); this.entries.push(new URL(url, origin).search); this.index += 1; go(this.entries[this.index]); },
    replaceState(state, _title, url) { this.entries[this.index] = new URL(url, origin).search; go(this.entries[this.index]); },
    async back() { this.index -= 1; go(this.entries[this.index]); for (const listener of listeners) await listener({}); },
  };
  global.window.history = history;
  global.window.addEventListener = (type, listener) => { if (type === 'popstate') listeners.push(listener); };
  global.window.removeEventListener = (type, listener) => { const i = listeners.indexOf(listener); if (i >= 0) listeners.splice(i, 1); };
  global.window.dispatchEvent = () => true;
}

before(() => harness.start());
after(() => harness.stop());
beforeEach(() => {
  harness.reset();
  harness.signIn(f.jwt(f.agents.marie.id));
  installHistory();
  bffProject.on('get', '/projects-page', { body: f.projectsPage([project]) });
  bffProject.on('get', '/projects/{projectId}', { body: f.projectDetails(project) });
});
afterEach(() => {
  view?.unmount(); view = undefined;
  delete global.window.history; delete global.window.addEventListener; delete global.window.removeEventListener; delete global.window.dispatchEvent;
  assert.deepEqual(harness.violations(), []);
});

async function openPage() {
  view = mount(React.createElement(Page));
  await view.waitFor(html => !html.includes('Chargement des projets'));
  await view.act(() => view.props('KanbanBoard').onProjectOpen(project));
  await view.waitFor(() => view.find('ProjectPage').length === 1 && bffProject.calls('/projects/{projectId}', 'get').length === 1);
  await view.settle();
}
const button = (label) => (props, text, tag) => tag === 'button' && (text === label || props['aria-label'] === label);

test('MAIR-846: the URL names the project page and its tab, and leaves the other parameters alone', () => {
  assert.equal(projectPageSearch('?view=table&q=voirie', 'project-1', 'overview'), '?view=table&q=voirie&project=project-1');
  assert.equal(projectPageSearch('?view=table&project=project-1', 'project-1', 'team'), '?view=table&project=project-1&tab=team');
  assert.equal(projectPageSearch('?view=table&project=project-1&tab=team&task=task-1', null, 'overview'), '?view=table');
  assert.equal(projectTabFromSearch('?project=p&tab=documents'), 'documents');
  assert.equal(projectTabFromSearch('?project=p&task=t'), 'tasks');
  assert.equal(projectTabFromSearch('?project=p&tab=unknown'), 'overview');
});

test('MAIR-846: opening a project pushes its page URL, the breadcrumb and Back return to the list', async () => {
  await openPage();
  assert.equal(history.entries[history.index], '?project=project-1');
  const text = view.text();
  for (const part of ['Projets', 'PRJ-01', 'Avancement', '1/2 tâches terminées', 'Budget non renseigné', 'Tâches en retard', 'Vue d’ensemble', 'Prochaines tâches', 'Jalons', 'Aucun jalon', 'Informations', 'Activité récente']) {
    assert.ok(text.includes(part), part);
  }
  assert.match(view.html, /<div hidden=""><header|<div hidden="">/, 'the list stays mounted, hidden');

  await view.act(() => view.props('Tabs').onChange('team'));
  assert.equal(history.entries[history.index], '?project=project-1&tab=team', 'a tab change replaces the entry');
  assert.equal(history.entries.length, 2);

  await view.act(() => view.props('ProjectPageHeader').onBack());
  assert.equal(view.find('ProjectPage').length, 0);
  assert.equal(history.entries[history.index], '');

  await view.act(() => history.back());
  await view.waitFor(() => view.find('ProjectPage').length === 1);
  assert.equal(view.props('ProjectPage').project.id, 'project-1');
});

test('MAIR-846: a shared page URL opens the project and its tab directly', async () => {
  installHistory('?project=project-1&tab=team');
  view = mount(React.createElement(Page));
  await view.waitFor(() => view.find('ProjectPage').length === 1);
  await view.settle();
  assert.equal(view.props('Tabs').value, 'team');
  assert.match(view.text(), /Responsable du projet/, 'MAIR-874: the « Équipe » tab lists the members');
});

test('MAIR-846: the status pill changes the project status with the existing PATCH', async () => {
  await openPage();
  bffProject.on('patch', '/projects/{projectId}', ({ body }) => ({ body: f.projectDetails({ ...project, status: body.status }) }));
  await view.act(() => view.props('ProjectStatusMenu').onChange('review'));
  await view.waitFor(() => bffProject.calls('/projects/{projectId}', 'patch').length === 1);
  assert.deepEqual(bffProject.calls('/projects/{projectId}', 'patch')[0].body, { status: 'review' });
  await view.waitFor(() => view.text().includes('Statut mis à jour'));
  assert.equal(view.find('ProjectPage').length, 1, 'the page stays open');
});

test('MAIR-846: « … » duplicates the project and deletes it after confirmation, then goes back to the list', async () => {
  await openPage();
  bffProject.on('post', '/projects/{projectId}/duplicate', { status: 201, body: f.projectDetails(f.projectListItem({ id: 'project-9', title: 'Copie de Rénovation' })) });
  await view.act(() => view.props('ProjectMoreMenu').onDuplicate());
  await view.waitFor(() => view.text().includes('Projet "Copie de Rénovation" dupliqué.'));
  assert.equal(bffProject.calls('/projects/{projectId}/duplicate', 'post')[0].pathParams.projectId, 'project-1');
  assert.match(history.entries[history.index], /project=project-1/, 'the list filters reset keeps the page URL');

  await view.act(() => view.props('ProjectMoreMenu').onDelete());
  const confirm = view.find('ConfirmModal').map(modal => modal.props).find(props => props.open);
  assert.equal(confirm.title, 'Supprimer le projet');
  bffProject.on('delete', '/projects/{projectId}', { status: 204 });
  bffProject.on('get', '/projects-page', { body: f.projectsPage([]) });
  await view.act(() => confirm.onConfirm());
  await view.waitFor(() => view.find('ProjectPage').length === 0);
  assert.equal(bffProject.calls('/projects/{projectId}', 'delete').length, 1);
  assert.doesNotMatch(history.entries[history.index], /project=/);
});

test('MAIR-846: the edit modal sends only the changed fields, nothing when nothing changed, then shows the toast', async () => {
  await openPage();
  await view.click(button('Modifier'));
  await view.act(() => view.props('ProjectEditForm').onSubmit({ preventDefault() {} }));
  assert.equal(bffProject.calls('/projects/{projectId}', 'patch').length, 0, 'an unchanged form sends nothing');

  await view.click(button('Modifier'));
  await view.act(() => view.props('ProjectEditForm').onChange({ priority: 'low' }));
  bffProject.on('patch', '/projects/{projectId}', ({ body }) => ({ body: f.projectDetails({ ...project, ...body }) }));
  await view.act(() => view.props('ProjectEditForm').onSubmit({ preventDefault() {} }));
  await view.waitFor(() => view.text().includes('Modifications enregistrées'));
  assert.deepEqual(bffProject.calls('/projects/{projectId}', 'patch')[0].body, { priority: 'low' });
  assert.equal(view.find('ProjectEditForm').length, 0);
});

test('MAIR-846: an edit refused before sending keeps the modal open with the message under the field', async () => {
  await openPage();
  await view.click(button('Modifier'));
  await view.act(() => view.props('ProjectEditForm').onChange({ title: '   ' }));
  await view.act(() => view.props('ProjectEditForm').onSubmit({ preventDefault() {} }));
  assert.equal(view.props('ProjectEditForm').fieldErrors.title, 'Le titre est obligatoire.');
  assert.equal(bffProject.calls('/projects/{projectId}', 'patch').length, 0);
});

test('MAIR-846: changedProjectBody keeps only the fields that differ from the project shown', () => {
  const shown = projectToFormState(project);
  assert.deepEqual(changedProjectBody(shown, shown), {});
  const body = changedProjectBody({ ...shown, title: 'Nouveau', labels: [...shown.labels, 'neuf'] }, shown);
  assert.deepEqual(Object.keys(body).sort(), ['labels', 'title']);
});
