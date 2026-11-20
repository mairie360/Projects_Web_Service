const assert = require('node:assert/strict');
const { test, before, after, beforeEach, afterEach } = require('node:test');
const { requireTs } = require('./support/typescript.cjs');
const { installReactRuntime, mount } = require('./support/server-view.cjs');

// MAIR-880: BFF_Project requires the group of a new project (`GET /project-groups`, `groupId` on
// `POST /projects`, 400 without it), lets an edit move the project to another group and names the group in
// the detail. The front sends the chosen group, never invents one, and keeps an old project without a group.

installReactRuntime();
const React = require('react');
const { createFrontHarness } = require('./support/front-harness.cjs');
const f = require('./support/bff-fixtures.cjs');
const Page = requireTs('src/app/projects-client.tsx').default;

const harness = createFrontHarness();
const { bffProject } = harness;
const project = f.projectListItem();
const groups = [{ id: 'group-1', name: 'Services techniques' }, { id: 'group-7', name: 'Urbanisme' }];
let view;
before(() => harness.start());
after(() => harness.stop());
beforeEach(() => {
  harness.reset(); harness.location.search = ''; harness.signIn(f.jwt(f.agents.marie.id));
  bffProject.on('get', '/projects-page', { body: f.projectsPage([project]) });
  bffProject.on('get', '/projects/{projectId}', { body: f.projectDetails(project) });
});
afterEach(() => { view?.unmount(); view = undefined; assert.deepEqual(harness.violations(), []); });

// The lib SelectField: its native <select> carries the value, the parent form the options and the error.
const groupField = (id = 'project-group') => {
  const select = view.hostElements((props, _text, tag) => tag === 'select' && props.id === id)[0]?.props;
  const owner = id === 'project-group' ? view.props('ProjectSideFields') : view.props('ProjectEditForm');
  return {
    value: select?.value, required: select?.required ?? false,
    options: owner.groupOptions, error: owner.groupsError,
    onChange: (value) => view.fire((props, _text, tag) => tag === 'select' && props.id === id, 'onChange', { target: { value } }),
  };
};
const draft = { title: 'Réfection du gymnase', description: 'Sols et éclairage', responsible: f.people.marie.id, dueDate: '2026-12-01' };

async function openCreation() {
  view = mount(React.createElement(Page));
  await view.waitFor(html => !html.includes('Chargement des projets'));
  await view.waitFor(() => bffProject.calls('/project-groups', 'get').length === 1);
  await view.settle();
  await view.click('Nouveau projet');
  await view.act(() => view.props('CreateProjectModal').onChange(draft));
}

async function submitCreation() {
  bffProject.on('post', '/projects', { status: 201, body: f.projectDetails(f.projectListItem({ id: 'project-9', title: draft.title })) });
  await view.act(() => view.props('CreateProjectModal').onSubmit({ preventDefault() {} }));
}

test('MAIR-880: the creation form offers the linkable groups and sends the chosen one', async () => {
  bffProject.on('get', '/project-groups', { body: f.projectGroups(groups) });
  await openCreation();

  assert.deepEqual(groupField().options, [{ value: 'group-1', label: 'Services techniques' }, { value: 'group-7', label: 'Urbanisme' }]);
  assert.equal(groupField().required, true);
  assert.equal(groupField().value, '', 'several groups: nothing is chosen for the agent');

  await groupField().onChange('group-7');
  await submitCreation();
  await view.waitFor(() => view.find('CreateProjectModal').length === 0);

  assert.equal(bffProject.calls('/projects', 'post')[0].body.groupId, 'group-7');
  assert.equal(bffProject.calls('/project-groups', 'get').length, 1, 'the groups are read once per page');
});

test('MAIR-880: without a chosen group among several, the creation is refused before any write', async () => {
  bffProject.on('get', '/project-groups', { body: f.projectGroups(groups) });
  await openCreation();
  await submitCreation();

  assert.match(view.text(), /Le groupe est obligatoire\./);
  assert.equal(bffProject.calls('/projects', 'post').length, 0);
  assert.equal(view.find('CreateProjectModal').length, 1, 'the draft stays open');
});

test('MAIR-880: a single linkable group is preselected and sent', async () => {
  await openCreation();
  assert.equal(groupField().value, 'group-1');

  await submitCreation();
  await view.waitFor(() => bffProject.calls('/projects', 'post').length === 1);
  assert.equal(bffProject.calls('/projects', 'post')[0].body.groupId, 'group-1');
});

test('MAIR-880: no linkable group is explained and nothing is sent', async () => {
  bffProject.on('get', '/project-groups', { body: f.projectGroups([]) });
  await openCreation();

  assert.match(groupField().error, /Aucun groupe disponible/);
  await submitCreation();
  assert.equal(bffProject.calls('/projects', 'post').length, 0);
});

test('MAIR-880: a refused group read is shown on the field instead of logging the agent out', async () => {
  bffProject.on('get', '/project-groups', harness.errorReply(503, f.apiError('SERVICE_UNAVAILABLE', 'Groupes indisponibles')));
  await openCreation();

  assert.equal(groupField().error, 'Groupes indisponibles');
  assert.equal(harness.location.reloads, 0);
});

test('MAIR-880: the detail names the group, and an edit sends the new group', async () => {
  bffProject.on('get', '/project-groups', { body: f.projectGroups(groups) });
  view = mount(React.createElement(Page));
  await view.waitFor(html => !html.includes('Chargement des projets'));
  await view.act(() => view.props('KanbanBoard').onProjectOpen(project));
  await view.waitFor(() => view.find('ProjectSummary').length === 1 && bffProject.calls('/projects/{projectId}', 'get').length === 1);
  await view.settle();
  assert.match(view.text(), /Groupe\s*Services techniques/);

  await view.click((props, text, tag) => tag === 'button' && text === 'Modifier');
  assert.equal(groupField('detail-project-group').value, 'group-1');
  assert.equal(groupField('detail-project-group').required, true, 'MAIR-846 (C7): the group is required in the page edit');
  await groupField('detail-project-group').onChange('group-7');
  bffProject.on('patch', '/projects/{projectId}', { body: f.projectDetails({ ...project, group: groups[1] }) });
  await view.act(() => view.props('ProjectEditForm').onSubmit({ preventDefault() {} }));
  await view.waitFor(() => bffProject.calls('/projects/{projectId}', 'patch').length === 1);

  assert.equal(bffProject.calls('/projects/{projectId}', 'patch')[0].body.groupId, 'group-7');
});

test('MAIR-846: a project created before groups shows « Sans groupe » and its edit requires a group', async () => {
  bffProject.on('get', '/projects/{projectId}', { body: f.projectDetails({ ...project, group: null }) });
  bffProject.on('get', '/project-groups', { body: f.projectGroups(groups) });
  view = mount(React.createElement(Page));
  await view.waitFor(html => !html.includes('Chargement des projets'));
  await view.act(() => view.props('KanbanBoard').onProjectOpen(project));
  await view.waitFor(() => view.find('ProjectSummary').length === 1 && bffProject.calls('/projects/{projectId}', 'get').length === 1);
  await view.settle();
  assert.match(view.text(), /Groupe\s*Sans groupe\s*Choisissez un groupe dans « Modifier »/);

  await view.click((props, text, tag) => tag === 'button' && text === 'Modifier');
  await view.act(() => view.props('ProjectEditForm').onSubmit({ preventDefault() {} }));
  assert.equal(view.props('ProjectEditForm').fieldErrors.groupId, 'Le groupe est obligatoire.');
  assert.equal(bffProject.calls('/projects/{projectId}', 'patch').length, 0, 'nothing is sent without a group');

  await groupField('detail-project-group').onChange('group-7');
  assert.equal(view.props('ProjectEditForm').fieldErrors.groupId, undefined);
  bffProject.on('patch', '/projects/{projectId}', { body: f.projectDetails({ ...project, group: groups[1] }) });
  await view.act(() => view.props('ProjectEditForm').onSubmit({ preventDefault() {} }));
  await view.waitFor(() => bffProject.calls('/projects/{projectId}', 'patch').length === 1);
  assert.deepEqual(bffProject.calls('/projects/{projectId}', 'patch')[0].body, { groupId: 'group-7' }, 'only the chosen group is sent');
});

test('MAIR-880: without any linkable group, the edit of a project without group leaves the group out', async () => {
  bffProject.on('get', '/projects/{projectId}', { body: f.projectDetails({ ...project, group: null }) });
  bffProject.on('get', '/project-groups', { body: f.projectGroups([]) });
  view = mount(React.createElement(Page));
  await view.waitFor(html => !html.includes('Chargement des projets'));
  await view.act(() => view.props('KanbanBoard').onProjectOpen(project));
  await view.waitFor(() => view.find('ProjectSummary').length === 1 && bffProject.calls('/projects/{projectId}', 'get').length === 1);
  await view.settle();
  await view.click((props, text, tag) => tag === 'button' && text === 'Modifier');
  await view.act(() => view.props('ProjectEditForm').onChange({ title: 'Titre corrigé' }));
  bffProject.on('patch', '/projects/{projectId}', { body: f.projectDetails({ ...project, title: 'Titre corrigé', group: null }) });
  await view.act(() => view.props('ProjectEditForm').onSubmit({ preventDefault() {} }));
  await view.waitFor(() => bffProject.calls('/projects/{projectId}', 'patch').length === 1);

  assert.deepEqual(bffProject.calls('/projects/{projectId}', 'patch')[0].body, { title: 'Titre corrigé' });
});

test('MAIR-880: an edit that moves the project out of the agent\'s groups (204) removes it from the page', async () => {
  bffProject.on('get', '/project-groups', { body: f.projectGroups(groups) });
  view = mount(React.createElement(Page));
  await view.waitFor(html => !html.includes('Chargement des projets'));
  await view.act(() => view.props('KanbanBoard').onProjectOpen(project));
  await view.waitFor(() => view.find('ProjectSummary').length === 1 && bffProject.calls('/projects/{projectId}', 'get').length === 1);
  await view.settle();
  await view.click((props, text, tag) => tag === 'button' && text === 'Modifier');
  await groupField('detail-project-group').onChange('group-7');
  // Orval only types the 200 body; the 204 is documented in the operation description of the published contract.
  bffProject.on('patch', '/projects/{projectId}', { status: 204, outOfContract: true });
  bffProject.on('get', '/projects-page', { body: f.projectsPage([]) });
  await view.act(() => view.props('ProjectEditForm').onSubmit({ preventDefault() {} }));
  await view.waitFor(html => html.includes('ne fait plus partie de vos projets'));

  assert.equal(view.find('ProjectPage').length, 0, 'the detail of a project the agent no longer sees is closed');
  assert.equal(view.props('ProjectsWorkspace').projects.some(row => row.id === project.id), false);
  assert.equal(bffProject.calls('/projects/{projectId}', 'patch').length, 1, 'the saved update is not replayed');
});
