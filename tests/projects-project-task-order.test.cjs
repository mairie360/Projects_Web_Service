const assert = require('node:assert/strict');
const { test, before, after, beforeEach, afterEach } = require('node:test');
const { requireTs } = require('./support/typescript.cjs');
const { installReactRuntime, mount } = require('./support/server-view.cjs');
installReactRuntime();
const React = require('react');
const { createFrontHarness } = require('./support/front-harness.cjs');
const f = require('./support/bff-fixtures.cjs');
const { projectToFormState } = requireTs('src/lib/projectPageState.ts');
const { taskConfirmationsAfter, reconcileTaskConfirmations } = requireTs('src/lib/projectTaskConfirmations.ts');
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

async function loaded() {
  harness.bffProject.on('get', '/projects-page', { body: f.projectsPage([project]) });
  harness.bffProject.on('get', '/projects/{projectId}', { body: f.projectDetails(project, [task, other]) });
  view = mount(React.createElement(Page));
  await view.waitFor(html => !html.includes('Chargement des projets'));
  await view.act(() => view.props('KanbanBoard').onProjectOpen(project));
}

async function startProjectWrite(operation) {
  const form = { ...projectToFormState(project), title: 'Projet demandé' };
  const props = view.props('ProjectDetailModal');
  if (operation === 'inline') return props.onUpdateProject(project.id, form);
  if (operation === 'card') return view.props('CreateProjectModal').onSubmit({ preventDefault() {} });
  if (operation === 'move') return view.props('KanbanBoard').onMoveProject(project, 'review');
  return props.onCloseProject(project.id, operation);
}

for (const projectOperation of ['inline', 'card', 'move', 'done', 'review']) {
  for (const taskOperation of ['status', 'edit', 'create', 'delete']) {
    for (const successfulRead of [false, true]) {
      test(`late project ${projectOperation} keeps newer task ${taskOperation} after detail GET ${successfulRead ? '200' : '503'}`, async t => {
        await loaded();
        const route = ['done', 'review'].includes(projectOperation) ? '/projects/{projectId}/close' : '/projects/{projectId}';
        const method = 'patch';
        const confirmedProject = f.projectListItem({ title: 'Projet officiellement confirmé', status: 'review', priority: 'low', progress: 17,
          tasks: { total: 9, completed: 2 }, permissions: { ...project.permissions, canDuplicate: false } });
        harness.bffProject.on(method, route, { body: f.projectDetails(confirmedProject, [task, other]) });
        let release, held = 0, pending;
        const gate = new Promise(resolve => { release = resolve; });
        const fetch = global.fetch;
        t.mock.method(global, 'fetch', async (input, init) => {
          const response = await fetch(input, init);
          if (input === `/projects/project-1${['done', 'review'].includes(projectOperation) ? '/close' : ''}` && init?.method === method.toUpperCase()) { ++held; await gate; }
          return response;
        });
        // A card opens by GET before its write; let that opening complete normally.
        if (projectOperation === 'card') {
          await view.act(() => view.props('KanbanBoard').onProjectEdit(project));
          await view.act(() => view.props('CreateProjectModal').onChange({ ...projectToFormState(project), title: 'Projet demandé' }));
        }
        const confirmed = f.projectTask({ id: taskOperation === 'create' ? 'task-new' : task.id, title: 'Tâche récemment confirmée', status: 'done' });
        // A successful detail GET may refine the receipt. The late project must
        // retain this official read too, not merely restore an earlier receipt.
        const verified = { ...confirmed, title: 'Tâche enrichie par lecture', labels: ['officiel'] };
        const expected = taskOperation === 'delete' ? [other] : taskOperation === 'create'
          ? [task, other, successfulRead ? verified : confirmed] : [successfulRead ? verified : confirmed, other];
        try {
          await view.act(() => {
            pending = projectOperation === 'card'
              ? view.props('CreateProjectModal').onSubmit({ preventDefault() {} })
              : startProjectWrite(projectOperation);
          });
          await view.waitFor(() => held > 0);
          harness.bffProject.on('get', '/projects-page', harness.errorReply(503, f.apiError('PAGE', 'Liste refusée')));
          harness.bffProject.on('get', '/projects/{projectId}', successfulRead
            ? { body: f.projectDetails(project, expected) }
            : harness.errorReply(503, f.apiError('READ', 'Détail refusé')));
          const props = view.props('ProjectDetailModal');
          if (taskOperation === 'delete') {
            harness.bffProject.on('delete', '/projects/{projectId}/tasks/{taskId}', { status: 204 });
            await view.act(() => props.onDeleteTask(project.id, task.id, task.title));
          } else if (taskOperation === 'create') {
            harness.bffProject.on('post', '/projects/{projectId}/tasks', { status: 201, body: confirmed });
            await view.act(() => props.onAddTask(project, { ...task, title: 'Tâche demandée' }));
          } else {
            harness.bffProject.on('patch', taskOperation === 'status' ? '/projects/{projectId}/tasks/{taskId}/status' : '/projects/{projectId}/tasks/{taskId}', { body: confirmed });
            await view.act(() => taskOperation === 'status'
              ? props.onUpdateTaskStatus(project.id, task.id, 'done')
              : props.onUpdateTask(project.id, task.id, { ...task, title: 'Tâche demandée' }));
          }
          assert.deepEqual(view.props('ProjectDetailModal').tasks.map(t => t.title), expected.map(t => t.title));
          release(); await pending; await view.settle();
          const selected = view.props('ProjectDetailModal');
          assert.deepEqual(selected.tasks.map(t => t.title), expected.map(t => t.title));
          assert.equal(selected.project.title, confirmedProject.title);
          assert.equal(selected.project.status, confirmedProject.status);
          assert.equal(selected.project.priority, confirmedProject.priority);
          assert.deepEqual(selected.project.permissions, confirmedProject.permissions);
          assert.deepEqual(selected.project.tasks, confirmedProject.tasks);
          assert.equal(selected.project.progress, 17);
          assert.ok(selected.refreshError, 'mixed-age task/project data requires GET-only recovery');
          const card = view.props('KanbanBoard').projects.find(p => p.id === project.id);
          assert.deepEqual(card.taskItems.map(t => t.title), expected.map(t => t.title));
          assert.equal(harness.bffProject.requests.filter(r => r.method !== 'GET').length, 2);
          harness.bffProject.on('get', '/projects/{projectId}', { body: f.projectDetails({ ...confirmedProject, tasks: { total: expected.length, completed: 1 }, progress: 38 }, expected) });
          await view.act(() => view.props('ProjectDetailModal').onRetry());
          assert.equal(view.props('ProjectDetailModal').refreshError, '');
          assert.equal(view.props('ProjectDetailModal').project.progress, 38);
          assert.equal(harness.bffProject.requests.filter(r => r.method !== 'GET').length, 2);
        } finally { release(); await pending; await view.settle(); }
      });
    }
  }
}

test('a project write begun after the task confirmation remains authoritative', async () => {
  await loaded();
  harness.bffProject.on('patch', '/projects/{projectId}/tasks/{taskId}/status', { body: f.projectTask({ title: 'Confirmation antérieure', status: 'done' }) });
  harness.bffProject.on('get', '/projects/{projectId}', harness.errorReply(503, f.apiError('READ', 'Détail refusé')));
  await view.act(() => view.props('ProjectDetailModal').onUpdateTaskStatus(project.id, task.id, 'done'));
  const latest = f.projectTask({ title: 'Tâche de la modification projet ultérieure', status: 'review' });
  harness.bffProject.on('patch', '/projects/{projectId}', { body: f.projectDetails(project, [latest, other]) });
  harness.bffProject.on('get', '/projects-page', harness.errorReply(503, f.apiError('PAGE', 'Liste refusée')));
  await view.act(() => startProjectWrite('inline'));
  assert.equal(view.props('ProjectDetailModal').tasks[0].title, latest.title);
  harness.bffProject.on('get', '/projects-page', { body: f.projectsPage([project]) });
  await view.act(() => view.props('ProjectsWorkspace').retryProjectsPage());
  assert.equal(view.props('KanbanBoard').projects[0].taskItems, undefined, 'an old task overlay cannot survive a later authoritative project write');
  assert.equal(harness.bffProject.requests.filter(r => r.method !== 'GET').length, 2);
});

test('only newer confirmed revisions are retained and coherent reads can refine or remove them', () => {
  const history = new Map([[task.id, { revision: 2, task }], [other.id, { revision: 3, task: null }]]);
  assert.deepEqual([...taskConfirmationsAfter(history, 2)], [[other.id, null]]);
  assert.equal(taskConfirmationsAfter(undefined, 0).size, 0);
  const refined = { ...task, title: 'Lecture officielle enrichie' };
  const reconciled = reconcileTaskConfirmations(history, [refined]);
  assert.equal(reconciled.get(task.id).task, refined);
  assert.equal(reconciled.get(task.id).revision, 2);
  assert.equal(reconciled.get(other.id).task, null);
  assert.equal(history.get(task.id).task, task, 'prior history remains immutable');
  assert.equal(reconcileTaskConfirmations(history, []).get(task.id).task, null);
});

for (const operation of ['create', 'duplicate']) {
  test(`a ${operation} project does not inherit confirmations from its source's task IDs`, async t => {
    await loaded();
    const copy = f.projectListItem({ id: 'project-copy', title: 'Projet distinct confirmé' });
    const path = operation === 'create' ? '/projects' : '/projects/project-1/duplicate';
    harness.bffProject.on('post', operation === 'create' ? '/projects' : '/projects/{projectId}/duplicate', { status: 201, body: f.projectDetails(copy, [task, other]) });
    if (operation === 'create') {
      await view.act(() => view.props('ProjectsWorkspace').openCreateProject());
      await view.act(() => view.props('CreateProjectModal').onChange(projectToFormState(project)));
    }
    let release, held = 0, pending;
    const gate = new Promise(resolve => { release = resolve; });
    const fetch = global.fetch;
    t.mock.method(global, 'fetch', async (input, init) => {
      const response = await fetch(input, init);
      if (input === path && init?.method === 'POST') { ++held; await gate; }
      return response;
    });
    try {
      await view.act(() => { pending = operation === 'create'
        ? view.props('CreateProjectModal').onSubmit({ preventDefault() {} })
        : view.props('KanbanBoard').onProjectDuplicate(project); });
      await view.waitFor(() => held > 0);
      harness.bffProject.on('get', '/projects/{projectId}', harness.errorReply(503, f.apiError('READ', 'Détail refusé')));
      harness.bffProject.on('get', '/projects-page', harness.errorReply(503, f.apiError('PAGE', 'Liste refusée')));
      harness.bffProject.on('patch', '/projects/{projectId}/tasks/{taskId}/status', { body: f.projectTask({ title: 'Confirmation du projet source', status: 'done' }) });
      await view.act(() => view.props('ProjectDetailModal').onUpdateTaskStatus(project.id, task.id, 'done'));
      release(); await pending; await view.settle();
      const copied = view.props('KanbanBoard').projects.find(p => p.id === copy.id);
      assert.deepEqual(copied.taskItems.map(t => t.title), [task.title, other.title]);
      assert.equal(harness.bffProject.requests.filter(r => r.method !== 'GET').length, 2);
    } finally { release(); await pending; await view.settle(); }
  });
}

for (const reopen of [false, true]) {
  test(`a late project response cannot reopen or replace an abandoned task consultation (reopen: ${reopen})`, async t => {
    await loaded();
    harness.bffProject.on('patch', '/projects/{projectId}/close', { body: f.projectDetails({ ...project, title: 'Ancienne consultation' }, [task, other]) });
    let release, held = 0, pending;
    const gate = new Promise(resolve => { release = resolve; });
    const fetch = global.fetch;
    t.mock.method(global, 'fetch', async (input, init) => {
      const response = await fetch(input, init);
      if (input === '/projects/project-1/close' && init?.method === 'PATCH') { ++held; await gate; }
      return response;
    });
    try {
      await view.act(() => { pending = view.props('ProjectDetailModal').onCloseProject(project.id, 'review'); });
      await view.waitFor(() => held > 0);
      harness.bffProject.on('patch', '/projects/{projectId}/tasks/{taskId}/status', { body: f.projectTask({ title: 'Tâche confirmée', status: 'done' }) });
      harness.bffProject.on('get', '/projects/{projectId}', harness.errorReply(503, f.apiError('READ', 'Détail refusé')));
      harness.bffProject.on('get', '/projects-page', harness.errorReply(503, f.apiError('PAGE', 'Liste refusée')));
      await view.act(() => view.props('ProjectDetailModal').onUpdateTaskStatus(project.id, task.id, 'done'));
      await view.act(() => view.props('ProjectDetailModal').onClose());
      if (reopen) {
        harness.bffProject.on('get', '/projects/{projectId}', { body: f.projectDetails({ ...project, title: 'Nouvelle consultation' }, [f.projectTask({ title: 'Tâche de la nouvelle consultation' }), other]) });
        await view.act(() => view.props('KanbanBoard').onProjectOpen(project));
      }
      release(); await pending; await view.settle();
      if (reopen) {
        assert.equal(view.props('ProjectDetailModal').project.title, 'Nouvelle consultation');
        assert.equal(view.props('ProjectDetailModal').tasks[0].title, 'Tâche de la nouvelle consultation');
        assert.equal(view.props('ProjectDetailModal').refreshError, '');
      } else assert.equal(view.find('ProjectDetailModal').length, 0);
      assert.equal(harness.bffProject.requests.filter(r => r.method !== 'GET').length, 2);
    } finally { release(); await pending; await view.settle(); }
  });
}
