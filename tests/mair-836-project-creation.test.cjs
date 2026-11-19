const assert = require('node:assert/strict');
const { test, before, after, beforeEach, afterEach } = require('node:test');
const { requireTs } = require('./support/typescript.cjs');
const { installReactRuntime, mount } = require('./support/server-view.cjs');

// MAIR-836 (Figma F3 3.1 to 3.6): the V2 creation dialog checks its fields before any write, keeps the dialog
// open on a BFF refusal, and ends a creation with the « Projet créé » toast and the card in its column.

installReactRuntime();
const React = require('react');
const { createFrontHarness } = require('./support/front-harness.cjs');
const f = require('./support/bff-fixtures.cjs');
const Page = requireTs('src/app/projects-client.tsx').default;
const { validateProjectForm } = requireTs('src/components/ProjectsWorkspace/components/CreateProjectModal/project-form-validation.ts');
const { createProjectFormState } = requireTs('src/lib/projectPageState.ts');

const harness = createFrontHarness();
const { bffProject } = harness;
let view;
before(() => harness.start());
after(() => harness.stop());
beforeEach(() => { harness.reset(); harness.location.search = ''; harness.signIn(f.jwt(f.agents.marie.id)); });
afterEach(() => { view?.unmount(); view = undefined; assert.deepEqual(harness.violations(), []); });

const twoGroups = [{ id: 'group-1', name: 'Voirie' }, { id: 'group-2', name: 'Bâtiments' }];
async function openDialog() {
  bffProject.on('get', '/projects-page', { body: f.projectsPage() });
  bffProject.on('get', '/project-groups', { body: f.projectGroups(twoGroups) });
  view = mount(React.createElement(Page));
  await view.waitFor((html) => !html.includes('Chargement des projets'));
  await view.waitFor(() => bffProject.calls('/project-groups', 'get').length === 1);
  await view.settle();
  await view.click('Nouveau projet');
  await view.waitFor(() => view.find('CreateProjectModal').length === 1);
}
const submitDialog = () => view.fire((props, _text, tag) => tag === 'form' && props.role === 'dialog', 'onSubmit', { preventDefault() {} });

test('MAIR-836: an empty dialog shows the messages under its fields and sends nothing', async () => {
  await openDialog();
  await submitDialog();

  for (const message of ['Le titre est obligatoire.', 'Le groupe est obligatoire.', 'Choisissez un responsable ou un membre de l’équipe.', 'La date d’échéance est obligatoire.']) {
    assert.ok(view.text().includes(message), message);
  }
  assert.equal(bffProject.calls('/projects', 'post').length, 0);
  assert.equal(view.find('CreateProjectModal').length, 1);
});

test('MAIR-836: a group refused by the BFF (deleted meanwhile) keeps the dialog open with its fields', async () => {
  await openDialog();
  await view.act(() => view.props('CreateProjectModal').onChange({ title: 'Rénovation du gymnase', dueDate: '2027-06-30', groupId: 'group-2', responsible: f.people.marie.id }));
  bffProject.on('post', '/projects', harness.errorReply(404, f.apiError('NOT_FOUND', 'Groupe introuvable')));
  await submitDialog();
  await view.waitFor(() => bffProject.calls('/projects', 'post').length === 1 && view.text().includes('Groupe introuvable'));

  assert.equal(bffProject.calls('/projects', 'post')[0].body.groupId, 'group-2');
  assert.equal(view.find('CreateProjectModal').length, 1);
  assert.equal(view.props('CreateProjectModal').form.title, 'Rénovation du gymnase');
});

test('MAIR-836: a created project lands in its column with the « Projet créé » toast', async () => {
  await openDialog();
  const created = f.projectListItem({ id: 'project-16', title: 'Rénovation du gymnase', status: 'in-progress' });
  bffProject.on('post', '/projects', { status: 201, body: f.projectDetails(created, []) });
  bffProject.on('get', '/projects-page', { body: f.projectsPage([f.projectListItem(), created]) });
  await view.act(() => view.props('CreateProjectModal').onChange({ title: created.title, dueDate: '2027-06-30', groupId: 'group-1', status: 'in-progress', responsible: f.people.marie.id, labels: ['Bâtiments', 'Sport'] }));
  await submitDialog();
  await view.waitFor(() => view.text().includes('Projet « Rénovation du gymnase » créé.'));

  const body = bffProject.calls('/projects', 'post')[0].body;
  assert.equal(body.status, 'in-progress');
  assert.deepEqual(body.labels, ['Bâtiments', 'Sport'], 'labels typed on the fly are sent');
  assert.equal(view.find('ProjectDetailModal').length, 0);
  assert.ok(view.props('KanbanBoard').projects.some((project) => project.id === 'project-16' && project.status === 'in-progress'));
});

test('MAIR-836: validation rules (markup, single group, edit without group)', () => {
  const base = { ...createProjectFormState(), title: 'Projet', dueDate: '2027-01-01', responsible: 'user-1' };
  assert.deepEqual(validateProjectForm(base, { creating: true, groupCount: 1 }), {}, 'a single proposed group is submitted by the controller');
  assert.deepEqual(validateProjectForm(base, { creating: false, groupCount: 0 }), {});
  assert.equal(validateProjectForm({ ...base, title: '<b>' }, { creating: false, groupCount: 0 }).title, 'Le titre ne doit pas contenir les caractères < ou >.');
  assert.equal(validateProjectForm({ ...base, responsible: '' }, { creating: false, groupCount: 0 }).responsible, 'Choisissez un responsable ou un membre de l’équipe.');
  assert.deepEqual(validateProjectForm({ ...base, responsible: '', assignees: ['user-2'] }, { creating: false, groupCount: 0 }), {}, 'a team member is enough');
  assert.deepEqual(validateProjectForm({ ...base, description: '' }, { creating: false, groupCount: 0 }), {}, 'the description is optional');
  assert.equal(validateProjectForm({ ...base, description: 'a > b' }, { creating: false, groupCount: 0 }).description, 'La description ne doit pas contenir les caractères < ou >.');
});
