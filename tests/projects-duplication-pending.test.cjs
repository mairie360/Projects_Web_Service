const assert = require('node:assert/strict');
const { test, before, after, beforeEach, afterEach } = require('node:test');
const { requireTs } = require('./support/typescript.cjs');
const { installReactRuntime, mount } = require('./support/server-view.cjs');
installReactRuntime();
const React = require('react');
const { createFrontHarness } = require('./support/front-harness.cjs');
const fixtures = require('./support/bff-fixtures.cjs');
const Page = requireTs('src/app/page.tsx').default;
const harness = createFrontHarness();
let view;
before(() => harness.start());
after(() => harness.stop());
beforeEach(() => { harness.reset(); harness.signIn(fixtures.jwt(fixtures.agents.marie.id)); });
afterEach(() => { view?.unmount(); view = undefined; assert.deepEqual(harness.violations(), []); });
const duplicatePath = '/projects/{projectId}/duplicate';
const copy = fixtures.projectDetails(fixtures.projectListItem({ id: 'copy-1', title: 'Copie confirmée' }));
const refused = () => harness.errorReply(403, fixtures.apiError('FORBIDDEN', 'Duplication refusée'));
async function open(mode = 'kanban', page = fixtures.projectsPage()) {
  harness.bffProject.on('get', '/projects-page', { body: page });
  view = mount(React.createElement(Page));
  await view.waitFor((html) => !html.includes('Chargement des projets'));
  if (mode !== 'kanban') await view.click(mode === 'grid' ? 'Grille' : 'Tableau');
}
function props(mode = 'kanban') { return view.props({ kanban: 'KanbanBoard', grid: 'GridView', table: 'TableView' }[mode]); }
function pause(method, path) {
  const original = global.fetch;
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  let initiated = 0;
  global.fetch = async (input, init) => {
    if ((init?.method ?? 'GET') === method && typeof input === 'string' && path(input)) { initiated++; await gate; }
    return original(input, init);
  };
  return { release, initiated: () => initiated, restore: () => { global.fetch = original; } };
}

for (const mode of ['kanban', 'grid', 'table']) {
  test(`${mode}: duplicate events send one POST; pending action is announced and refusal unlocks retry`, async () => {
    await open(mode);
    harness.bffProject.on('post', duplicatePath, refused());
    const pending = pause('POST', (path) => path.endsWith('/duplicate'));
    const writes = [];
    try {
      const initial = props(mode);
      const project = initial.projects[0];
      writes.push(initial.onProjectDuplicate(project));
      writes.push(initial.onProjectDuplicate(project));
      await view.settle();
      assert.equal(pending.initiated(), 1, 'synchronous guard must precede the disabled render');
      await view.fire((p) => p['aria-label'] === `Actions pour ${project.title}`, 'onClick');
      assert.equal(view.hostElements((p, text, tag) => tag === 'button' && p.role === 'menuitem' && text === 'Dupliquer' && p.disabled).length, 1);
      assert.match(view.html, /role="status"[^>]*>Duplication du projet/);
      assert.match(view.html, /aria-busy="true"/);
      pending.release();
      await Promise.all(writes);
      await view.settle();
      assert.equal(harness.bffProject.calls(duplicatePath, 'post').length, 1);
      assert.match(view.text(), /Duplication refusée/);
      assert.equal(view.hostElements((p, text, tag) => tag === 'button' && p.role === 'menuitem' && text === 'Dupliquer' && !p.disabled).length, 1);
      assert.equal(props(mode).projects[0].id, project.id);
      harness.bffProject.on('post', duplicatePath, { status: 201, body: copy });
      await view.act(() => props(mode).onProjectDuplicate(project));
      assert.equal(harness.bffProject.calls(duplicatePath, 'post').length, 2);
      assert.doesNotMatch(view.text(), /Duplication du projet/);
      assert.match(view.text(), /Copie confirmée.*dupliqué/);
    } finally {
      pending.release(); await Promise.allSettled(writes); pending.restore();
    }
  });
}

test('guard remains active during the follow-up GET and across a view change', async () => {
  await open();
  harness.bffProject.on('post', duplicatePath, { status: 201, body: copy });
  const pendingRead = pause('GET', (path) => path.startsWith('/api/bff/projects-page'));
  const writes = [];
  try {
    const project = props().projects[0];
    writes.push(props().onProjectDuplicate(project));
    await view.waitFor(() => pendingRead.initiated() > 0);
    await view.click('Grille');
    writes.push(props('grid').onProjectDuplicate(project));
    await view.settle();
    await view.fire((p) => p['aria-label'] === `Actions pour ${project.title}`, 'onClick');
    assert.equal(view.hostElements((p, text, tag) => tag === 'button' && p.role === 'menuitem' && text === 'Dupliquer' && p.disabled).length, 1);
    assert.equal(harness.bffProject.calls(duplicatePath, 'post').length, 1);
    pendingRead.release();
    await Promise.all(writes);
    await view.settle();
    assert.equal(harness.bffProject.calls(duplicatePath, 'post').length, 1);
    assert.doesNotMatch(view.text(), /Duplication du projet/);
  } finally { pendingRead.release(); await Promise.allSettled(writes); pendingRead.restore(); }
});

test('pending duplicate and refused refresh compose across views without losing the confirmed copy or replaying POST', async () => {
  await open();
  const project = props().projects[0];
  harness.bffProject.on('post', duplicatePath, { status: 201, body: copy });
  harness.bffProject.on('get', '/projects-page', harness.errorReply(503, fixtures.apiError('UNAVAILABLE', 'Relecture refusée')));
  const pendingRead = pause('GET', path => path.startsWith('/api/bff/projects-page'));
  const writes = [];
  try {
    const originalCallbacks = props();
    writes.push(originalCallbacks.onProjectDuplicate(project));
    writes.push(originalCallbacks.onProjectDuplicate(project));
    await view.waitFor(() => pendingRead.initiated() > 0);
    await view.click('Grille');
    writes.push(props('grid').onProjectDuplicate(project));
    await view.settle();
    assert.equal(harness.bffProject.calls(duplicatePath, 'post').length, 1);
    assert.equal(props('grid').projects.filter(value => value.id === copy.project.id).length, 1);
    assert.match(view.text(), /Duplication du projet/);
    pendingRead.release();
    await Promise.all(writes);
    await view.waitFor(() => view.text().includes('Relecture refusée'));
    assert.equal(props('grid').projects.find(value => value.id === copy.project.id).title, copy.project.title);
    assert.doesNotMatch(view.text(), /Duplication du projet/);
    harness.bffProject.on('get', '/projects-page', { body: fixtures.projectsPage([project, copy.project]) });
    await view.click((p, text, tag) => tag === 'button' && text === 'Réessayer');
    await view.waitFor(() => !view.text().includes('Relecture refusée'));
    assert.equal(harness.bffProject.calls(duplicatePath, 'post').length, 1);
    assert.equal(props('grid').projects.filter(value => value.id === copy.project.id).length, 1);
    assert.equal(harness.bffProject.requests.filter(request => request.method !== 'GET').length, 1);
  } finally { pendingRead.release(); await Promise.allSettled(writes); pendingRead.restore(); }
});

test('a refused duplication preserves active filters and does not trigger a follow-up read', async () => {
  await open();
  await view.fire((p) => p.type === 'search', 'onChange', { target: { value: 'éclairage' } });
  await view.waitFor(() => view.props('SearchInput').value === 'éclairage');
  await view.settle();
  harness.bffProject.on('post', duplicatePath, refused());
  const reads = harness.bffProject.calls('/projects-page', 'get').length;
  await view.act(() => props().onProjectDuplicate(props().projects[0]));
  assert.equal(harness.bffProject.calls('/projects-page', 'get').length, reads);
  assert.equal(view.props('SearchInput').value, 'éclairage');
  assert.match(view.text(), /Duplication refusée/);
});

test('pending one project does not block duplication of another project', async () => {
  const page = fixtures.projectsPage();
  page.projects.push(fixtures.projectListItem({ id: 'project-2', title: 'Projet distinct' }));
  await open('kanban', page);
  harness.bffProject.on('post', duplicatePath, { status: 201, body: copy });
  const pending = pause('POST', (path) => path.endsWith('/duplicate'));
  const writes = [];
  try {
    const board = props();
    writes.push(board.onProjectDuplicate(board.projects[0]));
    writes.push(board.onProjectDuplicate(board.projects[1]));
    writes.push(board.onProjectDuplicate(board.projects[0]));
    await view.settle();
    assert.equal(pending.initiated(), 2);
    pending.release();
    await Promise.all(writes);
    assert.deepEqual(harness.bffProject.calls(duplicatePath, 'post').map((c) => c.pathParams.projectId).sort(), ['project-1', 'project-2']);
  } finally { pending.release(); await Promise.allSettled(writes); pending.restore(); }
});

test('permission refusal keeps Dupliquer absent and never creates a write', async () => {
  const page = fixtures.projectsPage();
  page.projects[0].permissions.canDuplicate = false;
  await open('kanban', page);
  const project = props().projects[0];
  await view.fire((p) => p['aria-label'] === `Actions pour ${project.title}`, 'onClick');
  assert.equal(view.hostElements((p, text) => p.role === 'menuitem' && text === 'Dupliquer').length, 0);
  await view.act(() => props().onProjectDuplicate(project));
  assert.equal(harness.bffProject.calls(duplicatePath, 'post').length, 0);
});
