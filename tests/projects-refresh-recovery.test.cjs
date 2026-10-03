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

async function load(body = fixtures.projectsPage()) {
  bffProject.on('get', '/projects-page', { body });
  view = mount(React.createElement(ProjectsPage));
  await view.waitFor((html) => !html.includes('Chargement des projets'));
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
    if (typeof target === 'string' && target.startsWith('/projects-page')) await gate;
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
