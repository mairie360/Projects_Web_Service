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
before(() => harness.start());
after(() => harness.stop());
beforeEach(() => { harness.reset(); harness.signIn(f.jwt(f.agents.marie.id)); harness.location.search = ''; });
afterEach(() => { view?.unmount(); view = undefined; assert.deepEqual(harness.violations(), []); });
const project = f.projectListItem();
const task = f.projectTask();
const other = f.projectTask({ id: 'task-2', title: 'Autre tâche reçue' });
const draft = { ...task, title: 'Brouillon envoyé' };
const route = operation => operation === 'status' ? '/projects/{projectId}/tasks/{taskId}/status' : '/projects/{projectId}/tasks/{taskId}';
const method = operation => operation === 'delete' ? 'delete' : 'patch';
const invoke = (props, operation, target = task) => operation === 'status'
  ? props.onUpdateTaskStatus(project.id, target.id, 'review')
  : operation === 'delete' ? props.onDeleteTask(project.id, target.id, target.title)
  : props.onUpdateTask(project.id, target.id, draft);
async function loaded() {
  harness.bffProject.on('get', '/projects-page', { body: f.projectsPage([project]) });
  harness.bffProject.on('get', '/projects/{projectId}', { body: f.projectDetails(project, [task, other]) });
  for (const operation of ['status', 'edit', 'delete']) harness.bffProject.on(method(operation), route(operation), operation === 'delete'
    ? { status: 204 } : { body: f.projectTask({ title: 'Confirmation reçue', status: 'review' }) });
  view = mount(React.createElement(Page));
  await view.waitFor(html => !html.includes('Chargement des projets'));
  await view.act(() => view.props('KanbanBoard').onProjectOpen(project));
}

for (const operation of ['status', 'delete', 'edit']) {
  for (const phase of ['write', 'read']) {
    test(`pending task ${operation} guards same-target repeats and conflicting commands during ${phase}`, async t => {
      await loaded();
      let release, held = 0;
      const gate = new Promise(resolve => { release = resolve; });
      const fetch = global.fetch;
      t.mock.method(global, 'fetch', async (input, init) => {
        const response = await fetch(input, init);
        const write = input === (operation === 'status' ? '/projects/project-1/tasks/task-1/status' : '/projects/project-1/tasks/task-1') && init?.method === method(operation).toUpperCase();
        if ((phase === 'write' && write) || (phase === 'read' && input === '/projects/project-1' && (init?.method ?? 'GET') === 'GET')) {
          ++held; await gate;
        }
        return response;
      });
      const props = view.props('ProjectDetailModal');
      const pending = [];
      try {
        await view.act(() => { pending.push(invoke(props, operation).catch(() => undefined)); });
        await view.waitFor(() => held > 0);
        await view.act(() => {
          for (const conflicting of ['status', 'delete', 'edit']) pending.push(invoke(props, conflicting).catch(() => undefined));
        });
        await view.settle();
        assert.equal(harness.bffProject.requests.filter(value => value.method !== 'GET').length, 1, 'the first operation owns the task through its follow-up reads');
        assert.equal(view.props('ProjectDetailModal').pendingTaskIds.has(task.id), true);
        assert.equal(view.props('ProjectDetailModal').pendingTaskIds.has(other.id), false);
        if (operation === 'delete' && phase === 'read') assert.match(view.text(), /Actualisation des tâches en cours…/);
      } finally {
        release(); await Promise.all(pending); await view.settle();
      }
      assert.equal(view.props('ProjectDetailModal').pendingTaskIds.size, 0);
    });
  }
}

for (const operation of ['status', 'delete', 'edit']) {
  test(`a refused task ${operation} releases the guard for an explicit retry`, async t => {
    await loaded();
    harness.bffProject.on(method(operation), route(operation), harness.errorReply(403, f.apiError('REFUSED', 'Action temporairement refusée')));
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    const fetch = global.fetch;
    let held = 0;
    t.mock.method(global, 'fetch', async (input, init) => {
      const response = await fetch(input, init);
      const browserPath = operation === 'status' ? '/projects/project-1/tasks/task-1/status' : '/projects/project-1/tasks/task-1';
      if (input === browserPath && init?.method === method(operation).toUpperCase()) { ++held; await gate; }
      return response;
    });
    const props = view.props('ProjectDetailModal');
    let first, repeated;
    try {
      await view.act(() => { first = invoke(props, operation).catch(() => undefined); });
      await view.waitFor(() => held > 0);
      await view.act(() => { repeated = invoke(props, operation).catch(() => undefined); });
      await view.settle();
      assert.equal(harness.bffProject.calls(route(operation), method(operation)).length, 1);
    } finally { release(); await Promise.all([first, repeated]); await view.settle(); }
    assert.equal(view.props('ProjectDetailModal').pendingTaskIds.size, 0);
    assert.equal(view.props('ProjectDetailModal').tasks[0].title, task.title);
    assert.equal(view.props('ProjectDetailModal').taskWriteErrors.get(task.id), 'Action temporairement refusée');
    assert.match(view.text(), /Action temporairement refusée/);
    harness.bffProject.on(method(operation), route(operation), operation === 'delete' ? { status: 204 } : { body: f.projectTask({ title: 'Retry confirmé' }) });
    harness.bffProject.on('get', '/projects/{projectId}', harness.errorReply(503, f.apiError('READ', 'Relecture refusée')));
    await view.act(() => invoke(view.props('ProjectDetailModal'), operation));
    assert.equal(harness.bffProject.calls(route(operation), method(operation)).length, 2);
    assert.equal(view.props('ProjectDetailModal').pendingTaskIds.size, 0);
    if (operation === 'delete') assert.equal(view.props('ProjectDetailModal').tasks.some(value => value.id === task.id), false);
    else assert.equal(view.props('ProjectDetailModal').tasks[0].title, 'Retry confirmé');
    assert.equal(view.props('ProjectDetailModal').refreshError, 'Relecture refusée');
    assert.equal(view.props('ProjectDetailModal').taskWriteErrors.has(task.id), false);
  });
}

test('different tasks remain independent while the first status confirmation is pending', async t => {
  await loaded();
  harness.bffProject.on('patch', '/projects/{projectId}/tasks/{taskId}/status', ({ pathParams }) => ({ body: f.projectTask({ id: pathParams.taskId, title: `Confirmation ${pathParams.taskId}`, status: 'review' }) }));
  let release, held = 0;
  const gate = new Promise(resolve => { release = resolve; });
  const fetch = global.fetch;
  t.mock.method(global, 'fetch', async (input, init) => {
    const response = await fetch(input, init);
    if (input === '/projects/project-1/tasks/task-1/status' && init?.method === 'PATCH') { ++held; await gate; }
    return response;
  });
  let first;
  try {
    await view.act(() => { first = invoke(view.props('ProjectDetailModal'), 'status'); });
    await view.waitFor(() => held > 0);
    await view.act(() => invoke(view.props('ProjectDetailModal'), 'status', other));
    assert.equal(harness.bffProject.calls('/projects/{projectId}/tasks/{taskId}/status', 'patch').length, 2);
    assert.equal(view.props('ProjectDetailModal').pendingTaskIds.has(task.id), true);
    assert.equal(view.props('ProjectDetailModal').pendingTaskIds.has(other.id), false);
  } finally { release(); await first; await view.settle(); }
  assert.equal(view.props('ProjectDetailModal').pendingTaskIds.size, 0);
});

test('closing and reopening a consultation retains the page-owned pending task guard', async t => {
  await loaded();
  let release, held = 0;
  const gate = new Promise(resolve => { release = resolve; });
  const fetch = global.fetch;
  t.mock.method(global, 'fetch', async (input, init) => {
    const response = await fetch(input, init);
    if (input === '/projects/project-1/tasks/task-1/status' && init?.method === 'PATCH') { ++held; await gate; }
    return response;
  });
  let pending;
  try {
    await view.act(() => { pending = invoke(view.props('ProjectDetailModal'), 'status'); });
    await view.waitFor(() => held > 0);
    await view.act(() => view.props('ProjectDetailModal').onClose());
    await view.act(() => view.props('KanbanBoard').onProjectOpen(project));
    assert.equal(view.props('ProjectDetailModal').pendingTaskIds.has(task.id), true);
    await view.act(() => invoke(view.props('ProjectDetailModal'), 'delete'));
    assert.equal(harness.bffProject.requests.filter(value => value.method !== 'GET').length, 1);
    await view.act(() => view.props('ProjectDetailModal').onClose());
  } finally { release(); await pending; await view.settle(); }
  assert.equal(view.find('ProjectDetailModal').length, 0);
});

test('the same task ID in another project does not share a pending guard', async t => {
  await loaded();
  const second = f.projectListItem({ id: 'project-2', title: 'Autre projet reçu' });
  harness.bffProject.on('get', '/projects-page', { body: f.projectsPage([project, second]) });
  harness.bffProject.on('get', '/projects/{projectId}', ({ pathParams }) => ({ body: f.projectDetails(pathParams.projectId === project.id ? project : second, [task, other]) }));
  let held = 0, release;
  const gate = new Promise(resolve => { release = resolve; });
  const fetch = global.fetch;
  t.mock.method(global, 'fetch', async (input, init) => {
    const response = await fetch(input, init);
    if (input === '/projects/project-1/tasks/task-1/status' && init?.method === 'PATCH') { ++held; await gate; }
    return response;
  });
  let first;
  try {
    await view.act(() => { first = invoke(view.props('ProjectDetailModal'), 'status'); });
    await view.waitFor(() => held > 0);
    await view.act(() => view.props('ProjectDetailModal').onUpdateTaskStatus(second.id, task.id, 'review'));
    const writes = harness.bffProject.calls('/projects/{projectId}/tasks/{taskId}/status', 'patch');
    assert.deepEqual(writes.map(value => value.url.pathname), ['/projects/project-1/tasks/task-1/status', '/projects/project-2/tasks/task-1/status']);
    await view.act(() => view.props('ProjectDetailModal').onClose());
    await view.act(() => view.props('KanbanBoard').onProjectOpen(second));
    assert.equal(view.props('ProjectDetailModal').project.id, second.id);
    assert.equal(view.props('ProjectDetailModal').pendingTaskIds.size, 0);
  } finally { release(); await first; await view.settle(); }
  assert.equal(view.props('ProjectDetailModal').project.id, second.id, 'finishing the first write cannot reopen its abandoned consultation');
});

test('a deliberate retry clears only its task refusal and preserves the other row error', async t => {
  await loaded();
  harness.bffProject.on('patch', '/projects/{projectId}/tasks/{taskId}/status', ({ pathParams }) => harness.errorReply(403, f.apiError('REFUSED', `Refus de ${pathParams.taskId}`)));
  await view.act(() => invoke(view.props('ProjectDetailModal'), 'status'));
  await view.act(() => invoke(view.props('ProjectDetailModal'), 'status', other));
  assert.deepEqual([...view.props('ProjectDetailModal').taskWriteErrors], [[task.id, `Refus de ${task.id}`], [other.id, `Refus de ${other.id}`]]);
  let release, held = 0;
  const gate = new Promise(resolve => { release = resolve; });
  const fetch = global.fetch;
  t.mock.method(global, 'fetch', async (input, init) => {
    const response = await fetch(input, init);
    if (input === '/projects/project-1/tasks/task-1/status' && init?.method === 'PATCH') { ++held; await gate; }
    return response;
  });
  harness.bffProject.on('patch', '/projects/{projectId}/tasks/{taskId}/status', { body: f.projectTask({ title: 'Retry confirmé' }) });
  harness.bffProject.on('get', '/projects/{projectId}', harness.errorReply(503, f.apiError('READ', 'Relecture refusée')));
  let pending;
  try {
    await view.act(() => { pending = invoke(view.props('ProjectDetailModal'), 'status'); });
    await view.waitFor(() => held > 0);
    assert.equal(view.props('ProjectDetailModal').taskWriteErrors.has(task.id), false);
    assert.equal(view.props('ProjectDetailModal').taskWriteErrors.get(other.id), `Refus de ${other.id}`);
  } finally { release(); await pending; await view.settle(); }
  assert.equal(view.props('ProjectDetailModal').taskWriteErrors.get(other.id), `Refus de ${other.id}`);
  assert.equal(harness.bffProject.requests.filter(value => value.method === 'PATCH').length, 3);
});
