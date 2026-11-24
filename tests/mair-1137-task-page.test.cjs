const assert = require('node:assert/strict');
const { test, before, after, beforeEach, afterEach } = require('node:test');
const { requireTs } = require('./support/typescript.cjs');
const { installReactRuntime, mount } = require('./support/server-view.cjs');

// MAIR-1137 (Figma F6 6.7 → 6.10c, F7 7.3): a task opens on its own page, never in its edit; « Modifier », the « … » of
// the cards, rows and page, the creation in three steps (« Ajouter et continuer ») and the single-page edit.

installReactRuntime();
const React = require('react');
const { createFrontHarness } = require('./support/front-harness.cjs');
const f = require('./support/bff-fixtures.cjs');
const Page = requireTs('src/app/projects-client.tsx').default;
const { taskDelayLabel, dueAfterProject, assigneeLoads } = requireTs('src/components/ProjectsWorkspace/components/ProjectPage/components/ProjectTasksTab/task-board-model.ts');

const harness = createFrontHarness();
const { bffProject } = harness;
const project = f.projectListItem({ dueDate: '2026-12-15' });
const todo = f.projectTask({ dueDate: '2026-11-20' });
const review = f.projectTask({ id: 'task-2', title: 'Plan des voiries', status: 'review', priority: 'high', responsible: f.people.alice, assignees: [f.people.alice] });
let view;

before(() => harness.start());
after(() => harness.stop());
beforeEach(() => {
  harness.reset();
  harness.location.search = '';
  harness.signIn(f.jwt(f.agents.marie.id));
  bffProject.on('get', '/projects-page', { body: f.projectsPage([project]) });
  bffProject.on('get', '/projects/{projectId}', { body: f.projectDetails(project, [todo, review]) });
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
const boardTask = (taskId) => view.props('TaskBoard').items.find((item) => item.task.id === taskId).task;
const dialog = () => view.props('TaskDialog');
const submitTask = (label) => view.fire((props, text, tag) => tag === 'form' && props['aria-label'] === label, 'onSubmit');
const radioGroup = (name) => view.find('RadioGroup').find((group) => group.props.name === name).props;
const writes = () => bffProject.requests.filter((request) => request.method !== 'GET');

test('MAIR-1137 C15: a card opens the task page (breadcrumb, meta line, « Informations », activity), never the edit', async () => {
  await openProject();
  await view.click((props, text, tag) => tag === 'button' && props.role === 'tab' && text.startsWith('Tâches'));
  await view.click((props) => props['aria-label'] === `Ouvrir la tâche ${todo.title}`);
  assert.equal(view.props('TaskPage').task.id, todo.id);
  assert.equal(dialog().open, false);
  assert.equal(view.find('TaskBoard').length, 0, 'the page takes the place of the board');
  assert.match(view.html, /aria-label="Fil d’Ariane de la tâche"/);
  assert.match(view.html, /aria-label="Résumé de la tâche"/);
  assert.match(view.text(), /Informations/);
  assert.match(view.text(), /Aucune description pour l’instant\./);
  await view.waitFor(() => bffProject.calls('/projects/{projectId}/tasks/{taskId}/collaboration', 'get').length === 1);
  assert.equal(writes().length, 0);
  await view.act(() => view.props('TaskPage').onBack());
  assert.equal(view.find('TaskPage').length, 0);
  assert.equal(view.find('TaskBoard').length, 1);
});

test('MAIR-1137 C15: « Prochaines tâches » opens the task page in « Tâches »', async () => {
  await openProject();
  assert.equal(typeof view.props('NextTasksPanel').onOpen, 'function');
  await view.act(() => view.props('NextTasksPanel').onOpen(todo));
  assert.equal(view.props('Tabs').value, 'tasks');
  assert.equal(view.props('TaskPage').task.id, todo.id);
});

test('MAIR-1137 C15: the task page completes, reopens and duplicates the task', async () => {
  await openProject();
  await view.act(() => view.props('ProjectTasksTab').onViewTask(todo.id));
  bffProject.on('patch', '/projects/{projectId}/tasks/{taskId}/status', ({ body }) => ({ body: f.projectTask({ ...todo, status: body.status === 'done' ? 'done' : 'todo' }) }));
  await view.act(() => view.props('TaskPage').onMove('done'));
  await view.waitFor(() => bffProject.calls('/projects/{projectId}/tasks/{taskId}/status', 'patch').length === 1);
  bffProject.on('post', '/projects/{projectId}/tasks', ({ body }) => ({ status: 201, body: f.projectTask({ ...body, id: 'task-copy', responsible: f.people.marie, assignees: [f.people.marie] }) }));
  await view.act(() => view.props('TaskPage').onDuplicate());
  await view.waitFor(() => bffProject.calls('/projects/{projectId}/tasks', 'post').length === 1);
  assert.equal(bffProject.calls('/projects/{projectId}/tasks', 'post')[0].body.title, `${todo.title} (copie)`);
});

test('MAIR-1137 C12: the creation goes in three steps and « Ajouter et continuer » opens the next one', async () => {
  await openProject();
  await view.click((props, text, tag) => tag === 'button' && text === 'Nouvelle tâche');
  assert.equal(dialog().open, true);
  assert.equal(view.props('Modal', view.find('Modal').findIndex((modal) => modal.props.title === 'Nouvelle tâche')).currentStep, 0);
  await view.fire((props) => props.id === 'task-sheet-title', 'onChange', { target: { value: 'Poser les lanternes' } });
  await view.fire((props) => props.id === 'task-sheet-due-date', 'onChange', { target: { value: '2027-01-10' } });
  assert.match(view.text(), /Après la fin du projet/);
  await submitTask('Créer une tâche');
  await view.act(() => radioGroup('task-assignee').onChange('user-3'));
  await view.act(() => radioGroup('task-priority').onChange('high'));
  await submitTask('Créer une tâche');
  assert.equal(writes().length, 0, 'nothing written before the recap');
  await view.act(() => view.find('TaskRecap')[0].props.onContinueChange(true));
  assert.match(view.text(), /Ajouter et continuer/);
  bffProject.on('post', '/projects/{projectId}/tasks', ({ body }) => ({ status: 201, body: f.projectTask({ ...body, id: 'task-9', responsible: f.people.marie, assignees: [f.people.marie] }) }));
  await submitTask('Créer une tâche');
  await view.waitFor(() => bffProject.calls('/projects/{projectId}/tasks', 'post').length === 1);
  const [{ body }] = bffProject.calls('/projects/{projectId}/tasks', 'post');
  assert.equal(body.priority, 'high');
  assert.equal(body.dueDate, '2027-01-10');
  await view.waitFor(() => dialog().open && dialog().form.title === '');
});

test('MAIR-1137 C13, C15: the card « … » « Modifier » opens the single-page edit with its counter', async () => {
  await openProject();
  await view.act(() => view.props('TaskBoard').onEditTask(boardTask('task-2')));
  assert.equal(dialog().task.id, 'task-2');
  assert.match(view.text(), /Enregistrer \(0\)/);
  await view.act(() => radioGroup('task-priority').onChange('low'));
  assert.match(view.text(), /Enregistrer \(1\)/);
  assert.match(view.text(), /Modifié/);
  bffProject.on('patch', '/projects/{projectId}/tasks/{taskId}', ({ body }) => ({ body: f.projectTask({ ...review, ...body, id: 'task-2' }) }));
  await submitTask('Modifier une tâche');
  await view.waitFor(() => bffProject.calls('/projects/{projectId}/tasks/{taskId}', 'patch').length === 1);
  assert.equal(bffProject.calls('/projects/{projectId}/tasks/{taskId}', 'patch')[0].body.priority, 'low');
});

test('MAIR-1137: the time left, the « Après la fin du projet » rule and the agents’ load', () => {
  const now = new Date('2026-11-10T12:00:00Z');
  assert.equal(taskDelayLabel('2026-11-10', now), 'Aujourd’hui');
  assert.equal(taskDelayLabel('2026-11-22', now), 'Dans 12 jours');
  assert.equal(taskDelayLabel('2026-11-09', now), 'En retard de 1 jour');
  assert.equal(taskDelayLabel('', now), '');
  assert.equal(dueAfterProject('2027-01-01', '2026-12-15'), true);
  assert.equal(dueAfterProject('2026-12-01', '2026-12-15'), false);
  assert.equal(dueAfterProject('', '2026-12-15'), false);
  const loads = assigneeLoads([todo, review, f.projectTask({ id: 'task-3', status: 'done' })]);
  assert.equal(loads.get('user-3'), 1);
  assert.equal(loads.get('user-2'), 2);
});
