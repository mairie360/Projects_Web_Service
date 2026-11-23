const assert = require('node:assert/strict');
const { test, before, after, beforeEach, afterEach } = require('node:test');
const { requireTs } = require('./support/typescript.cjs');
const { installReactRuntime, mount } = require('./support/server-view.cjs');

// MAIR-1136 (Figma F3): the project creation in four steps (L’essentiel, Organisation, Tâches, Récapitulatif) and
// the edit on one page with its « Modifié » sections, « Enregistrer (n) » and « Supprimer ».

installReactRuntime();
const React = require('react');
const { createFrontHarness } = require('./support/front-harness.cjs');
const f = require('./support/bff-fixtures.cjs');
const Page = requireTs('src/app/projects-client.tsx').default;
const { changedProjectFields } = requireTs('src/components/ProjectsWorkspace/project-form-validation.ts');
const { stepErrors, firstStepInError } = requireTs('src/components/ProjectsWorkspace/components/CreateProjectModal/use-creation-steps.ts');
const { createProjectFormState } = requireTs('src/lib/projectPageState.ts');

const harness = createFrontHarness();
const { bffProject } = harness;
let view;
before(() => harness.start());
after(() => harness.stop());
beforeEach(() => { harness.reset(); harness.location.search = ''; harness.signIn(f.jwt(f.agents.marie.id)); });
afterEach(() => { view?.unmount(); view = undefined; assert.deepEqual(harness.violations(), []); });

const groups = [{ id: 'group-1', name: 'Voirie' }, { id: 'group-2', name: 'Bâtiments' }];
async function openPage() {
  bffProject.on('get', '/projects-page', { body: f.projectsPage() });
  bffProject.on('get', '/project-groups', { body: f.projectGroups(groups) });
  view = mount(React.createElement(Page));
  await view.waitFor((html) => !html.includes('Chargement des projets'));
  await view.waitFor(() => bffProject.calls('/project-groups', 'get').length === 1);
  await view.settle();
}
const submitDialog = () => view.fire((props, _text, tag) => tag === 'form' && props.role === 'dialog', 'onSubmit', { preventDefault() {} });
const step = () => view.props('StepProgress').current;

test('MAIR-1136: the creation goes step by step, skips to the recap and creates from it', async () => {
  await openPage();
  await view.click('Nouveau projet');
  await view.waitFor(() => view.find('CreateProjectModal').length === 1);
  assert.equal(step(), 0);
  assert.ok(view.text().includes('Étape 1 sur 4 · L’essentiel'));
  assert.ok(!view.text().includes('Passer au récapitulatif'));

  // Nothing typed: the first step keeps the agent with its messages.
  await submitDialog();
  assert.equal(step(), 0);
  assert.ok(view.text().includes('Le titre est obligatoire.'));

  await view.act(() => view.props('CreateProjectModal').onChange({ title: 'Piste cyclable', dueDate: '2027-06-30', groupId: 'group-2', responsible: f.people.marie.id }));
  assert.ok(view.text().includes('Passer au récapitulatif'));
  await submitDialog();
  assert.equal(step(), 1);
  assert.ok(view.text().includes('Étape 2 sur 4 · Organisation'));

  await view.click((props, text, tag) => tag === 'button' && text === 'Passer au récapitulatif');
  assert.equal(step(), 3);
  const recap = view.props('ProjectRecap');
  assert.equal(recap.form.title, 'Piste cyclable');
  assert.ok(view.text().includes('Bâtiments'), 'the recap names the group');
  assert.equal(bffProject.calls('/projects', 'post').length, 0, 'no write before the recap');

  const created = f.projectListItem({ id: 'project-21', title: 'Piste cyclable' });
  bffProject.on('post', '/projects', { status: 201, body: f.projectDetails(created, []) });
  bffProject.on('get', '/projects-page', { body: f.projectsPage([f.projectListItem(), created]) });
  await submitDialog();
  await view.waitFor(() => bffProject.calls('/projects', 'post').length === 1);
  assert.equal(bffProject.calls('/projects', 'post')[0].body.groupId, 'group-2');
});

test('MAIR-1136: the edit of a card counts its changes, marks the section and saves', async () => {
  await openPage();
  const [project] = view.props('KanbanBoard').projects;
  bffProject.on('get', '/projects/{projectId}', { body: f.projectDetails(project) });
  await view.act(() => view.props('KanbanBoard').onProjectEdit(project));
  await view.waitFor(() => view.find('CreateProjectModal').length === 1);
  assert.equal(view.find('StepProgress').length, 0, 'the edit stays on one page');
  assert.equal(view.props('CreateProjectFooter').changeCount, 0);
  assert.ok(!view.text().includes('Modifié'));

  await view.act(() => view.props('CreateProjectModal').onChange({ title: `${project.title} (phase 2)` }));
  assert.equal(view.props('CreateProjectFooter').changeCount, 1);
  assert.deepEqual(view.find('EditedSection').map((_, index) => view.props('EditedSection', index).modified), [true, false]);
  assert.equal(typeof view.props('CreateProjectFooter').onDelete, 'function');

  bffProject.on('patch', '/projects/{projectId}', ({ body }) => ({ body: f.projectDetails({ ...project, ...body }) }));
  await submitDialog();
  await view.waitFor(() => bffProject.calls('/projects/{projectId}', 'patch').length === 1);
  assert.equal(bffProject.calls('/projects/{projectId}', 'patch')[0].body.title, `${project.title} (phase 2)`);
});

test('MAIR-1136: « Supprimer » of the edit closes it and asks for the confirmation', async () => {
  await openPage();
  const [project] = view.props('KanbanBoard').projects;
  bffProject.on('get', '/projects/{projectId}', { body: f.projectDetails(project) });
  await view.act(() => view.props('KanbanBoard').onProjectEdit(project));
  await view.waitFor(() => view.find('CreateProjectModal').length === 1);
  await view.act(() => view.props('CreateProjectFooter').onDelete());
  assert.equal(view.find('CreateProjectModal').length, 0);
  assert.ok(view.text().includes(project.title));
  assert.equal(bffProject.calls('/projects/{projectId}', 'delete').length, 0, 'nothing deleted before the confirmation');
});

test('MAIR-1136: the steps check their own fields and the changes are counted field by field', () => {
  const errors = { title: 'a', responsible: 'b' };
  assert.deepEqual(stepErrors(errors, 1), { title: 'a' });
  assert.deepEqual(stepErrors(errors, 2), errors);
  assert.equal(firstStepInError({ responsible: 'b' }), 1);
  assert.equal(firstStepInError({}), undefined);
  const initial = { ...createProjectFormState(), title: 'Projet', labels: ['A'] };
  assert.deepEqual(changedProjectFields(initial, initial), []);
  assert.deepEqual(changedProjectFields({ ...initial, labels: ['A', 'B'], dueDate: '2027-01-01' }, initial), ['dueDate', 'labels']);
});
