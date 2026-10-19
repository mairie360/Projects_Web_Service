const assert = require('node:assert/strict');
const { test, before, after, beforeEach, afterEach } = require('node:test');
const { requireTs } = require('./support/typescript.cjs');
const { installReactRuntime, mount } = require('./support/server-view.cjs');
installReactRuntime();
const React = require('react');
const { createFrontHarness } = require('./support/front-harness.cjs');
const f = require('./support/bff-fixtures.cjs');
const Page = requireTs('src/app/projects-client.tsx').default;
const { ProjectWorkflow } = requireTs('src/components/project/ProjectWorkflow.tsx');
const { WorkflowWriteRefusedError } = requireTs('src/lib/projectWorkflow.ts');

// MAIR-570: the project workflow writes (task moves, status settings) share the controller's task write
// guards: one write per task, nothing on a task awaiting verification, no task write while statuses save.
const harness = createFrontHarness();
const { bffProject } = harness;
const project = f.projectListItem();
const task = f.projectTask();
let view;
const workspace = () => view.props('ProjectsWorkspace');
const writes = () => bffProject.requests.filter(request => request.method !== 'GET');
const signal = () => new AbortController().signal;
before(() => harness.start());
after(() => harness.stop());
beforeEach(() => {
  harness.reset(); harness.location.search = ''; harness.signIn(f.jwt(f.agents.marie.id));
  bffProject.on('get', '/projects-page', { body: f.projectsPage([project]) });
  bffProject.on('get', '/projects/{projectId}', { body: f.projectDetails(project, [task]) });
});
afterEach(() => { view?.unmount(); view = undefined; assert.deepEqual(harness.violations(), []); });

async function openSheet() {
  view = mount(React.createElement(Page));
  await view.waitFor(html => !html.includes('Chargement des projets'));
  await view.act(() => workspace().openProjectDetails(project));
  await view.waitFor(html => html.includes('Statuts des tâches du projet') && !html.includes('Chargement des statuts'));
}
// The mock server answers synchronously: hold the browser response of the first matching request instead.
function hold(t, method, pathPattern, template, reply) {
  bffProject.on(method, template, reply);
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  t.after(() => release());
  const fetch = global.fetch;
  let held = false;
  t.mock.method(global, 'fetch', async (input, init) => {
    const response = await fetch(input, init);
    if (!held && (init?.method ?? 'GET').toUpperCase() === method.toUpperCase() && pathPattern.test(String(input))) { held = true; await gate; }
    return response;
  });
  return () => release();
}
const revision = async () => (await workspace().workflowPort.readProject(project.id, signal())).revision;

test('MAIR-570: a workflow move is refused while the same task has a write in flight', async t => {
  await openSheet();
  const release = hold(t, 'patch', /\/tasks\/task-1\/status$/, '/projects/{projectId}/tasks/{taskId}/status', { body: f.projectTask({ status: 'done' }) });
  let listWrite;
  try {
    await view.act(() => { listWrite = workspace().changeProjectTaskStatus(project.id, task.id, 'done', 'status-4'); });
    await view.waitFor(() => writes().length === 1);
    await assert.rejects(workspace().moveWorkflowTask({ projectId: project.id, revision: 'any', taskId: task.id, statusId: 'status-2' }, signal()), WorkflowWriteRefusedError);
  } finally { release(); await listWrite; await view.settle(); }
  assert.deepEqual(writes().map(request => request.template), ['/projects/{projectId}/tasks/{taskId}/status']);
});

test('MAIR-570: no task write starts while the project statuses are being saved', async t => {
  await openSheet();
  const statuses = f.projectTaskStatuses();
  const release = hold(t, 'patch', /\/statuses\/status-1$/, '/projects/{projectId}/statuses/{statusId}', { body: { statuses: statuses.statuses.map(item => item.id === 'status-1' ? { ...item, name: 'Demandes' } : item) } });
  const snapshot = await workspace().workflowPort.readProject(project.id, signal());
  let save;
  try {
    await view.act(() => {
      save = workspace().saveWorkflowStatuses({ projectId: project.id, revision: snapshot.revision, statuses: snapshot.statuses.map(item => item.id === 'status-1' ? { ...item, name: 'Demandes' } : item), migrations: [] }, signal()).catch(error => error);
    });
    await view.waitFor(() => writes().length === 1);
    await view.act(() => workspace().changeProjectTaskStatus(project.id, task.id, 'done', 'status-4'));
    await assert.rejects(workspace().addProjectTask(project, { ...f.projectTask({ id: undefined }), title: 'Pendant le paramétrage', assignees: [f.people.marie], responsible: f.people.marie }), /statuts du projet sont en cours d’enregistrement/);
    await assert.rejects(workspace().moveWorkflowTask({ projectId: project.id, revision: snapshot.revision, taskId: task.id, statusId: 'status-2' }, signal()), WorkflowWriteRefusedError);
    assert.match(view.text(), /statuts du projet sont en cours d’enregistrement/);
  } finally { release(); await save; await view.settle(); }
  assert.deepEqual(writes().map(request => request.template), ['/projects/{projectId}/statuses/{statusId}']);
});

test('MAIR-570: statuses are not saved while a task write of the project is in flight', async t => {
  await openSheet();
  const release = hold(t, 'patch', /\/tasks\/task-1\/status$/, '/projects/{projectId}/tasks/{taskId}/status', { body: f.projectTask({ status: 'done' }) });
  let listWrite;
  try {
    await view.act(() => { listWrite = workspace().changeProjectTaskStatus(project.id, task.id, 'done', 'status-4'); });
    await view.waitFor(() => writes().length === 1);
    await assert.rejects(workspace().saveWorkflowStatuses({ projectId: project.id, revision: 'any', statuses: [], migrations: [] }, signal()), WorkflowWriteRefusedError);
  } finally { release(); await listWrite; await view.settle(); }
  assert.equal(writes().length, 1);
});

test('MAIR-570: a task awaiting verification cannot be moved from the workflow', async () => {
  await openSheet();
  // A receipt for another task leaves this one awaiting verification.
  bffProject.on('patch', '/projects/{projectId}/tasks/{taskId}/status', { body: f.projectTask({ id: 'task-other', status: 'done' }) });
  bffProject.on('get', '/projects/{projectId}', harness.errorReply(503, f.apiError('UNAVAILABLE', 'Relecture indisponible')));
  await view.act(() => workspace().changeProjectTaskStatus(project.id, task.id, 'done', 'status-4'));
  await view.waitFor(() => workspace().unverifiedTaskIds.has(task.id));

  await assert.rejects(workspace().moveWorkflowTask({ projectId: project.id, revision: 'any', taskId: task.id, statusId: 'status-2' }, signal()), WorkflowWriteRefusedError);
  assert.equal(writes().length, 1);
});

test('MAIR-570: a confirmed workflow move marks the task pending, then re-reads the sheet', async () => {
  await openSheet();
  let current = task;
  bffProject.on('get', '/projects/{projectId}', () => ({ body: f.projectDetails(project, [current]) }));
  bffProject.on('patch', '/projects/{projectId}/tasks/{taskId}/status', ({ body }) => { current = f.projectTask({ status: 'in-progress', statusId: body.statusId }); return { body: current }; });
  const detailReads = bffProject.calls('/projects/{projectId}', 'get').length;
  const draft = { projectId: project.id, revision: await revision(), taskId: task.id, statusId: 'status-2' };
  let move;
  await view.act(() => { move = workspace().moveWorkflowTask(draft, signal()); });
  assert.ok(workspace().pendingTaskIds.has(task.id), 'the task is shown pending during the move');
  const snapshot = await move;
  await view.settle();

  assert.equal(snapshot.tasks.find(item => item.id === task.id).statusId, 'status-2');
  assert.equal(workspace().pendingTaskIds.has(task.id), false);
  assert.ok(bffProject.calls('/projects/{projectId}', 'get').length > detailReads + 1, 'the controller re-reads the sheet after confirmation');
});

test('MAIR-570: a refused workflow write is shown without asking for a verification read', async () => {
  const statuses = [
    { id: 'status-1', name: 'Demandes reçues', color: '#1256a6', category: 'todo' },
    { id: 'status-2', name: 'Conseil municipal', color: '#4b908d', category: 'inprogress' },
  ];
  const snapshot = { projectId: 'project-1', revision: 'v1', statuses, tasks: [{ id: 'task-1', title: 'Préparer le conseil', statusId: 'status-1', canUpdateStatus: true }] };
  const port = { readProject: async () => snapshot, readTemplates: async () => [] };
  const onMoveTask = async () => { throw new WorkflowWriteRefusedError('Une opération est déjà en cours pour cette tâche. Réessayez après sa confirmation.'); };
  view = mount(React.createElement(ProjectWorkflow, { projectId: 'project-1', role: 'Responsable', port, onMoveTask, onSaveStatuses: async () => snapshot }));
  await view.waitFor(html => html.includes('Préparer le conseil'));
  await view.act(() => view.props('TaskStatusKanban').onStatusChange('task-1', 'status-2'));
  await view.waitFor(html => html.includes('Une opération est déjà en cours pour cette tâche.'));

  assert.doesNotMatch(view.text(), /n’a pas pu être vérifiée/);
  const settings = view.hostElements((_props, text, tag) => tag === 'button' && text === 'Paramétrer les statuts')[0];
  assert.equal(settings.props.disabled, false, 'a refusal is not an uncertain write');
});
