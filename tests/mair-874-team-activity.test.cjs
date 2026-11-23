const assert = require('node:assert/strict');
const { test, before, after, beforeEach, afterEach } = require('node:test');
const { requireTs } = require('./support/typescript.cjs');
const { installReactRuntime, mount } = require('./support/server-view.cjs');

// MAIR-874 (Figma F8, F10): the « Équipe » tab manages the members of the project and their role (MAIR-1088), the
// « Activité » tab pages the project history and publishes comments (MAIR-1089). « Documents » has no backend yet.

installReactRuntime();
const React = require('react');
const { createFrontHarness } = require('./support/front-harness.cjs');
const f = require('./support/bff-fixtures.cjs');
const Page = requireTs('src/app/projects-client.tsx').default;
const { OWNER_KEPT } = requireTs('src/components/ProjectsWorkspace/components/ProjectPage/use-project-members.ts');

const harness = createFrontHarness();
const { bffProject } = harness;
let view;

before(() => harness.start());
after(() => harness.stop());
beforeEach(() => { harness.reset(); harness.location.search = ''; harness.signIn(f.jwt(f.agents.marie.id)); });
afterEach(() => { view?.unmount(); view = undefined; assert.deepEqual(harness.violations(), []); });

const button = (label) => (props, text, tag) => tag === 'button' && (text === label || props['aria-label'] === label);
const team = (...extra) => ({ members: [{ ...f.people.marie, role: 'manager', load: { tasksOpen: 1, tasksTotal: 2 } }, { ...f.people.alice, role: 'contributor', load: { tasksOpen: 1, tasksTotal: 2 } }, ...extra] });

async function openTab(tab, project = f.projectListItem()) {
  bffProject.on('get', '/projects-page', { body: f.projectsPage([project]) });
  bffProject.on('get', '/projects/{projectId}', { body: f.projectDetails(project) });
  view = mount(React.createElement(Page));
  await view.waitFor((html) => !html.includes('Chargement des projets'));
  await view.act(() => view.props('KanbanBoard').onProjectOpen(project));
  await view.waitFor(() => view.find('ProjectPage').length === 1 && bffProject.calls('/projects/{projectId}', 'get').length === 1);
  await view.act(() => view.props('Tabs').onChange(tab));
  await view.settle();
}

test('MAIR-874 (C1): a manager adds an agent with a role, changes a role and removes a member', async () => {
  await openTab('team');
  assert.match(view.text(), /Marie Durand Responsable du projet/);
  assert.match(view.text(), /1 tâche terminée sur 2/);

  bffProject.on('post', '/projects/{projectId}/members', ({ body }) => ({ status: 201, body: team({ ...f.people.admin, role: body.role, load: { tasksOpen: 0, tasksTotal: 0 } }) }));
  await view.fire((props) => props.id === 'team-add-agent', 'onChange', { target: { value: 'user-1' } });
  await view.fire((props) => props.id === 'team-add-role', 'onChange', { target: { value: 'reader' } });
  await view.fire((props, _text, tag) => tag === 'form' && props['aria-label'] === 'Ajouter un membre', 'onSubmit', { preventDefault() {} });
  await view.waitFor(() => view.text().includes('Admin Mairie a rejoint l’équipe.'));
  assert.deepEqual(bffProject.calls('/projects/{projectId}/members', 'post')[0].body, { userId: 'user-1', role: 'reader' });

  bffProject.on('patch', '/projects/{projectId}/members/{userId}', ({ body }) => ({ body: { members: team().members.map((member) => member.id === 'user-2' ? { ...member, role: body.role } : member) } }));
  await view.fire((props) => props.id === 'team-role-user-2', 'onChange', { target: { value: 'manager' } });
  await view.waitFor(() => view.text().includes('Rôle de Alice Martin mis à jour.'));
  assert.deepEqual(bffProject.calls('/projects/{projectId}/members/{userId}', 'patch')[0], { ...bffProject.calls('/projects/{projectId}/members/{userId}', 'patch')[0], body: { role: 'manager' } });

  bffProject.on('delete', '/projects/{projectId}/members/{userId}', { status: 204 });
  await view.click(button('Retirer Alice Martin de l’équipe'));
  const confirm = view.find('ConfirmModal').find((item) => item.props.title === 'Retirer le membre ?');
  await view.act(() => confirm.props.onConfirm());
  await view.waitFor(() => view.text().includes('Alice Martin a quitté l’équipe.'));
  assert.equal(bffProject.calls('/projects/{projectId}/members/{userId}', 'delete')[0].pathParams.userId, 'user-2');
});

test('MAIR-874 (C1): the owner is never offered for removal, and a 409 on them is explained', async () => {
  await openTab('team');
  assert.equal(view.hostElements((props, _text, tag) => tag === 'button' && props['aria-label'] === 'Retirer Marie Durand de l’équipe').length, 0);
  bffProject.on('patch', '/projects/{projectId}/members/{userId}', harness.errorReply(409, f.apiError('CONFLICT', 'The owner keeps the manager role')));
  await view.act(() => view.props('ProjectTeamTab').onChangeRole('user-3', 'reader'));
  await view.waitFor(() => view.text().includes(OWNER_KEPT));
});

test('MAIR-874 (C1): a reader of the project sees the team without actions', async () => {
  await openTab('team', f.projectListItem({ permissions: { ...f.projectListItem().permissions, canEdit: false, canAssignMembers: false } }));
  assert.equal(view.props('ProjectTeamTab').canManage, false);
  assert.doesNotMatch(view.text(), /Ajouter un membre/);
});

test('MAIR-874 (C3): the activity tab pages the history and publishes a comment', async () => {
  const items = Array.from({ length: 20 }, (_, index) => f.activityItem({ id: `comment-${index + 1}`, message: `Message ${index + 1}` }));
  bffProject.on('get', '/projects/{projectId}/activity', ({ url }) => ({ body: f.projectActivity(url.searchParams.get('page') === '2' ? [f.activityItem({ id: 'comment-21', message: 'Plus ancien' })] : items, { page: Number(url.searchParams.get('page') ?? 1), limit: Number(url.searchParams.get('limit') ?? 20), total: 21, hasNextPage: url.searchParams.get('page') !== '2' }) }));
  await openTab('activity');
  await view.waitFor(() => bffProject.calls('/projects/{projectId}/activity', 'get').some((call) => call.url.searchParams.get('limit') === '20') && view.props('ProjectActivityTab').items.length === 20);

  await view.act(() => view.props('ProjectActivityTab').onPageChange(2));
  await view.waitFor(() => view.text().includes('Plus ancien'));
  assert.equal(bffProject.calls('/projects/{projectId}/activity', 'get').at(-1).url.searchParams.get('page'), '2');

  bffProject.on('post', '/projects/{projectId}/comments', ({ body }) => ({ status: 201, body: f.activityItem({ id: 'comment-22', message: body.message }) }));
  const reads = bffProject.calls('/projects/{projectId}/activity', 'get').length;
  await view.fire((props) => props.id === 'project-comment', 'onChange', { target: { value: '  Réunion de chantier le 3.  ', setCustomValidity() {} } });
  await view.fire((props, _text, tag) => tag === 'form' && props['aria-label'] === 'Publier un commentaire', 'onSubmit', { preventDefault() {} });
  await view.waitFor(() => bffProject.calls('/projects/{projectId}/activity', 'get').length >= reads + 2);
  assert.deepEqual(bffProject.calls('/projects/{projectId}/comments', 'post')[0].body, { message: 'Réunion de chantier le 3.' });
  assert.equal(view.props('ProjectActivityTab').page, 1, 'back to the newest entries');
});

test('MAIR-874 (C2): « Documents » says the storage is not available yet', async () => {
  await openTab('documents');
  assert.match(view.text(), /Documents non disponibles/);
});
