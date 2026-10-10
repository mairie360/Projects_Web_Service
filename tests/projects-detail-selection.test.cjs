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
const first = f.projectListItem();
const second = f.projectListItem({ id: 'project-2', title: 'Projet actuellement choisi' });
let view;
before(() => harness.start());
after(() => harness.stop());
beforeEach(() => {
  harness.reset(); harness.location.search = ''; harness.signIn(f.jwt(f.agents.marie.id));
  bffProject.on('get', '/projects-page', { body: f.projectsPage([first, second]) });
  bffProject.on('get', '/projects/{projectId}', ({ pathParams }) => ({
    body: f.projectDetails(pathParams.projectId === first.id ? first : second),
  }));
});
afterEach(() => { view?.unmount(); view = undefined; assert.deepEqual(harness.violations(), []); });
async function loaded() {
  view = mount(React.createElement(Page));
  await view.waitFor(html => !html.includes('Chargement des projets'));
}
function gateNextDetail(t, projectId) {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  t.after(() => release());
  const fetch = global.fetch;
  let held = false;
  t.mock.method(global, 'fetch', async (input, init) => {
    const response = await fetch(input, init);
    if (!held && input === `/api/bff/projects/${projectId}` && (init?.method ?? 'GET') === 'GET') {
      held = true; await gate;
    }
    return response;
  });
  return async () => {
    release();
    // Flush the detached deep-link promise too; settle alone only waits for
    // renders already scheduled before the held fetch resumes.
    await new Promise(resolve => setImmediate(resolve));
  };
}
const detailCalls = () => bffProject.calls('/projects/{projectId}', 'get');

for (const obsoleteFailure of [false, true]) {
  test(`a slower previous project selection cannot replace the latest detail or publish its error (${obsoleteFailure ? 'refused' : 'success'})`, async t => {
    await loaded();
    if (obsoleteFailure) bffProject.on('get', '/projects/{projectId}', ({ pathParams }) => pathParams.projectId === first.id
      ? harness.errorReply(503, f.apiError('OLD_READ', 'Erreur du projet abandonné'))
      : { body: f.projectDetails(second) });
    const release = gateNextDetail(t, first.id);
    let previous;
    await view.act(() => { previous = view.props('KanbanBoard').onProjectOpen(first); });
    await view.waitFor(() => detailCalls().length === 1);
    await view.act(() => view.props('KanbanBoard').onProjectOpen(second));
    assert.equal(view.props('ProjectDetailModal').project.id, second.id);
    await release(); await previous; await view.settle();
    assert.equal(view.props('ProjectDetailModal').project.id, second.id);
    assert.doesNotMatch(view.text(), /Erreur du projet abandonné/);
    assert.equal(detailCalls().length, 2);
    assert.equal(bffProject.requests.filter(request => request.method !== 'GET').length, 0);
  });
}

for (const nextSelection of ['closed', 'other', 'same-reopened']) {
  test(`a detail refresh after a confirmed task write respects ${nextSelection} selection`, async t => {
    await loaded();
    await view.act(() => view.props('KanbanBoard').onProjectOpen(first));
    bffProject.on('patch', '/projects/{projectId}/tasks/{taskId}/status', { body: f.projectTask({ status: 'done' }) });
    const release = gateNextDetail(t, first.id);
    let pending;
    await view.act(() => { pending = view.props('ProjectDetailModal').onUpdateTaskStatus(first.id, 'task-1', 'done'); });
    await view.waitFor(() => detailCalls().length === 2);
    await view.act(() => view.props('ProjectDetailModal').onClose());
    if (nextSelection !== 'closed') {
      const next = nextSelection === 'other' ? second : { ...first, title: 'Fiche réouverte actuelle' };
      bffProject.on('get', '/projects/{projectId}', { body: f.projectDetails(next) });
      await view.act(() => view.props('KanbanBoard').onProjectOpen(next));
    }
    await release(); await pending; await view.settle();
    if (nextSelection === 'closed') assert.equal(view.find('ProjectDetailModal').length, 0, 'a closed detail must not reopen');
    else assert.equal(view.props('ProjectDetailModal').project.title, nextSelection === 'other' ? second.title : 'Fiche réouverte actuelle');
    assert.equal(bffProject.calls('/projects/{projectId}/tasks/{taskId}/status', 'patch').length, 1);
  });
}

test('a late task deep link cannot replace a project chosen manually meanwhile', async t => {
  harness.location.search = `?project=${first.id}&task=task-1`;
  const release = gateNextDetail(t, first.id);
  await loaded();
  await view.waitFor(() => detailCalls().length === 1);
  await view.act(() => view.props('KanbanBoard').onProjectOpen(second));
  await release();
  await view.settle();
  assert.equal(view.props('ProjectDetailModal').project.id, second.id);
  assert.equal(view.props('ProjectDetailModal').highlightTaskId, null);
  assert.equal(bffProject.requests.filter(request => request.method !== 'GET').length, 0);
});

for (const nextSelection of ['closed', 'other', 'same-reopened', 'unchanged']) {
  test(`a confirmed lifecycle write respects ${nextSelection} detail lifetime without replay`, async t => {
    await loaded();
    await view.act(() => view.props('KanbanBoard').onProjectOpen(first));
    const confirmed = { ...first, title: 'Clôture confirmée', status: 'done', statusLabel: 'Terminé' };
    bffProject.on('patch', '/projects/{projectId}/close', { body: f.projectDetails(confirmed) });
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    t.after(() => release());
    const fetch = global.fetch;
    t.mock.method(global, 'fetch', async (input, init) => {
      const response = await fetch(input, init);
      if (input === `/api/bff/projects/${first.id}/close`) await gate;
      return response;
    });
    let pending;
    await view.act(() => { pending = view.props('ProjectDetailModal').onCloseProject(first.id, 'done'); });
    await view.waitFor(() => bffProject.calls('/projects/{projectId}/close', 'patch').length === 1);
    if (nextSelection !== 'unchanged') await view.act(() => view.props('ProjectDetailModal').onClose());
    if (nextSelection === 'other' || nextSelection === 'same-reopened') {
      const next = nextSelection === 'other' ? second : { ...first, title: 'Nouvelle consultation du même projet' };
      bffProject.on('get', '/projects/{projectId}', { body: f.projectDetails(next) });
      await view.act(() => view.props('KanbanBoard').onProjectOpen(next));
    }
    release(); await pending; await view.settle();
    if (nextSelection === 'closed') assert.equal(view.find('ProjectDetailModal').length, 0);
    else assert.equal(view.props('ProjectDetailModal').project.title, nextSelection === 'unchanged'
      ? confirmed.title : nextSelection === 'other' ? second.title : 'Nouvelle consultation du même projet');
    assert.equal(bffProject.calls('/projects/{projectId}/close', 'patch').length, 1);
  });
}

test('the latest detail refusal remains visible and can be recovered without an obsolete success reopening another project', async t => {
  await loaded();
  bffProject.on('get', '/projects/{projectId}', ({ pathParams }) => pathParams.projectId === second.id
    ? harness.errorReply(503, f.apiError('CURRENT_READ', 'Fiche actuelle indisponible'))
    : { body: f.projectDetails(first) });
  const release = gateNextDetail(t, first.id);
  let old;
  await view.act(() => { old = view.props('KanbanBoard').onProjectOpen(first); });
  await view.waitFor(() => detailCalls().length === 1);
  await view.act(() => view.props('KanbanBoard').onProjectOpen(second));
  await release(); await old; await view.settle();
  assert.equal(view.find('ProjectDetailModal').length, 0);
  assert.match(view.text(), /Fiche actuelle indisponible/);
  bffProject.on('get', '/projects/{projectId}', { body: f.projectDetails(second) });
  await view.act(() => view.props('KanbanBoard').onProjectOpen(second));
  assert.equal(view.props('ProjectDetailModal').project.id, second.id);
  assert.equal(bffProject.requests.filter(request => request.method !== 'GET').length, 0);
});

test('a confirmed current-project update satisfies an opening in flight instead of cancelling its selection', async t => {
  await loaded();
  const release = gateNextDetail(t, first.id);
  let opening;
  await view.act(() => { opening = view.props('KanbanBoard').onProjectOpen(first); });
  await view.waitFor(() => detailCalls().length === 1);
  const confirmed = { ...first, title: 'Détail confirmé courant', status: 'review' };
  bffProject.on('patch', '/projects/{projectId}', { body: f.projectDetails(confirmed) });
  await view.act(() => view.props('KanbanBoard').onMoveProject(first, 'review'));
  await release(); await opening; await view.settle();
  assert.equal(view.props('ProjectDetailModal').project.title, confirmed.title);
  assert.equal(bffProject.calls('/projects/{projectId}', 'patch').length, 1);
});
