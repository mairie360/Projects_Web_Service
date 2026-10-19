const assert = require('node:assert/strict');
const { test, before, after, beforeEach, afterEach } = require('node:test');
const { requireTs } = require('./support/typescript.cjs');
const { installReactRuntime, mount } = require('./support/server-view.cjs');
installReactRuntime();
const React = require('react');
const { createFrontHarness } = require('./support/front-harness.cjs');
const f = require('./support/bff-fixtures.cjs');
const Page = requireTs('src/app/projects-client.tsx').default;
const { TaskComposer } = requireTs('src/components/project-card/TaskComposer.tsx');
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

test('MAIR-567: the card task form reads the project statuses alone', async () => {
  const calls = { statuses: 0, project: 0 };
  const statuses = [
    { id: 'status-a', name: 'Demandes reçues', color: '#1256a6', category: 'todo' },
    { id: 'status-b', name: 'Dossiers clos', color: '#267845', category: 'done' },
  ];
  const workflowPort = {
    readStatuses: async () => { calls.statuses += 1; return statuses; },
    readProject: async () => { calls.project += 1; throw new Error('not expected'); },
    readTemplates: async () => [],
  };
  view = mount(React.createElement(TaskComposer, { project, workflowPort, onAddTask: async () => {} }));
  await view.waitFor(html => html.includes('Ajouter une tâche'));
  await view.fire((_props, text, tag) => tag === 'button' && text.includes('Ajouter une tâche'), 'onClick', { stopPropagation() {} });
  await view.waitFor(() => view.hostElements((props, _text, tag) => tag === 'select' && props['aria-label'] === 'Statut' && props.value !== undefined).length > 0 && view.html.includes('Demandes reçues'));

  assert.deepEqual(calls, { statuses: 1, project: 0 });
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

test('MAIR-567: the detailed task list stays visible with project statuses', async () => {
  await openSheet();
  const toggle = view.hostElements((_props, text, tag) => tag === 'button' && text === 'Détails des tâches')[0];
  assert.equal(toggle.props['aria-expanded'], true);
  assert.ok(view.hostElements((_props, text, tag) => tag === 'button' && text.includes('Suivi')).length > 0, 'task follow-up is reachable');
});

test('MAIR-567: a task added from the sheet without a status choice takes the project status of its category', async () => {
  await openSheet();
  bffProject.on('post', '/projects/{projectId}/tasks', { status: 201, body: f.projectTask({ id: 'task-3', title: 'Poser les lanternes' }) });
  await view.fire((props, _text, tag) => tag === 'input' && props.placeholder === 'Ajouter une tâche...', 'onChange', { target: { value: 'Poser les lanternes' } });
  await view.act(() => view.find('MultiSelectField').find(x => x.props.id === 'detail-task-assignees').props.onChange(['user-3']));
  await view.fire((props, _text, tag) => tag === 'form' && props.className === 'space-y-3', 'onSubmit');
  await view.waitFor(() => bffProject.calls('/projects/{projectId}/tasks', 'post').length === 1);

  const [{ body }] = bffProject.calls('/projects/{projectId}/tasks', 'post');
  assert.equal(body.statusId, STATUS_OF_CATEGORY[body.status]);
  assert.doesNotMatch(view.text(), /Choisissez un statut du projet/);
});

test('MAIR-567: completing a task from the sheet moves it to the first "Terminé" project status', async () => {
  await openSheet();
  bffProject.on('patch', '/projects/{projectId}/tasks/{taskId}/status', { body: f.projectTask({ status: 'done' }) });
  await view.click(props => props['aria-label'] === 'Marquer Relevé des candélabres comme terminée');
  await view.waitFor(() => bffProject.calls('/projects/{projectId}/tasks/{taskId}/status', 'patch').length === 1);

  assert.deepEqual(bffProject.calls('/projects/{projectId}/tasks/{taskId}/status', 'patch')[0].body, { statusId: 'status-4' });
});
