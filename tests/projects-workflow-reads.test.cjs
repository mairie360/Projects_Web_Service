const assert = require('node:assert/strict');
const { test, before, after, beforeEach, afterEach } = require('node:test');
const { requireTs } = require('./support/typescript.cjs');
const { installReactRuntime, mount } = require('./support/server-view.cjs');
installReactRuntime();
const React = require('react');
const { createFrontHarness } = require('./support/front-harness.cjs');
const f = require('./support/bff-fixtures.cjs');
const Page = requireTs('src/app/projects-client.tsx').default;
const { createPublishedProjectWorkflowPort } = requireTs('src/lib/publishedProjectWorkflow.ts');

// MAIR-567 reads stay minimal (MAIR-526): the detail already loaded by the project sheet is not read
// again for its statuses, and a task form that only chooses a status reads the statuses alone.
const harness = createFrontHarness();
const { bffProject } = harness;
const project = f.projectListItem();
let view;
before(() => harness.start());
after(() => harness.stop());
beforeEach(() => {
  harness.reset(); harness.location.search = ''; harness.signIn(f.jwt(f.agents.marie.id));
  bffProject.on('get', '/projects-page', { body: f.projectsPage([project]) });
  bffProject.on('get', '/projects/{projectId}', { body: f.projectDetails(project) });
});
afterEach(() => { view?.unmount(); view = undefined; assert.deepEqual(harness.violations(), []); });

test('MAIR-567: opening a project reads its detail once, then its statuses and archived tasks once', async () => {
  view = mount(React.createElement(Page));
  await view.waitFor(html => !html.includes('Chargement des projets'));
  await view.act(() => view.props('KanbanBoard').onProjectOpen(project));
  await view.waitFor(html => html.includes('Statuts des tâches du projet') && !html.includes('Chargement des statuts'));
  await view.settle();

  assert.equal(bffProject.calls('/projects/{projectId}', 'get').length, 1, 'the project detail is not read twice');
  assert.equal(bffProject.calls('/projects/{projectId}/statuses', 'get').length, 1);
  assert.equal(bffProject.calls('/projects/{projectId}/archived-tasks', 'get').length, 1);
  assert.doesNotMatch(view.text(), /n’a pas pu être vérifiée/);
});

test('MAIR-567: the published port reuses loaded tasks but write checks read the current detail', async () => {
  const requests = [];
  const statusesBody = f.projectTaskStatuses();
  const operations = {
    getProjectsProjectIdStatuses: async (id) => { requests.push(`statuses ${id}`); return { data: statusesBody }; },
    getProjectsProjectId: async (id) => { requests.push(`detail ${id}`); return { data: f.projectDetails(project) }; },
    getProjectsProjectIdArchivedTasks: async (id) => { requests.push(`archived ${id}`); return { data: f.archivedTasks() }; },
  };
  const port = createPublishedProjectWorkflowPort(operations);
  const signal = new AbortController().signal;
  const loaded = f.projectDetails(project).taskItems;

  const reused = await port.readProject(project.id, signal, { tasks: loaded });
  assert.deepEqual(requests.splice(0), [`statuses ${project.id}`, `archived ${project.id}`]);
  assert.deepEqual(reused.tasks.map(task => task.id), loaded.map(task => task.id));

  await port.readProject(project.id, signal);
  assert.deepEqual(requests.splice(0).sort(), [`archived ${project.id}`, `detail ${project.id}`, `statuses ${project.id}`]);

  assert.deepEqual((await port.readStatuses(project.id, signal)).map(status => status.id), statusesBody.statuses.map(status => status.id));
  assert.deepEqual(requests.splice(0), [`statuses ${project.id}`]);
});

// With project statuses the sheet keeps its existing behaviour (MAIR-567): detailed task list visible,
// a new task defaults to a project status of its form category, and completing a task uses a "Terminé" status.
const STATUS_OF_CATEGORY = { todo: 'status-1', 'in-progress': 'status-2', review: 'status-2', done: 'status-4' };
async function openSheet() {
  view = mount(React.createElement(Page));
  await view.waitFor(html => !html.includes('Chargement des projets'));
  await view.act(() => view.props('KanbanBoard').onProjectOpen(project));
  await view.waitFor(html => html.includes('Statuts des tâches du projet') && !html.includes('Chargement des statuts'));
}

test('MAIR-567 / MAIR-859: the board groups the tasks by the category of their project status', async () => {
  await openSheet();
  const items = view.props('TaskBoard').items;
  assert.deepEqual(items.map(item => [item.task.id, item.column]), [['task-1', 'todo'], ['task-2', 'done']]);
  assert.equal(view.props('ProjectTasksTab').unavailableColumns.size, 0);
});

test('MAIR-567: a task added from the sheet without a status choice takes the project status of its category', async () => {
  await openSheet();
  bffProject.on('post', '/projects/{projectId}/tasks', { status: 201, body: f.projectTask({ id: 'task-3', title: 'Poser les lanternes' }) });
  await view.click((_props, text, tag) => tag === 'button' && text === 'Nouvelle tâche');
  await view.fire((props) => props.id === 'task-sheet-title', 'onChange', { target: { value: 'Poser les lanternes' } });
  await view.act(() => view.find('MultiSelect').find(x => x.props.id === 'task-sheet-assignees').props.onChange(['user-3']));
  await view.fire((props, _text, tag) => tag === 'form' && props['aria-label'] === 'Créer une tâche', 'onSubmit');
  await view.waitFor(() => bffProject.calls('/projects/{projectId}/tasks', 'post').length === 1);

  const [{ body }] = bffProject.calls('/projects/{projectId}/tasks', 'post');
  assert.equal(body.statusId, STATUS_OF_CATEGORY[body.status]);
  assert.doesNotMatch(view.text(), /Choisissez un statut du projet/);
});

test('MAIR-567: completing a task on the board moves it to the first "Terminé" project status', async () => {
  await openSheet();
  bffProject.on('patch', '/projects/{projectId}/tasks/{taskId}/status', { body: f.projectTask({ status: 'done' }) });
  const task = view.props('TaskBoard').items.find(item => item.task.id === 'task-1').task;
  await view.act(() => view.props('TaskBoard').onMoveTask(task, 'done'));
  await view.waitFor(() => bffProject.calls('/projects/{projectId}/tasks/{taskId}/status', 'patch').length === 1);

  assert.deepEqual(bffProject.calls('/projects/{projectId}/tasks/{taskId}/status', 'patch')[0].body, { statusId: 'status-4' });
});
