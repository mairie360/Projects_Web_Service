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
let view;
const project = f.projectListItem();
const task = f.projectTask();
const other = f.projectTask({ id: 'task-2', title: 'Autre tâche officielle' });
before(() => harness.start());
after(() => harness.stop());
beforeEach(() => { harness.reset(); harness.signIn(f.jwt(f.agents.marie.id)); harness.location.search = ''; });
afterEach(() => { view?.unmount(); view = undefined; assert.deepEqual(harness.violations(), []); });
async function loaded(open = true) {
  harness.bffProject.on('get', '/projects-page', { body: f.projectsPage([project]) });
  harness.bffProject.on('get', '/projects/{projectId}', { body: f.projectDetails(project, [task, other]) });
  view = mount(React.createElement(Page));
  await view.waitFor(html => !html.includes('Chargement des projets'));
  if (open) await view.act(() => view.props('KanbanBoard').onProjectOpen(project));
}

for (const operation of ['status', 'edit']) {
  test(`an accepted ${operation} receipt for another ID preserves rows and requires GET verification without replay`, async () => {
    await loaded();
    const route = operation === 'status' ? '/projects/{projectId}/tasks/{taskId}/status' : '/projects/{projectId}/tasks/{taskId}';
    harness.bffProject.on('patch', route, { body: f.projectTask({ id: other.id, title: 'Ne doit pas remplacer cette ligne', status: 'done', completed: true }) });
    harness.bffProject.on('get', '/projects/{projectId}', harness.errorReply(503, f.apiError('READ', 'Vérification indisponible')));
    const props = view.props('ProjectDetailModal');
    await view.act(() => (operation === 'status'
      ? props.onUpdateTaskStatus(project.id, task.id, 'done')
      : props.onUpdateTask(project.id, task.id, { ...task, title: 'Brouillon envoyé' })).catch(() => undefined));
    assert.deepEqual(view.props('ProjectDetailModal').tasks.map(t => t.title), [task.title, other.title]);
    assert.equal(view.props('ProjectDetailModal').unverifiedTaskIds.has(task.id), true);
    assert.equal(view.props('ProjectDetailModal').unverifiedTaskIds.has(other.id), false);
    assert.match(view.props('ProjectDetailModal').taskWriteErrors.get(task.id), /acceptée.*confirmation.*incohérente/);
    assert.equal(view.props('ProjectDetailModal').refreshError, 'Vérification indisponible');
    assert.equal(harness.bffProject.calls('/projects/{projectId}', 'get').length, 2);
    await view.act(async () => {
      const current = view.props('ProjectDetailModal');
      await current.onUpdateTaskStatus(project.id, task.id, 'review');
      await current.onDeleteTask(project.id, task.id, task.title);
      await current.onUpdateTask(project.id, task.id, task).catch(() => undefined);
    });
    assert.equal(harness.bffProject.requests.filter(r => r.method !== 'GET').length, 1);
    const verified = f.projectTask({ title: 'Valeur vérifiée par lecture', status: 'done', completed: true });
    harness.bffProject.on('get', '/projects/{projectId}', { body: f.projectDetails(project, [verified, other]) });
    await view.act(() => view.props('ProjectDetailModal').onRetry());
    assert.equal(view.props('ProjectDetailModal').tasks[0].title, verified.title);
    assert.equal(view.props('ProjectDetailModal').tasks[1].title, other.title);
    assert.equal(view.props('ProjectDetailModal').unverifiedTaskIds.size, 0);
    assert.equal(view.props('ProjectDetailModal').taskWriteErrors.has(task.id), false);
    assert.equal(harness.bffProject.requests.filter(r => r.method !== 'GET').length, 1);
  });
}

for (const inconsistent of ['project', 'duplicate-task']) {
  test(`a ${inconsistent} detail read cannot replace a confirmed task or clear verification`, async () => {
    await loaded();
    harness.bffProject.on('patch', '/projects/{projectId}/tasks/{taskId}/status', { body: f.projectTask({ id: other.id, title: 'Confirmation incohérente' }) });
    const details = inconsistent === 'project'
      ? f.projectDetails({ ...project, id: 'project-2', title: 'Autre projet reçu' }, [task, other])
      : f.projectDetails(project, [task, f.projectTask({ id: task.id, title: 'ID répété' })]);
    harness.bffProject.on('get', '/projects/{projectId}', { body: details });
    await view.act(() => view.props('ProjectDetailModal').onUpdateTaskStatus(project.id, task.id, 'done'));
    assert.equal(view.props('ProjectDetailModal').project.id, project.id);
    assert.deepEqual(view.props('ProjectDetailModal').tasks.map(t => t.title), [task.title, other.title]);
    assert.equal(view.props('ProjectDetailModal').unverifiedTaskIds.has(task.id), true);
    assert.match(view.props('ProjectDetailModal').refreshError, /incohérent/);
    await view.act(() => view.props('ProjectDetailModal').onRetry());
    assert.equal(view.props('ProjectDetailModal').unverifiedTaskIds.has(task.id), true);
    assert.equal(harness.bffProject.requests.filter(r => r.method !== 'GET').length, 1);
    harness.bffProject.on('get', '/projects/{projectId}', { body: f.projectDetails(project, [task, other]) });
    await view.act(() => view.props('ProjectDetailModal').onRetry());
    assert.equal(view.props('ProjectDetailModal').unverifiedTaskIds.size, 0);
  });
  test(`opening a ${inconsistent} detail does not display the inconsistent result`, async () => {
    await loaded(false);
    harness.bffProject.on('get', '/projects/{projectId}', { body: inconsistent === 'project'
      ? f.projectDetails({ ...project, id: 'project-2', title: 'Autre projet reçu' }, [task, other])
      : f.projectDetails(project, [task, f.projectTask({ id: task.id, title: 'ID répété' })]) });
    await view.act(() => view.props('KanbanBoard').onProjectOpen(project));
    assert.equal(view.find('ProjectDetailModal').length, 0);
    assert.match(view.text(), /incohérent/);
    assert.doesNotMatch(view.text(), /Autre projet reçu|ID répété/);
  });
}

test('a coherent immediate verification replaces only read data and does not report a false edit confirmation', async () => {
  await loaded();
  harness.bffProject.on('patch', '/projects/{projectId}/tasks/{taskId}', { body: f.projectTask({ id: other.id, title: 'Mauvaise réception' }) });
  const verified = f.projectTask({ title: 'Titre officiel après lecture' });
  harness.bffProject.on('get', '/projects/{projectId}', { body: f.projectDetails(project, [verified, other]) });
  await view.act(() => view.props('ProjectDetailModal').onUpdateTask(project.id, task.id, { ...task, title: 'Brouillon envoyé' }));
  assert.deepEqual(view.props('ProjectDetailModal').tasks.map(t => t.title), [verified.title, other.title]);
  assert.equal(view.props('ProjectDetailModal').unverifiedTaskIds.size, 0);
  assert.match(view.text(), /fiche a été vérifiée par lecture/);
  assert.doesNotMatch(view.text(), /Mauvaise réception|Tâche .*modifiée/);
  assert.equal(harness.bffProject.requests.filter(r => r.method !== 'GET').length, 1);
});

test('a detail GET started before an uncertain confirmation cannot unlock that task', async t => {
  await loaded();
  let release, held = 0;
  const gate = new Promise(resolve => { release = resolve; });
  const fetch = global.fetch;
  t.mock.method(global, 'fetch', async (input, init) => {
    const response = await fetch(input, init);
    if (input === '/projects/project-1' && !held) { ++held; await gate; }
    return response;
  });
  let pending;
  try {
    await view.act(() => { pending = view.props('ProjectDetailModal').onRetry(); });
    await view.waitFor(() => held > 0);
    harness.bffProject.on('patch', '/projects/{projectId}/tasks/{taskId}/status', { body: other });
    harness.bffProject.on('get', '/projects/{projectId}', harness.errorReply(503, f.apiError('READ', 'Vérification récente refusée')));
    await view.act(() => view.props('ProjectDetailModal').onUpdateTaskStatus(project.id, task.id, 'done'));
  } finally { release(); await pending; await view.settle(); }
  assert.equal(view.props('ProjectDetailModal').unverifiedTaskIds.has(task.id), true);
  assert.equal(view.props('ProjectDetailModal').refreshError, 'Vérification récente refusée');
  assert.deepEqual(view.props('ProjectDetailModal').tasks.map(t => t.title), [task.title, other.title]);
  assert.equal(harness.bffProject.requests.filter(r => r.method !== 'GET').length, 1);
});

test('closing and reopening does not bypass uncertainty; only its coherent project read clears it', async () => {
  await loaded();
  harness.bffProject.on('patch', '/projects/{projectId}/tasks/{taskId}/status', { body: other });
  harness.bffProject.on('get', '/projects/{projectId}', harness.errorReply(503, f.apiError('READ', 'Vérification refusée')));
  await view.act(() => view.props('ProjectDetailModal').onUpdateTaskStatus(project.id, task.id, 'done'));
  await view.act(() => view.props('ProjectDetailModal').onClose());
  harness.bffProject.on('get', '/projects/{projectId}', { body: f.projectDetails({ ...project, id: 'project-2' }, [task, other]) });
  await view.act(() => view.props('KanbanBoard').onProjectOpen(project));
  assert.equal(view.find('ProjectDetailModal').length, 0);
  harness.bffProject.on('get', '/projects/{projectId}', { body: f.projectDetails(project, [task, other]) });
  await view.act(() => view.props('KanbanBoard').onProjectOpen(project));
  assert.equal(view.props('ProjectDetailModal').unverifiedTaskIds.size, 0);
  assert.equal(view.props('ProjectDetailModal').taskWriteErrors.has(task.id), false);
  assert.equal(harness.bffProject.requests.filter(r => r.method !== 'GET').length, 1);
});
