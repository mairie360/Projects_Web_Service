const assert = require('node:assert/strict');
const { test, before, after, beforeEach, afterEach } = require('node:test');
const { requireTs } = require('./support/typescript.cjs');
const { installReactRuntime, mount } = require('./support/server-view.cjs');

// MAIR-859 (Figma F6 6.1 to 6.13): the « Tâches » tab of the project page — three-column board with drag and drop
// (toast, rollback), quick add, task sheet (Drawer), list, search and filters — on the contract mock of BFF_Project.

installReactRuntime();
const React = require('react');
const { createFrontHarness } = require('./support/front-harness.cjs');
const f = require('./support/bff-fixtures.cjs');
const Page = requireTs('src/app/projects-client.tsx').default;
const { archivedTasksMore, isTaskOverdue, taskColumn } = requireTs('src/components/ProjectsWorkspace/components/ProjectPage/components/ProjectTasksTab/task-board-model.ts');

const harness = createFrontHarness();
const { bffProject } = harness;
const project = f.projectListItem({ tasks: { total: 4, completed: 2, active: 2, archived: 1 } });
const todo = f.projectTask({ dueDate: '2026-01-05T00:00:00.000Z' });
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

async function openTasks() {
  view = mount(React.createElement(Page));
  await view.waitFor((html) => !html.includes('Chargement des projets'));
  await view.act(() => view.props('KanbanBoard').onProjectOpen(view.props('KanbanBoard').projects[0]));
  await view.waitFor(() => view.find('ProjectPage').length === 1);
  await view.click((props, text, tag) => tag === 'button' && props.role === 'tab' && text.startsWith('Tâches'));
  // The project statuses are read once the detail is in (MAIR-567): the moves then send their id.
  await view.waitFor(() => view.props('ProjectTasksTab').statusOptions.some((option) => option.value === 'status-4'));
}
const items = () => view.props('TaskBoard').items;
const columnOf = (taskId) => items().find((item) => item.task.id === taskId)?.column;
const boardTask = (taskId) => items().find((item) => item.task.id === taskId).task;
const writes = () => bffProject.requests.filter((request) => request.method !== 'GET');
// MAIR-1137: the task window (lib Modal) replaced the Drawer sheet; a creation goes through its steps.
const dialog = () => view.props('TaskDialog');
const submitTask = (label) => view.fire((props, text, tag) => tag === 'form' && props['aria-label'] === label, 'onSubmit');
const radioGroup = (name) => view.find('RadioGroup').find((group) => group.props.name === name).props;

test('MAIR-859 model: columns by category, « En retard » only before done, archived count wording', () => {
  assert.equal(taskColumn({ status: 'review', completed: false }), 'in-progress');
  assert.equal(taskColumn({ status: 'todo', completed: true }), 'done');
  const now = new Date('2026-10-15T12:00:00Z');
  assert.equal(isTaskOverdue({ dueDate: '2026-10-01', status: 'todo', completed: false }, now), true);
  assert.equal(isTaskOverdue({ dueDate: '2026-10-01', status: 'done', completed: true }, now), false);
  assert.equal(isTaskOverdue({ dueDate: '', status: 'todo', completed: false }, now), false);
  assert.equal(archivedTasksMore(0), '');
  assert.equal(archivedTasksMore(1), '+ 1 tâche terminée');
  assert.equal(archivedTasksMore(3), '+ 3 tâches terminées');
});

test('MAIR-859 C1: the board shows three columns, the cards and the archived done tasks', async () => {
  await openTasks();
  assert.match(view.html, /data-task-column="todo"[^]*data-task-column="in-progress"[^]*data-task-column="done"/);
  assert.equal(columnOf('task-1'), 'todo');
  assert.equal(columnOf('task-2'), 'in-progress', '« En revue » sits in « En cours »');
  assert.match(view.text(), /En retard/);
  assert.match(view.text(), /\+ 1 tâche terminée/);
  assert.equal(writes().length, 0);
});

test('MAIR-859 C2: a drop sends the status, shows « Tâche terminée » and the refreshed progress', async () => {
  await openTasks();
  bffProject.on('patch', '/projects/{projectId}/tasks/{taskId}/status', { body: f.projectTask({ status: 'done' }) });
  bffProject.on('get', '/projects/{projectId}', { body: f.projectDetails({ ...project, progress: 75, tasks: { total: 4, completed: 3, active: 1, archived: 2 } }, [review]) });
  await view.act(() => view.props('TaskBoard').onMoveTask(boardTask('task-1'), 'done'));
  await view.waitFor(() => view.text().includes('Tâche terminée'));
  assert.deepEqual(bffProject.calls('/projects/{projectId}/tasks/{taskId}/status', 'patch')[0].body, { statusId: 'status-4' });
  // Archived by the BFF, the task stays in « Terminé » on this board; the indicator shows the refreshed progress.
  assert.equal(columnOf('task-1'), 'done');
  assert.match(view.text(), /\+ 1 tâche terminée/);
  assert.match(view.text(), /75 %/);
});

test('MAIR-859 C2: a refused move puts the card back with an error toast', async () => {
  await openTasks();
  bffProject.on('patch', '/projects/{projectId}/tasks/{taskId}/status', harness.errorReply(403, f.apiError('FORBIDDEN', 'Déplacement refusé')));
  await view.act(() => view.props('TaskBoard').onMoveTask(boardTask('task-2'), 'todo'));
  await view.waitFor(() => view.text().includes('Statut non modifié'));
  assert.equal(columnOf('task-2'), 'in-progress');
  assert.match(view.text(), /Déplacement refusé/);
  assert.equal(bffProject.calls('/projects/{projectId}', 'get').length, 1, 'no refresh after a refusal');
});

test('MAIR-859 C3: the quick add of a column keeps its status; without a known agent the sheet opens with the title', async () => {
  await openTasks();
  bffProject.on('post', '/projects/{projectId}/tasks', ({ body }) => ({ status: 201, body: f.projectTask({ ...body, id: 'task-9', status: 'in-progress', responsible: f.people.marie, assignees: [f.people.marie] }) }));
  // The harness has no Login identity: the task needs an assignee, so the sheet opens with the typed title.
  await view.act(() => view.props('TaskBoard').onQuickAdd('Consulter les riverains', 'in-progress'));
  assert.equal(dialog().open, true);
  assert.equal(dialog().form.title, 'Consulter les riverains');
  assert.equal(writes().length, 0);
  await submitTask('Créer une tâche');
  await view.act(() => radioGroup('task-assignee').onChange('user-3'));
  await submitTask('Créer une tâche');
  await submitTask('Créer une tâche');
  await view.waitFor(() => view.text().includes('Tâche ajoutée'));
  const [{ body }] = bffProject.calls('/projects/{projectId}/tasks', 'post');
  assert.equal(body.title, 'Consulter les riverains');
  assert.equal(body.status, 'in-progress');
  assert.equal(body.statusId, 'status-2');
});

test('MAIR-859 C4, C5: « Nouvelle tâche » refuses an empty title, then creates the task from the sheet', async () => {
  await openTasks();
  await view.click((props, text, tag) => tag === 'button' && text === 'Nouvelle tâche');
  assert.equal(dialog().open, true);
  assert.equal(dialog().task, null);
  assert.match(view.html, /role="dialog"[^>]*aria-modal="true"/);
  await submitTask('Créer une tâche');
  assert.match(view.text(), /Donnez un titre à la tâche/);
  assert.equal(writes().length, 0);
  bffProject.on('post', '/projects/{projectId}/tasks', ({ body }) => ({ status: 201, body: f.projectTask({ ...body, id: 'task-9', responsible: f.people.marie, assignees: [f.people.marie] }) }));
  await view.fire((props) => props.id === 'task-sheet-title', 'onChange', { target: { value: 'Réception des travaux' } });
  await submitTask('Créer une tâche');
  await view.act(() => radioGroup('task-assignee').onChange('user-3'));
  await submitTask('Créer une tâche');
  await submitTask('Créer une tâche');
  await view.waitFor(() => !dialog().open);
  assert.equal(bffProject.calls('/projects/{projectId}/tasks', 'post')[0].body.title, 'Réception des travaux');
});

test('MAIR-859 C4, MAIR-1137 C15: a card opens its page, « Modifier » saves the state and « Supprimer la tâche » asks first', async () => {
  await openTasks();
  await view.click((props) => props['aria-label'] === `Ouvrir la tâche ${todo.title}`);
  assert.equal(view.props('TaskPage').task.id, 'task-1');
  assert.equal(dialog().open, false, 'a click never opens the edit');
  await view.act(() => view.props('TaskPage').onEdit());
  assert.equal(dialog().task.id, 'task-1');
  bffProject.on('patch', '/projects/{projectId}/tasks/{taskId}', ({ body }) => ({ body: f.projectTask({ ...body, id: 'task-1' }) }));
  await view.act(() => radioGroup('task-status').onChange('status-2'));
  await submitTask('Modifier une tâche');
  await view.waitFor(() => view.text().includes('Tâche mise à jour'));
  assert.equal(bffProject.calls('/projects/{projectId}/tasks/{taskId}', 'patch')[0].body.statusId, 'status-2');

  // The task page stays open after the save; its « … » « Supprimer la tâche » asks first.
  assert.equal(view.props('TaskPage').task.id, 'task-1');
  await view.act(() => view.props('TaskPage').onDelete());
  assert.match(view.text(), /Supprimer définitivement cette tâche \?/);
  assert.equal(bffProject.calls('/projects/{projectId}/tasks/{taskId}', 'delete').length, 0);
  bffProject.on('delete', '/projects/{projectId}/tasks/{taskId}', { status: 204 });
  await view.click((props, text, tag) => tag === 'button' && text === 'Supprimer' && props.role !== 'menuitem');
  await view.waitFor(() => view.text().includes('Tâche supprimée'));
  assert.equal(bffProject.calls('/projects/{projectId}/tasks/{taskId}', 'delete')[0].pathParams.taskId, 'task-1');
  assert.equal(view.find('TaskPage').length, 0, 'back to the board once the task is deleted');
});

test('MAIR-859 C6, C7: the list, its done checkbox, the search and the filters', async () => {
  await openTasks();
  await view.act(() => view.props('TaskToolbar').onViewChange('list'));
  assert.match(view.html, /<caption[^>]*>Tâches du projet<\/caption>/);
  bffProject.on('patch', '/projects/{projectId}/tasks/{taskId}/status', { body: f.projectTask({ status: 'done' }) });
  await view.fire((props) => props['aria-label'] === undefined && props.type === 'checkbox' && props.checked === false, 'onChange', { target: { checked: true } });
  await view.waitFor(() => bffProject.calls('/projects/{projectId}/tasks/{taskId}/status', 'patch').length === 1);
  await view.waitFor(() => view.text().includes('Tâche terminée'));

  await view.act(() => view.props('TaskToolbar').onSearchChange('voiries'));
  assert.deepEqual(view.props('TaskListView').items.map((item) => item.task.id), ['task-2']);
  await view.act(() => view.props('TaskToolbar').onSearchChange(''));
  await view.act(() => view.props('TaskToolbar').onPriorityChange('high'));
  assert.deepEqual(view.props('TaskListView').items.map((item) => item.task.id), ['task-2']);
  await view.act(() => view.props('TaskToolbar').onPriorityChange(''));
  await view.act(() => view.props('TaskToolbar').onAssigneeChange(f.people.alice.id));
  assert.ok(view.props('TaskListView').items.every((item) => item.task.assignees.some((person) => person.id === f.people.alice.id)));
});
