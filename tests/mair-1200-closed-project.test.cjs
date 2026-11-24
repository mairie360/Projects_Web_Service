const assert = require('node:assert/strict');
const { test, before, after, beforeEach, afterEach } = require('node:test');
const { requireTs } = require('./support/typescript.cjs');
const { installReactRuntime, mount } = require('./support/server-view.cjs');

// MAIR-1200: a closed project (`done`) is read-only. Its page shows the « Projet clôturé — lecture seule. » banner, no
// edit action, and « Rouvrir » for its managers (`permissions.canReopen`), which PATCHes the chosen open status. The
// BFF's 409 for a write on a closed project reads in French.

installReactRuntime();
const React = require('react');
const { createFrontHarness } = require('./support/front-harness.cjs');
const f = require('./support/bff-fixtures.cjs');
const contract = require('../contracts/openapi.json');
const Page = requireTs('src/app/projects-client.tsx').default;
const { getBffProjectErrorMessage, BffProjectError } = requireTs('src/lib/bffProjectClient.ts');
const { projectStatusTargets } = requireTs('src/components/ProjectsWorkspace/project-card-meta.ts');

const harness = createFrontHarness();
const { bffProject } = harness;
const openRights = f.projectListItem().permissions;
const closedRights = { ...openRights, canEdit: false, canCreateTask: false, canAssignMembers: false, canClose: false, canReopen: true };
const readOnlyTask = { canView: true, canEdit: false, canDelete: false, canUpdateStatus: false, canComment: false };
const closed = f.projectListItem({ status: 'done', permissions: closedRights });
const closedTasks = [f.projectTask({ permissions: readOnlyTask }), f.projectTask({ id: 'task-2', status: 'done', permissions: readOnlyTask })];
let view;

before(() => harness.start());
after(() => harness.stop());
beforeEach(() => {
  harness.reset();
  harness.signIn(f.jwt(f.agents.marie.id));
  bffProject.on('get', '/projects-page', { body: f.projectsPage([closed]) });
  bffProject.on('get', '/projects/{projectId}', { body: f.projectDetails(closed, closedTasks) });
});
afterEach(() => {
  view?.unmount(); view = undefined;
  assert.deepEqual(harness.violations(), []);
});

async function openClosedProject() {
  view = mount(React.createElement(Page));
  await view.waitFor(html => !html.includes('Chargement des projets'));
  await view.act(() => view.props('KanbanBoard').onProjectOpen(closed));
  await view.waitFor(() => view.find('ProjectPage').length === 1 && bffProject.calls('/projects/{projectId}', 'get').length === 1);
  await view.settle();
}

test('MAIR-1200 the pinned BFF contract carries permissions.canReopen on every project permissions', () => {
  const schemas = Object.entries(contract.components.schemas).filter(([, schema]) => schema.properties?.canClose);
  assert.ok(schemas.length > 0);
  for (const [name, schema] of schemas) assert.ok(schema.properties.canReopen, `${name} declares canReopen`);
});

test('MAIR-1200 only the open statuses reopen a closed project, and only for its managers', () => {
  assert.deepEqual(projectStatusTargets(closed), ['todo', 'in-progress', 'review', 'on-hold']);
  assert.deepEqual(projectStatusTargets({ ...closed, permissions: { ...closedRights, canReopen: false } }), []);
  assert.deepEqual(projectStatusTargets(f.projectListItem()), ['todo', 'in-progress', 'review', 'on-hold', 'done']);
});

test('MAIR-1200 a closed project page is read-only: banner, no edit action, « Rouvrir »', async () => {
  await openClosedProject();
  const text = view.text();
  assert.ok(text.includes('Projet clôturé — lecture seule.'));
  assert.ok(text.includes('Les tâches, l’activité et les jalons restent consultables. Rouvrez le projet pour le modifier.'));
  assert.match(view.html, /role="status"[^>]*>(?:(?!<\/div>).)*Projet clôturé/s);
  const header = view.props('ProjectPageHeader');
  assert.equal(header.onEdit, undefined, '« Modifier » is hidden');
  assert.equal(header.onNewTask, undefined, '« Nouvelle tâche » is hidden');
  assert.equal(header.onChangeStatus, undefined, 'the status pill is not a menu');
  assert.equal(typeof header.onReopen, 'function');
  assert.equal(typeof header.onDuplicate, 'function');
  assert.equal(typeof header.onDelete, 'function');
  assert.equal(view.props('ProjectMoreMenu').onEdit, undefined, '« Modifier » left « Plus d’actions »');
  assert.equal(view.find('ProjectReopenMenu').length, 1);
  assert.equal(view.find('ProjectLifecycle').length, 0, 'neither « Suspendre » nor « Clôturer »');
});

test('MAIR-1200 « Rouvrir » PATCHes the chosen status and gives the edit actions back', async () => {
  await openClosedProject();
  const reopened = f.projectListItem({ status: 'in-progress', permissions: { ...openRights, canReopen: false } });
  bffProject.on('patch', '/projects/{projectId}', { body: f.projectDetails(reopened) });
  bffProject.on('get', '/projects-page', { body: f.projectsPage([reopened]) });

  await view.act(() => view.props('ProjectReopenMenu').onReopen('in-progress'));
  await view.waitFor(() => bffProject.calls('/projects/{projectId}', 'patch').length === 1);
  assert.deepEqual(bffProject.calls('/projects/{projectId}', 'patch')[0].body, { status: 'in-progress' });
  await view.waitFor(() => view.text().includes('Projet rouvert'));
  await view.settle();
  assert.ok(!view.text().includes('Projet clôturé — lecture seule.'));
  assert.equal(view.find('ProjectReopenMenu').length, 0);
  assert.equal(typeof view.props('ProjectPageHeader').onEdit, 'function');
});

test('MAIR-1200 the card menu reopens a closed project in the chosen status', async () => {
  view = mount(React.createElement(Page));
  await view.waitFor(html => !html.includes('Chargement des projets'));
  bffProject.on('patch', '/projects/{projectId}', { body: f.projectDetails(f.projectListItem({ status: 'review' })) });
  await view.act(() => view.props('ProjectActionsMenu').onChangeStatus(closed, 'review'));
  await view.waitFor(() => bffProject.calls('/projects/{projectId}', 'patch').length === 1);
  assert.deepEqual(bffProject.calls('/projects/{projectId}', 'patch')[0].body, { status: 'review' });
});

test('MAIR-1200 the BFF 409 « Project is closed. » reads in French, other conflicts keep their message', () => {
  assert.equal(getBffProjectErrorMessage(new BffProjectError('Project is closed.', 409, 'CONFLICT')),
    'Ce projet est clôturé : il est en lecture seule. Rouvrez-le pour le modifier.');
  assert.equal(getBffProjectErrorMessage(new BffProjectError('Conflict.', 409, 'CONFLICT')), 'Conflict.');
});

test('MAIR-1200 a write refused because the project was closed meanwhile shows the French message', async () => {
  const open = f.projectListItem();
  bffProject.on('get', '/projects-page', { body: f.projectsPage([open]) });
  bffProject.on('patch', '/projects/{projectId}', harness.errorReply(409, f.apiError('CONFLICT', 'Project is closed.')));
  view = mount(React.createElement(Page));
  await view.waitFor(html => !html.includes('Chargement des projets'));
  await view.act(() => view.props('KanbanBoard').onMoveProject(open, 'review'));
  await view.waitFor(() => view.text().includes('Ce projet est clôturé : il est en lecture seule. Rouvrez-le pour le modifier.'));
});
