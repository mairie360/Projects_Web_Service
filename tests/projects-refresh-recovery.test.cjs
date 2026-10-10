const assert = require('node:assert/strict');
const { test, before, after, beforeEach, afterEach } = require('node:test');
const { requireTs } = require('./support/typescript.cjs');
const { installReactRuntime, mount } = require('./support/server-view.cjs');

installReactRuntime();
const React = require('react');
const { createFrontHarness } = require('./support/front-harness.cjs');
const fixtures = require('./support/bff-fixtures.cjs');
const ProjectsPage = requireTs('src/app/page.tsx').default;
const harness = createFrontHarness();
const { bffProject } = harness;
let view;

before(() => harness.start());
after(() => harness.stop());
beforeEach(() => {
  harness.reset();
  harness.location.search = '';
  harness.signIn(fixtures.jwt(fixtures.agents.marie.id));
});
afterEach(() => {
  view?.unmount();
  view = undefined;
  assert.deepEqual(harness.violations(), []);
});

const pageCalls = () => bffProject.calls('/projects-page', 'get');
const failPage = () => bffProject.on('get', '/projects-page', harness.errorReply(503, fixtures.apiError('UNAVAILABLE', 'Liste momentanément indisponible')));
const retry = () => view.click((props, text, tag) => tag === 'button' && text === 'Réessayer');
const hasRetry = () => view.hostElements((props, text, tag) => tag === 'button' && text === 'Réessayer').length > 0;

const confirmedOperations = [
  ['create', 'post', '/projects', 201],
  ['edit-card', 'patch', '/projects/{projectId}', 200],
  ['edit-detail', 'patch', '/projects/{projectId}', 200],
  ['duplicate', 'post', '/projects/{projectId}/duplicate', 201],
  ['move', 'patch', '/projects/{projectId}', 200],
  ['close', 'patch', '/projects/{projectId}/close', 200],
  ['review', 'patch', '/projects/{projectId}/close', 200],
  ['delete', 'delete', '/projects/{projectId}', 204],
];

async function performProjectOperation(operation, component, project) {
  if (operation === 'duplicate') return view.act(() => view.props(component).onProjectDuplicate(project));
  if (operation === 'move') return view.act(() => view.props(component).onMoveProject(project, 'review'));
  if (operation === 'delete') {
    await view.act(() => view.props(component).onProjectDelete(project));
    await view.click((props, text, tag) => tag === 'button' && text === 'Supprimer' && props.className.includes('bg-[#cf222e]'));
    // The host button intentionally starts a void callback; wait for the actual outcome.
    return view.waitFor(() => view.find('Alert').length > 0);
  }
  if (operation === 'edit-detail' || operation === 'close' || operation === 'review') {
    await view.act(() => view.props(component).onProjectOpen(project));
    if (operation !== 'edit-detail') return view.act(() => view.props('ProjectDetailModal').onCloseProject(project.id, operation === 'close' ? 'done' : 'review'));
    const form = requireTs('src/lib/projectPageState.ts').projectToFormState(project);
    return view.act(() => view.props('ProjectDetailModal').onUpdateProject(project.id, { ...form, title: 'Brouillon différent du résultat officiel' }));
  }
  if (operation === 'edit-card') await view.act(() => view.props(component).onProjectEdit(project));
  else await view.click('Nouveau projet');
  await view.act(() => view.props('CreateProjectModal').onChange({ title: 'Brouillon différent du résultat officiel', description: 'Description saisie', responsible: fixtures.people.marie.id, dueDate: '2026-12-15' }));
  return view.act(() => view.props('CreateProjectModal').onSubmit({ preventDefault() {} }));
}

async function load(body = fixtures.projectsPage()) {
  bffProject.on('get', '/projects-page', { body });
  view = mount(React.createElement(ProjectsPage));
  await view.waitFor((html) => !html.includes('Chargement des projets'));
}

for (const [operation, method, path, status] of confirmedOperations) {
  for (const [mode, component] of [['kanban', 'KanbanBoard'], ['grid', 'GridView'], ['table', 'TableView']]) {
    if (operation === 'move' && mode !== 'kanban') continue;
    test(`a confirmed ${operation} remains applied in ${mode} after a refused read, without replaying the write`, async () => {
      const project = fixtures.projectListItem();
      const other = fixtures.projectListItem({ id: 'project-other', title: 'Autre projet inchangé' });
      await load(fixtures.projectsPage([project, other]));
      if (mode !== 'kanban') {
        await view.act(() => view.props('ViewToggle').onChange(mode));
        await view.waitFor(() => pageCalls().length === 2);
      }
      const before = pageCalls().length;
      const confirmed = fixtures.projectListItem({
        id: operation === 'create' || operation === 'duplicate' ? 'project-confirmed' : project.id,
        title: 'Valeur officielle confirmée',
        description: 'Description officielle',
        status: operation === 'close' ? 'done' : 'review',
        priority: 'low',
        permissions: { ...project.permissions, canEdit: false },
      });
      bffProject.on('get', '/projects/{projectId}', { body: fixtures.projectDetails(project) });
      bffProject.on(method, path, status === 204 ? { status } : { status, body: fixtures.projectDetails(confirmed) });
      failPage();
      await performProjectOperation(operation, component, project);
      assert.ok(hasRetry());
      const received = view.props(component).projects;
      assert.equal(received.find(value => value.id === other.id).title, other.title);
      if (operation === 'delete') assert.equal(received.some(value => value.id === project.id), false, 'confirmed deletion must not leave its card on screen');
      else {
        const applied = received.find(value => value.id === confirmed.id);
        assert.ok(applied, 'the successful write response must be applied before the refused refresh');
        for (const field of ['title', 'description', 'status', 'priority']) assert.equal(applied[field], confirmed[field]);
        assert.equal(applied.permissions.canEdit, false, 'permission comes from the response, not the submitted draft');
        assert.equal(received.filter(value => value.id === confirmed.id).length, 1);
      }
      const official = operation === 'delete' ? [other] : operation === 'create' || operation === 'duplicate' ? [project, other, confirmed] : [confirmed, other];
      bffProject.on('get', '/projects-page', { body: fixtures.projectsPage(official) });
      await retry();
      await view.waitFor(() => !hasRetry());
      assert.equal(pageCalls().length, before + 2);
      assert.equal(bffProject.calls(path, method).length, 1);
      assert.equal(bffProject.requests.filter(request => request.method !== 'GET').length, 1);
      assert.deepEqual(view.props(component).projects.map(value => value.id), official.map(value => value.id));
    });
  }

  test(`a refused ${operation} does not apply a draft or remove any project`, async () => {
    const project = fixtures.projectListItem();
    await load();
    bffProject.on('get', '/projects/{projectId}', { body: fixtures.projectDetails(project) });
    bffProject.on(method, path, harness.errorReply(403, fixtures.apiError('FORBIDDEN', 'Écriture refusée')));
    // Detail editing deliberately rejects so its own form preserves the draft.
    if (operation === 'edit-detail') await assert.rejects(performProjectOperation(operation, 'KanbanBoard', project));
    else await performProjectOperation(operation, 'KanbanBoard', project);
    assert.equal(view.props('KanbanBoard').projects.length, 1);
    assert.equal(view.props('KanbanBoard').projects[0].title, project.title);
    assert.equal(view.props('KanbanBoard').projects[0].status, project.status);
    assert.equal(pageCalls().length, 1);
    assert.equal(bffProject.calls(path, method).length, 1);
  });
}

for (const operation of ['edit-card', 'delete']) {
  for (const refusedEarlierRead of [false, true]) {
    test(`an earlier ${refusedEarlierRead ? 'refused' : 'successful'} read cannot undo confirmed ${operation} or clear the latest error`, async t => {
      const project = fixtures.projectListItem();
      const other = fixtures.projectListItem({ id: 'project-other', title: 'Autre projet inchangé' });
      const official = fixtures.projectListItem({ title: 'Valeur officielle confirmée' });
      await load(fixtures.projectsPage([project, other]));
      let release;
      const gate = new Promise(resolve => { release = resolve; });
      t.after(() => release());
      let heldReadFinished = false;
      let readCount = 0;
      const originalFetch = global.fetch;
      t.mock.method(global, 'fetch', async (target, init) => {
        const response = await originalFetch(target, init);
        if (typeof target === 'string' && target.startsWith('/api/bff/projects-page') && ++readCount === 1) {
          await gate;
          heldReadFinished = true;
        }
        return response;
      });
      if (refusedEarlierRead) failPage();
      await view.act(() => view.props('ViewToggle').onChange('grid'));
      await view.waitFor(() => pageCalls().length === 2);
      bffProject.on('get', '/projects/{projectId}', { body: fixtures.projectDetails(project) });
      bffProject.on(operation === 'delete' ? 'delete' : 'patch', '/projects/{projectId}', operation === 'delete' ? { status: 204 } : { body: fixtures.projectDetails(official) });
      bffProject.on('get', '/projects-page', harness.errorReply(503, fixtures.apiError('UNAVAILABLE', 'Dernière lecture refusée')));
      await performProjectOperation(operation, 'GridView', project);
      assert.match(view.text(), /Dernière lecture refusée/);
      release();
      await view.waitFor(() => heldReadFinished);
      // Drain the response continuation and ensuing rendered update.
      await view.act(async () => { await new Promise(resolve => setImmediate(resolve)); });
      assert.match(view.text(), /Dernière lecture refusée/);
      const remaining = view.props('GridView').projects;
      if (operation === 'delete') assert.equal(remaining.some(value => value.id === project.id), false);
      else assert.equal(remaining.find(value => value.id === project.id).title, official.title);
      assert.equal(remaining.find(value => value.id === other.id).title, other.title);
    });
  }
}

test('an initial failure offers an accessible read-only retry without inventing projects', async () => {
  failPage();
  view = mount(React.createElement(ProjectsPage));
  await view.waitFor((html) => !html.includes('Chargement des projets'));
  assert.ok(/role="alert"/.test(view.html), 'failure is announced as an alert');
  assert.match(view.text(), /Liste momentanément indisponible/);
  assert.ok(hasRetry());
  assert.equal(view.find('KanbanBoard').length, 0);
  bffProject.on('get', '/projects-page', { body: fixtures.projectsPage() });
  await retry();
  await view.waitFor(() => view.find('KanbanBoard').length === 1);
  assert.equal(pageCalls().length, 2);
  assert.doesNotMatch(view.text(), /Liste momentanément indisponible/);
  assert.ok(bffProject.requests.every((request) => request.method === 'GET'));
});

for (const [mode, component] of [['kanban', 'KanbanBoard'], ['grid', 'GridView'], ['table', 'TableView']]) {
  test(`a refused refresh in ${mode} retains confirmed projects, shows its error and retries the active filters`, async () => {
    await load();
    if (mode !== 'kanban') {
      await view.act(() => view.props('ViewToggle').onChange(mode));
      await view.waitFor(() => pageCalls().length === 2);
    }
    const before = pageCalls().length;
    failPage();
    await view.act(() => view.props('SearchInput').onChange('éclairage'));
    await view.waitFor(() => pageCalls().length === before + 1);
    await view.waitFor(() => hasRetry());
    assert.equal(view.find(component).length, 1);
    assert.match(view.text(), /Rénovation de l’éclairage public/);
    assert.match(view.text(), /Dernières données reçues/);
    assert.ok(/role="alert"/.test(view.html), 'refresh failure is announced as an alert');
    bffProject.on('get', '/projects-page', { body: fixtures.projectsPage() });
    await retry();
    await view.waitFor(() => !hasRetry());
    assert.equal(pageCalls().length, before + 2);
    assert.equal(pageCalls().at(-1).url.searchParams.get('q'), 'éclairage');
    assert.equal(pageCalls().at(-1).url.searchParams.get('view'), mode);
    assert.doesNotMatch(view.text(), /Liste momentanément indisponible|Dernières données reçues/);
    assert.ok(bffProject.requests.every((request) => request.method === 'GET'));
  });
}

test('a failed refresh after an empty response is not presented as a new confirmed empty result', async () => {
  await load(fixtures.projectsPage([]));
  await view.act(() => view.props('ViewToggle').onChange('grid'));
  await view.waitFor(() => pageCalls().length === 2);
  failPage();
  await view.act(() => view.props('SearchInput').onChange('introuvable'));
  await view.waitFor(() => pageCalls().length === 3);
  await view.waitFor(() => hasRetry());
  assert.match(view.text(), /Liste momentanément indisponible/);
  assert.doesNotMatch(view.text(), /Aucun projet ne correspond/);
  assert.equal(view.find('GridView').length, 0);
});

test('retrying a failed refresh after a confirmed duplicate only reads and never duplicates again', async () => {
  await load();
  const project = fixtures.projectListItem();
  const duplicate = fixtures.projectListItem({ id: 'project-copy', title: 'Copie confirmée' });
  bffProject.on('post', '/projects/{projectId}/duplicate', { status: 201, body: fixtures.projectDetails(duplicate) });
  failPage();
  await view.act(() => view.props('KanbanBoard').onProjectDuplicate(project));
  assert.ok(hasRetry());
  assert.equal(view.find('KanbanBoard').length, 1);
  assert.equal(bffProject.calls('/projects/{projectId}/duplicate', 'post').length, 1);
  bffProject.on('get', '/projects-page', { body: fixtures.projectsPage([project, duplicate]) });
  await retry();
  await view.waitFor(() => !hasRetry());
  assert.match(view.text(), /Copie confirmée/);
  assert.equal(bffProject.calls('/projects/{projectId}/duplicate', 'post').length, 1);
  assert.equal(pageCalls().length, 3);
});

test('retry keeps every active filter and accepts a genuinely empty successful response', async () => {
  await load();
  await view.act(() => {
    view.props('SearchInput').onChange('éclairage');
    view.props('FilterSelect', 0).onChange('in-progress');
    view.props('FilterSelect', 1).onChange('high');
    view.props('ViewToggle').onChange('grid');
  });
  await view.fire((props) => props['aria-label'] === 'Échéance avant', 'onChange', { target: { value: '2026-12-31' } });
  await view.waitFor(() => pageCalls().length === 2);
  failPage();
  await view.act(() => view.props('SearchInput').onChange('éclairage public'));
  await view.waitFor(() => hasRetry());
  bffProject.on('get', '/projects-page', { body: fixtures.projectsPage([]) });
  await retry();
  await view.waitFor(() => !hasRetry());
  assert.deepEqual(Object.fromEntries(pageCalls().at(-1).url.searchParams), {
    q: 'éclairage public', status: 'in-progress', priority: 'high', dueBefore: '2026-12-31', view: 'grid', page: '1', limit: '50',
  });
  assert.match(view.text(), /Aucun projet ne correspond aux filtres sélectionnés/);
  assert.doesNotMatch(view.text(), /Dernières données reçues|Liste momentanément indisponible|Rénovation de l’éclairage public/);
  assert.ok(bffProject.requests.every((request) => request.method === 'GET'));
});

test('synchronous repeated activation sends one read, stays disabled while pending, and permits retry after another refusal', async (t) => {
  failPage();
  view = mount(React.createElement(ProjectsPage));
  await view.waitFor(() => hasRetry());
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  t.after(() => release());
  const originalFetch = global.fetch;
  t.mock.method(global, 'fetch', async (target, init) => {
    const response = await originalFetch(target, init);
    if (typeof target === 'string' && target.startsWith('/api/bff/projects-page')) await gate;
    return response;
  });
  const button = () => view.hostElements((props, text, tag) => tag === 'button' && text === 'Réessayer')[0];
  const activate = button().props.onClick;
  await view.act(() => { activate(); activate(); });
  await view.waitFor(() => pageCalls().length === 2);
  assert.equal(button().props.disabled, true);
  assert.equal(button().props['aria-busy'], true);
  assert.match(view.text(), /Actualisation des projets/);
  activate();
  assert.equal(pageCalls().length, 2);
  release();
  await view.waitFor(() => button()?.props.disabled === false);
  assert.match(view.text(), /Liste momentanément indisponible/);
  bffProject.on('get', '/projects-page', { body: fixtures.projectsPage() });
  await retry();
  await view.waitFor(() => !hasRetry());
  assert.equal(pageCalls().length, 3);
  assert.ok(bffProject.requests.every((request) => request.method === 'GET'));
});
