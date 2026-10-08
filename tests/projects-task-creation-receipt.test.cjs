const assert = require('node:assert/strict');
const { test, before, after, beforeEach, afterEach } = require('node:test');
const { requireTs } = require('./support/typescript.cjs');
const { installReactRuntime, mount } = require('./support/server-view.cjs');
installReactRuntime();
const React = require('react');
const { createFrontHarness } = require('./support/front-harness.cjs');
const f = require('./support/bff-fixtures.cjs');
const Page = requireTs('src/app/page.tsx').default;
const harness = createFrontHarness();
const project = f.projectListItem(), other = f.projectListItem({ id: 'project-2', title: 'Autre projet' });
const original = f.projectTask(), draft = { ...original, title: 'Nouvelle tâche à conserver' };
let view;
before(() => harness.start());
after(() => harness.stop());
beforeEach(() => { harness.reset(); harness.signIn(f.jwt(f.agents.marie.id)); harness.location.search = ''; });
afterEach(() => { view?.unmount(); view = undefined; assert.deepEqual(harness.violations(), []); });
const workspace = () => view.props('ProjectsWorkspace');
const writes = () => harness.bffProject.requests.filter(request => request.method !== 'GET');
async function loaded(open = true) {
  harness.bffProject.on('get', '/projects-page', { body: f.projectsPage([project, other]) });
  harness.bffProject.on('get', '/projects/{projectId}', ({ pathParams }) => ({ body: f.projectDetails(pathParams.projectId === project.id ? project : other, [original]) }));
  view = mount(React.createElement(Page));
  await view.waitFor(html => !html.includes('Chargement des projets'));
  if (open) await view.act(() => workspace().openProjectDetails(project));
}
async function collide(id = original.id) {
  harness.bffProject.on('post', '/projects/{projectId}/tasks', { status: 201, body: f.projectTask({ id, title: 'Reçu à ne pas appliquer' }) });
  await view.act(() => assert.rejects(workspace().addProjectTask(project, draft), /identité de la nouvelle tâche n’est pas vérifiable/));
}

for (const id of [original.id, ' ']) test(`accepted creation with ID ${JSON.stringify(id)} preserves existing rows and blocks only new tasks`, async () => {
  await loaded();
  const before = structuredClone(view.props('ProjectDetailModal').tasks);
  const rows = structuredClone(workspace().projects);
  const reads = harness.bffProject.requests.length;
  await collide(id);
  assert.deepEqual(view.props('ProjectDetailModal').tasks, before);
  assert.deepEqual(workspace().projects, rows);
  assert.equal(workspace().taskCreationStates.get(project.id).uncertainTitle, draft.title);
  assert.equal(workspace().taskCreationStates.get(project.id).pending, false);
  assert.equal(workspace().unverifiedTaskIds.size, 0, 'the colliding existing task is not locked');
  assert.doesNotMatch(view.text(), /Reçu à ne pas appliquer/);
  await view.act(() => assert.rejects(workspace().addProjectTask(project, draft), /identité/));
  assert.equal(harness.bffProject.requests.length, reads + 1, 'no automatic GET or replay');
  assert.equal(writes().length, 1);
});

test('known task IDs remain guarded after their project detail is no longer selected and a later read removes the task', async () => {
  await loaded();
  harness.bffProject.on('get', '/projects/{projectId}', { body: f.projectDetails(project, []) });
  await view.act(() => workspace().openProjectDetails(project));
  assert.equal(view.props('ProjectDetailModal').tasks.length, 0);
  await view.act(() => workspace().closeProjectDetails());
  await collide();
  assert.equal(workspace().taskCreationStates.has(project.id), true);
  assert.equal(view.find('ProjectDetailModal').length, 0);
});

for (const mode of ['kanban', 'grid', 'table']) test(`${mode}: closing or changing view does not replay an accepted uncertain creation`, async () => {
  await loaded(); await collide();
  await view.act(() => workspace().closeProjectDetails());
  await view.act(() => workspace().setViewMode(mode));
  await view.waitFor(() => !workspace().pageLoading);
  assert.match(view.text(), /Création de tâche non vérifiée/);
  await view.act(() => workspace().openProjectDetails(project));
  const add = view.hostElements((props, text, tag) => tag === 'button' && text === 'Ajouter la tâche');
  assert.equal(add.length, 1); assert.equal(add[0].props.disabled, true);
  assert.equal(view.props('ProjectDetailModal').taskCreationState.uncertainTitle, draft.title);
  await view.act(() => assert.rejects(view.props('ProjectDetailModal').onAddTask(project, draft), /identité/));
  assert.equal(writes().length, 1);
});

test('inspection refusals and foreign or repeated-task details preserve rows and accepted-create uncertainty', async () => {
  await loaded(); await collide();
  const before = structuredClone(view.props('ProjectDetailModal').tasks);
  for (const reply of [harness.errorReply(503, f.apiError('READ', 'Inspection indisponible')), { body: f.projectDetails(other, [original]) }, { body: f.projectDetails(project, [original, original]) }]) {
    harness.bffProject.on('get', '/projects/{projectId}', reply);
    await view.act(() => workspace().inspectTaskCreation(project.id));
    assert.equal(!!workspace().taskCreationStates.get(project.id).inspectionError, true);
    assert.deepEqual(view.props('ProjectDetailModal').tasks, before);
    assert.equal(workspace().taskCreationStates.get(project.id).uncertainTitle, draft.title);
  }
  assert.equal(writes().length, 1);
});

test('coherent inspection updates received data but cannot identify the accepted create by a matching title', async () => {
  await loaded(); await collide();
  const unrelated = f.projectTask({ id: 'unrelated-new-id', title: draft.title });
  harness.bffProject.on('get', '/projects/{projectId}', { body: f.projectDetails(project, [original, unrelated]) });
  await view.act(() => workspace().inspectTaskCreation(project.id));
  assert.equal(view.props('ProjectDetailModal').tasks.length, 2);
  assert.match(workspace().taskCreationStates.get(project.id).inspectionMessage, /reste non vérifiée/);
  await view.act(() => assert.rejects(workspace().addProjectTask(project, draft), /identité/));
  assert.equal(writes().length, 1);
});

test('existing tasks and another project remain independently writable after uncertain creation', async () => {
  await loaded(); await collide();
  const updated = f.projectTask({ title: 'Modification de la tâche existante confirmée' });
  harness.bffProject.on('patch', '/projects/{projectId}/tasks/{taskId}', { body: updated });
  harness.bffProject.on('get', '/projects/{projectId}', { body: f.projectDetails(project, [updated]) });
  await view.act(() => workspace().updateProjectTask(project.id, original.id, { ...draft, title: updated.title }));
  assert.equal(view.props('ProjectDetailModal').tasks[0].title, updated.title);
  harness.bffProject.on('post', '/projects/{projectId}/tasks', { status: 201, body: f.projectTask({ id: 'task-new-other', title: 'Tâche de l’autre projet' }) });
  harness.bffProject.on('get', '/projects/{projectId}', () => ({ body: f.projectDetails(other,
    harness.bffProject.requests.some(r => r.method === 'POST' && r.path === '/projects/project-2/tasks')
      ? [f.projectTask({ id: 'task-new-other' })] : [original]) }));
  await view.act(() => workspace().addProjectTask(other, draft));
  assert.equal(workspace().taskCreationStates.get(other.id).uncertainTitle, undefined);
  assert.equal(workspace().taskCreationStates.get(project.id).uncertainTitle, draft.title);
  assert.equal(writes().length, 3);
});

test('same-project concurrent creation rejects skipped callbacks and retains the draft without a second POST', async t => {
  await loaded();
  const gate = Promise.withResolvers(), ready = Promise.withResolvers();
  const fetch = global.fetch; let pending;
  harness.bffProject.on('post', '/projects/{projectId}/tasks', { status: 201, body: f.projectTask({ id: 'new-real-id' }) });
  t.mock.method(global, 'fetch', async (...args) => {
    const response = await fetch(...args);
    if (args[0] === `/projects/${project.id}/tasks` && args[1]?.method === 'POST') { ready.resolve(); await gate.promise; }
    return response;
  });
  try {
    await view.act(() => { pending = workspace().addProjectTask(project, draft); }); await ready.promise;
    assert.equal(view.props('ProjectDetailModal').taskCreationState.pending, true);
    await view.act(() => assert.rejects(workspace().addProjectTask(project, draft), /déjà en cours/));
    assert.equal(writes().length, 1);
    gate.resolve(); await pending; await view.settle();
    assert.equal(workspace().taskCreationStates.get(project.id).pending, false);
    assert.equal(workspace().taskCreationStates.get(project.id).uncertainTitle, undefined);
  } finally { gate.resolve(); await pending; await view.settle(); }
});

test('an intervening coherent detail GET may observe a new ID before its valid creation receipt', async t => {
  await loaded();
  const created = f.projectTask({ id: 'new-observed-during-post', title: 'Création réellement distincte' });
  const gate = Promise.withResolvers(), ready = Promise.withResolvers(); const fetch = global.fetch; let pending;
  harness.bffProject.on('post', '/projects/{projectId}/tasks', { status: 201, body: created });
  harness.bffProject.on('get', '/projects/{projectId}', { body: f.projectDetails(project, [original, created]) });
  t.mock.method(global, 'fetch', async (...args) => {
    const response = await fetch(...args);
    if (args[0] === `/projects/${project.id}/tasks` && args[1]?.method === 'POST') { ready.resolve(); await gate.promise; }
    return response;
  });
  try {
    await view.act(() => { pending = workspace().addProjectTask(project, draft); }); await ready.promise;
    await view.act(() => workspace().openProjectDetails(project));
    gate.resolve(); await pending; await view.settle();
    assert.equal(workspace().taskCreationStates.get(project.id).uncertainTitle, undefined);
    assert.equal(view.props('ProjectDetailModal').tasks.find(task => task.id === created.id).title, created.title);
    assert.equal(writes().length, 1);
  } finally { gate.resolve(); await pending; await view.settle(); }
});

test('inspection is single-flight and cannot reopen a closed or different project detail', async t => {
  await loaded(); await collide();
  const gate = Promise.withResolvers(), ready = Promise.withResolvers(); const fetch = global.fetch; let pending;
  t.mock.method(global, 'fetch', async (...args) => {
    const response = await fetch(...args);
    if (args[0] === `/projects/${project.id}`) { ready.resolve(); await gate.promise; }
    return response;
  });
  const before = harness.bffProject.requests.length;
  try {
    await view.act(() => { pending = workspace().inspectTaskCreation(project.id); }); await ready.promise;
    await view.act(() => workspace().inspectTaskCreation(project.id));
    assert.equal(harness.bffProject.requests.length, before + 1);
    await view.act(() => workspace().closeProjectDetails());
    await view.act(() => workspace().openProjectDetails(other));
    gate.resolve(); await pending; await view.settle();
    assert.equal(view.props('ProjectDetailModal').project.id, other.id);
    assert.equal(workspace().taskCreationStates.get(project.id).uncertainTitle, draft.title);
    assert.equal(writes().length, 1);
  } finally { gate.resolve(); await pending; await view.settle(); }
});

test('the uncertain task draft keeps subsequent field edits across detail closure and a view remount', async () => {
  await loaded(); await collide();
  const retained = { title: 'Dernière saisie à conserver', priority: 'low', status: 'review', dueDate: '2026-11-17', labels: ['énergie'], assignees: ['1'] };
  await view.act(() => workspace().preserveUncertainTaskDraft(project.id, retained));
  await view.act(() => workspace().closeProjectDetails());
  await view.act(() => workspace().setViewMode('grid'));
  await view.waitFor(() => !workspace().pageLoading);
  await view.act(() => workspace().openProjectDetails(project));
  assert.deepEqual(view.props('ProjectDetailModal').taskCreationState.draft, retained);
  const input = view.hostElements(props => props['aria-label'] === 'Titre de la tâche');
  assert.equal(input[0].props.value, retained.title);
  assert.equal(writes().length, 1);
});

test('a creation ID confirmed earlier stays protected even when its task later disappears from GET', async () => {
  await loaded();
  const created = f.projectTask({ id: 'new-history-id', title: 'Création distincte confirmée' });
  harness.bffProject.on('post', '/projects/{projectId}/tasks', { status: 201, body: created });
  await view.act(() => workspace().addProjectTask(project, draft));
  assert.equal(workspace().taskCreationStates.get(project.id).uncertainTitle, undefined);
  await collide(created.id);
  assert.equal(workspace().taskCreationStates.get(project.id).uncertainTitle, draft.title);
  assert.equal(writes().length, 2);
});

test('a never-opened card reads a coherent task baseline before sending its POST and rejects an existing receipt ID', async () => {
  await loaded(false); await collide();
  assert.deepEqual(harness.bffProject.requests.map(({ method, path }) => [method, path]), [
    ['GET', '/projects-page'], ['GET', '/projects/project-1'], ['POST', '/projects/project-1/tasks'],
  ]);
  assert.equal(workspace().taskCreationStates.get(project.id).uncertainTitle, draft.title);
  assert.equal(view.find('ProjectDetailModal').length, 0);
});

for (const failure of ['refused', 'foreign', 'repeated']) test(`a never-opened card ${failure} baseline retains the draft and does not send any creation`, async () => {
  await loaded(false);
  harness.bffProject.on('get', '/projects/{projectId}', failure === 'refused'
    ? harness.errorReply(503, f.apiError('READ', 'Baseline indisponible'))
    : { body: f.projectDetails(failure === 'foreign' ? other : project, failure === 'repeated' ? [original, original] : [original]) });
  await view.act(() => assert.rejects(workspace().addProjectTask(project, draft), /Baseline indisponible|identifiants/));
  assert.equal(writes().length, 0);
  assert.equal(workspace().taskCreationStates.get(project.id).uncertainTitle, undefined, 'no POST was accepted');
  assert.equal(workspace().taskCreationStates.get(project.id).pending, false);
  harness.bffProject.on('get', '/projects/{projectId}', { body: f.projectDetails(project, [original]) });
  await collide();
  assert.equal(writes().length, 1, 'only an explicit retry after a coherent baseline writes');
});
