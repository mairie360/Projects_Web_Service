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
const { bffProject } = harness;
let view;
before(() => harness.start());
after(() => harness.stop());
beforeEach(() => { harness.reset(); harness.location.search = ''; harness.signIn(f.jwt(f.agents.marie.id)); });
afterEach(() => { view?.unmount(); view = undefined; assert.deepEqual(harness.violations(), []); });
const project = f.projectListItem();
const task = f.projectTask();
const other = f.projectTask({ id: 'task-2', title: 'Autre tâche reçue' });
const draft = { ...task, title: 'Brouillon envoyé' };
const normalized = value => ({ ...value, dueDate: value.dueDate.slice(0, 10), createdAt: value.createdAt.slice(0, 10), updatedAt: value.updatedAt?.slice(0, 10) });
async function loaded() {
  bffProject.on('get', '/projects-page', { body: f.projectsPage([project]) });
  bffProject.on('get', '/projects/{projectId}', { body: f.projectDetails(project, [task, other]) });
  view = mount(React.createElement(Page));
  await view.waitFor(html => !html.includes('Chargement des projets'));
  await view.act(() => view.props('KanbanBoard').onProjectOpen(project));
}

for (const operation of ['create', 'edit', 'status', 'delete']) {
  test(`a confirmed task ${operation} survives refused detail reads and GET-only recovery`, async () => {
    await loaded();
    const confirmed = f.projectTask({ id: operation === 'create' ? 'task-confirmed' : task.id,
      title: 'Titre canonique reçu', status: 'done', statusLabel: 'Terminé', completed: true,
      permissions: { ...task.permissions, canDelete: false } });
    const method = operation === 'create' ? 'post' : operation === 'delete' ? 'delete' : 'patch';
    const route = operation === 'create' ? '/projects/{projectId}/tasks'
      : operation === 'status' ? '/projects/{projectId}/tasks/{taskId}/status' : '/projects/{projectId}/tasks/{taskId}';
    bffProject.on(method, route, operation === 'delete' ? { status: 204 }
      : { status: operation === 'create' ? 201 : 200, body: confirmed });
    bffProject.on('get', '/projects/{projectId}', harness.errorReply(503, f.apiError('DETAIL_READ', 'Fiche temporairement indisponible')));
    await view.act(() => {
      const p = view.props('ProjectDetailModal');
      return operation === 'create' ? p.onAddTask(project, draft)
        : operation === 'edit' ? p.onUpdateTask(project.id, task.id, draft)
        : operation === 'status' ? p.onUpdateTaskStatus(project.id, task.id, 'done')
        : p.onDeleteTask(project.id, task.id, task.title);
    });
    const current = view.props('ProjectDetailModal');
    if (operation === 'delete') assert.equal(current.tasks.some(value => value.id === task.id), false, 'confirmed DELETE must remove the target');
    else assert.deepEqual(current.tasks.find(value => value.id === confirmed.id), normalized(confirmed), 'only the actual normalized response becomes visible');
    assert.equal(current.tasks.find(value => value.id === other.id).title, other.title);
    assert.deepEqual(current.project.tasks, project.tasks, 'partial task receipts must not invent server counters');
    assert.equal(current.project.progress, project.progress);
    assert.doesNotMatch(view.html, /aria-label="Supprimer Titre canonique reçu"/, 'received task permissions still govern its actions');
    assert.match(view.text(), /Actualisation impossible/);
    assert.match(view.html, /Réessayer la fiche/);
    const expected = operation === 'delete' ? [other] : operation === 'create' ? [task, other, confirmed] : [confirmed, other];
    const refreshedProject = { ...project, tasks: { total: expected.length, completed: operation === 'delete' ? 0 : 1 }, progress: 37 };
    bffProject.on('get', '/projects/{projectId}', { body: f.projectDetails(refreshedProject, expected) });
    bffProject.on('get', '/projects-page', { body: f.projectsPage([{ ...refreshedProject, taskItems: expected }]) });
    await view.click('Réessayer la fiche');
    await view.waitFor(html => !html.includes('Fiche temporairement indisponible'));
    assert.deepEqual(view.props('ProjectDetailModal').tasks, expected.map(normalized));
    assert.deepEqual(view.props('ProjectDetailModal').project.tasks, refreshedProject.tasks);
    assert.equal(view.props('ProjectDetailModal').project.progress, 37);
    assert.equal(bffProject.calls(route, method).length, 1, 'recovery must not repeat the accepted write');
    assert.equal(bffProject.requests.filter(value => value.method !== 'GET').length, 1);
  });
}

test('an older task refresh cannot erase a newer independent-task confirmation or its recovery error', async t => {
  await loaded();
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  t.after(() => release());
  const fetch = global.fetch;
  let held = false;
  t.mock.method(global, 'fetch', async (input, init) => {
    const response = await fetch(input, init);
    if (!held && input === '/projects/project-1' && (init?.method ?? 'GET') === 'GET') { held = true; await gate; }
    return response;
  });
  const first = f.projectTask({ title: 'Première confirmation', status: 'done' });
  bffProject.on('patch', '/projects/{projectId}/tasks/{taskId}/status', { body: first });
  bffProject.on('get', '/projects/{projectId}', { body: f.projectDetails(project, [first, other]) });
  let pending;
  await view.act(() => { pending = view.props('ProjectDetailModal').onUpdateTaskStatus(project.id, task.id, 'done'); });
  await view.waitFor(() => bffProject.calls('/projects/{projectId}', 'get').length === 2);
  const current = f.projectTask({ id: other.id, title: 'Dernière confirmation', status: 'review' });
  bffProject.on('patch', '/projects/{projectId}/tasks/{taskId}/status', { body: current });
  bffProject.on('get', '/projects/{projectId}', harness.errorReply(503, f.apiError('LATEST_READ', 'Dernière relecture refusée')));
  await view.act(() => view.props('ProjectDetailModal').onUpdateTaskStatus(project.id, other.id, 'review'));
  release(); await pending; await view.settle();
  assert.equal(view.props('ProjectDetailModal').tasks.find(value => value.id === other.id).title, current.title);
  assert.equal(view.props('ProjectDetailModal').tasks.find(value => value.id === task.id).title, first.title);
  assert.equal(view.props('KanbanBoard').projects[0].taskItems.find(value => value.id === other.id).title, current.title);
  assert.equal(view.props('ProjectDetailModal').refreshError, 'Dernière relecture refusée');
  assert.equal(bffProject.calls('/projects/{projectId}/tasks/{taskId}/status', 'patch').length, 2);
});

test('detail recovery is guarded while pending and a late retry cannot reopen a closed consultation', async t => {
  await loaded();
  const confirmed = f.projectTask({ id: 'task-confirmed', title: 'Tâche officielle ajoutée' });
  bffProject.on('post', '/projects/{projectId}/tasks', { status: 201, body: confirmed });
  bffProject.on('get', '/projects/{projectId}', harness.errorReply(503, f.apiError('READ', 'Reprise nécessaire')));
  await view.act(() => view.props('ProjectDetailModal').onAddTask(project, draft));
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  t.after(() => release());
  const fetch = global.fetch;
  t.mock.method(global, 'fetch', async (input, init) => {
    const response = await fetch(input, init);
    if (input === '/projects/project-1' && (init?.method ?? 'GET') === 'GET') await gate;
    return response;
  });
  bffProject.on('get', '/projects/{projectId}', { body: f.projectDetails(project, [task, other, confirmed]) });
  const before = bffProject.calls('/projects/{projectId}', 'get').length;
  let retry;
  await view.act(() => {
    const props = view.props('ProjectDetailModal');
    retry = props.onRetry();
    void props.onRetry();
  });
  await view.waitFor(() => bffProject.calls('/projects/{projectId}', 'get').length === before + 1);
  assert.equal(view.props('ProjectDetailModal').refreshPending, true);
  await view.act(() => view.props('ProjectDetailModal').onClose());
  release(); await retry; await view.settle();
  assert.equal(view.find('ProjectDetailModal').length, 0);
  assert.equal(bffProject.calls('/projects/{projectId}/tasks', 'post').length, 1);
});

for (const operation of ['create', 'edit', 'status', 'delete']) {
  test(`a refused task ${operation} leaves all official task rows and counters unchanged`, async () => {
    await loaded();
    const before = structuredClone(view.props('ProjectDetailModal').tasks);
    const method = operation === 'create' ? 'post' : operation === 'delete' ? 'delete' : 'patch';
    const route = operation === 'create' ? '/projects/{projectId}/tasks'
      : operation === 'status' ? '/projects/{projectId}/tasks/{taskId}/status' : '/projects/{projectId}/tasks/{taskId}';
    bffProject.on(method, route, harness.errorReply(403, f.apiError('REFUSED', 'Écriture refusée')));
    let refused;
    await view.act(() => {
      const p = view.props('ProjectDetailModal');
      const pending = operation === 'create' ? p.onAddTask(project, draft)
        : operation === 'edit' ? p.onUpdateTask(project.id, task.id, draft)
        : operation === 'status' ? p.onUpdateTaskStatus(project.id, task.id, 'done')
        : p.onDeleteTask(project.id, task.id, task.title);
      refused = pending.catch(() => undefined);
    });
    await refused; await view.settle();
    assert.deepEqual(view.props('ProjectDetailModal').tasks, before);
    assert.deepEqual(view.props('ProjectDetailModal').project.tasks, project.tasks);
    assert.equal(bffProject.calls('/projects/{projectId}', 'get').length, 1);
    assert.equal(view.props('ProjectDetailModal').refreshError, '');
    assert.match(view.text(), /Écriture refusée/);
  });
}

for (const oldStatus of [200, 503, 401, 403]) {
  test(`an opening respects an old ${oldStatus} response after a task confirmation, without replaying authentication decisions`, async t => {
    await loaded();
    await view.act(() => view.props('ProjectDetailModal').onClose());
    const confirmed = f.projectTask({ id: 'task-new', title: 'Nouvelle tâche réellement reçue' });
    bffProject.on('post', '/projects/{projectId}/tasks', { status: 201, body: confirmed });
    let releaseWrite, releaseRead;
    const writeGate = new Promise(resolve => { releaseWrite = resolve; });
    const readGate = new Promise(resolve => { releaseRead = resolve; });
    t.after(() => { releaseWrite(); releaseRead(); });
    const fetch = global.fetch;
    let heldRead = false;
    t.mock.method(global, 'fetch', async (input, init) => {
      const response = await fetch(input, init);
      if (input === '/projects/project-1/tasks' && init?.method === 'POST') await writeGate;
      if (!heldRead && input === '/projects/project-1' && (init?.method ?? 'GET') === 'GET') { heldRead = true; await readGate; }
      return response;
    });
    let creating, opening;
    await view.act(() => { creating = view.props('KanbanBoard').onProjectTaskAdd(project, draft); });
    await view.waitFor(() => bffProject.calls('/projects/{projectId}/tasks', 'post').length === 1);
    if (oldStatus !== 200) bffProject.on('get', '/projects/{projectId}', harness.errorReply(oldStatus, f.apiError('OLD_READ', 'Ancienne fiche refusée')));
    await view.act(() => { opening = view.props('KanbanBoard').onProjectOpen(project); });
    await view.waitFor(() => bffProject.calls('/projects/{projectId}', 'get').length === 2);
    bffProject.on('get', '/projects/{projectId}', { body: f.projectDetails(project, [task, other, confirmed]) });
    releaseWrite(); await creating; await view.settle();
    releaseRead(); await opening; await view.settle();
    if (oldStatus === 401 || oldStatus === 403) {
      assert.equal(view.find('ProjectDetailModal').length, 0);
      assert.equal(bffProject.calls('/projects/{projectId}', 'get').length, 3, 'session/permission decisions must not cause an automatic replacement read');
      assert.equal(harness.location.reloads, oldStatus === 401 ? 1 : 0);
      assert.equal(harness.browserCalls.filter(value => value.path === '/api/auth/logout').length, oldStatus === 401 ? 1 : 0);
    } else {
      assert.equal(view.props('ProjectDetailModal').tasks.find(value => value.id === confirmed.id).title, confirmed.title);
      assert.doesNotMatch(view.text(), /Ancienne fiche refusée/);
      assert.equal(bffProject.calls('/projects/{projectId}', 'get').length, 4, 'one fresh opening GET replaces the stale response; the write is not replayed');
    }
    assert.equal(bffProject.calls('/projects/{projectId}/tasks', 'post').length, 1);
  });
}
