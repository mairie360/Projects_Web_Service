const assert = require('node:assert/strict');
const { test, before, after, beforeEach, afterEach } = require('node:test');
const { requireTs } = require('./support/typescript.cjs');
const { installReactRuntime, mount } = require('./support/server-view.cjs');

// A task has a description — typed in the task window (creation and edit), sent to BFF_Project, shown on
// the task page with its line breaks, or « Aucune description pour l’instant. » with « Ajouter une description ».

installReactRuntime();
const React = require('react');
const { createFrontHarness } = require('./support/front-harness.cjs');
const f = require('./support/bff-fixtures.cjs');
const Page = requireTs('src/app/projects-client.tsx').default;
const { taskBodyFromDraft } = requireTs('src/lib/bffProjectClient.ts');
const { taskToFormState } = requireTs('src/components/ProjectsWorkspace/components/ProjectTasksEditor/task-form-state.ts');

const harness = createFrontHarness();
const { bffProject } = harness;
const project = f.projectListItem({ dueDate: '2026-12-15' });
const DESCRIPTION = 'Trois devis de couverture.\nAvant le conseil municipal.';
let tasks;
let view;

before(() => harness.start());
after(() => harness.stop());
beforeEach(() => {
  harness.reset();
  harness.location.search = '';
  harness.signIn(f.jwt(f.agents.marie.id));
  tasks = [f.projectTask({ dueDate: '2026-11-20' }), f.projectTask({ id: 'task-2', title: 'Plan des voiries', description: DESCRIPTION })];
  bffProject.on('get', '/projects-page', { body: f.projectsPage([project]) });
  // The detail is read again after a write: it answers the tasks as they are now.
  bffProject.on('get', '/projects/{projectId}', () => ({ body: f.projectDetails(project, tasks) }));
  bffProject.on('patch', '/projects/{projectId}/tasks/{taskId}', ({ body, pathParams }) => {
    const index = tasks.findIndex((task) => task.id === pathParams.taskId);
    tasks[index] = f.projectTask({ ...tasks[index], ...body, id: pathParams.taskId, responsible: tasks[index].responsible, assignees: tasks[index].assignees });
    return { body: tasks[index] };
  });
});
afterEach(() => {
  view?.unmount();
  view = undefined;
  assert.deepEqual(harness.violations(), []);
});

async function openProject() {
  view = mount(React.createElement(Page));
  await view.waitFor((html) => !html.includes('Chargement des projets'));
  await view.act(() => view.props('KanbanBoard').onProjectOpen(view.props('KanbanBoard').projects[0]));
  await view.waitFor(() => view.find('ProjectPage').length === 1);
  await view.waitFor(() => view.props('ProjectTasksTab').statusOptions.some((option) => option.value === 'status-4'));
}
const dialog = () => view.props('TaskDialog');
const submitTask = (label) => view.fire((props, text, tag) => tag === 'form' && props['aria-label'] === label, 'onSubmit');
const typeDescription = (value) => view.fire((props) => props.id === 'task-sheet-description', 'onChange', { target: { value } });
const radioGroup = (name) => view.find('RadioGroup').find((group) => group.props.name === name).props;
const patches = () => bffProject.calls('/projects/{projectId}/tasks/{taskId}', 'patch');

test('MAIR-1198 business: a task without description offers to add one, the saved text shows on its page', async () => {
  await openProject();
  await view.act(() => view.props('ProjectTasksTab').onViewTask('task-1'));
  assert.match(view.text(), /Aucune description pour l’instant\./);
  await view.click((props, text, tag) => tag === 'button' && text === 'Ajouter une description');
  assert.equal(dialog().open, true);
  assert.equal(dialog().task.id, 'task-1');
  await typeDescription(DESCRIPTION);
  assert.match(view.text(), /Enregistrer \(1\)/);
  await submitTask('Modifier une tâche');
  await view.waitFor(() => patches().length === 1);
  assert.equal(patches()[0].body.description, DESCRIPTION);
  await view.waitFor(() => !dialog().open && view.html.includes('data-task-description'));
  assert.equal(view.props('TaskPage').task.description, DESCRIPTION);
  assert.doesNotMatch(view.text(), /Aucune description pour l’instant/);
});

test('MAIR-1198 business: the description is edited, then cleared', async () => {
  await openProject();
  await view.act(() => view.props('ProjectTasksTab').onViewTask('task-2'));
  assert.equal(view.props('TaskPage').task.description, DESCRIPTION);
  await view.act(() => view.props('TaskPage').onEdit());
  assert.equal(dialog().form.description, DESCRIPTION);
  await typeDescription('Deux devis suffisent.');
  await submitTask('Modifier une tâche');
  await view.waitFor(() => patches().length === 1);
  assert.equal(patches()[0].body.description, 'Deux devis suffisent.');
  await view.waitFor(() => !dialog().open && view.props('TaskPage').task.description === 'Deux devis suffisent.');
  await view.act(() => view.props('TaskPage').onEdit());
  await typeDescription('');
  await submitTask('Modifier une tâche');
  await view.waitFor(() => patches().length === 2);
  assert.equal(patches()[1].body.description, '', 'an empty description clears it');
  await view.waitFor(() => !dialog().open && /Aucune description pour l’instant/.test(view.text()));
});

test('MAIR-1198 technical: the creation sends the description, shown in the recap, in a contract-valid body', async () => {
  await openProject();
  await view.click((props, text, tag) => tag === 'button' && text === 'Nouvelle tâche');
  await view.fire((props) => props.id === 'task-sheet-title', 'onChange', { target: { value: 'Poser les lanternes' } });
  await typeDescription(DESCRIPTION);
  await submitTask('Créer une tâche');
  await view.act(() => radioGroup('task-assignee').onChange('user-3'));
  await submitTask('Créer une tâche');
  assert.match(view.text(), /Trois devis de couverture\./);
  bffProject.on('post', '/projects/{projectId}/tasks', ({ body }) => ({ status: 201, body: f.projectTask({ ...body, id: 'task-9', responsible: f.people.marie, assignees: [f.people.marie] }) }));
  await submitTask('Créer une tâche');
  await view.waitFor(() => bffProject.calls('/projects/{projectId}/tasks', 'post').length === 1);
  assert.equal(bffProject.calls('/projects/{projectId}/tasks', 'post')[0].body.description, DESCRIPTION);
});

test('MAIR-1198 technical: the duplicate of a task keeps its description', async () => {
  await openProject();
  await view.act(() => view.props('ProjectTasksTab').onViewTask('task-2'));
  bffProject.on('post', '/projects/{projectId}/tasks', ({ body }) => ({ status: 201, body: f.projectTask({ ...body, id: 'task-copy', responsible: f.people.marie, assignees: [f.people.marie] }) }));
  await view.act(() => view.props('TaskPage').onDuplicate());
  await view.waitFor(() => bffProject.calls('/projects/{projectId}/tasks', 'post').length === 1);
  assert.equal(bffProject.calls('/projects/{projectId}/tasks', 'post')[0].body.description, DESCRIPTION);
});

test('MAIR-1198 technical: the task body carries the description as typed, a blank one as empty, none when absent', () => {
  const draft = { title: 'Audit', status: 'todo', priority: 'medium', responsible: f.people.marie, assignees: [f.people.marie], labels: [], dueDate: '2026-12-01' };
  assert.equal(taskBodyFromDraft({ ...draft, description: DESCRIPTION }).description, DESCRIPTION);
  assert.equal(taskBodyFromDraft({ ...draft, description: '  \n ' }).description, '');
  assert.equal('description' in taskBodyFromDraft(draft), false);
  assert.equal(taskToFormState(f.projectTask({ description: DESCRIPTION })).description, DESCRIPTION);
  assert.equal(taskToFormState({ ...f.projectTask(), description: undefined }).description, '');
});
