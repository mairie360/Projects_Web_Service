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
beforeEach(() => { harness.reset(); harness.signIn(f.jwt(f.agents.marie.id)); });
afterEach(() => { view?.unmount(); view = undefined; assert.deepEqual(harness.violations(), []); });
const reads = () => bffProject.calls('/projects-page', 'get');
const pagination = page => ({ page, limit: 50, total: 85, hasNextPage: page === 1 });
const query = request => Object.fromEntries(request.url.searchParams);

for (const [operation, refusedRefresh] of [
  ['move', false], ['move', true], ['duplicate', false], ['duplicate', true],
]) {
  test(`a pending ${operation} refreshes the current view and intended query, not its captured query (${refusedRefresh ? 'refused refresh' : 'success'})`, async t => {
    const project = f.projectListItem();
    bffProject.on('get', '/projects-page', { body: f.projectsPage([project], { pagination: pagination(1) }) });
    view = mount(React.createElement(Page));
    await view.waitFor(html => !html.includes('Chargement des projets'));
    const confirmed = f.projectListItem({ id: operation === 'duplicate' ? 'project-copy' : project.id, title: 'Éclairage confirmé', status: 'review' });
    const method = operation === 'duplicate' ? 'post' : 'patch';
    const path = operation === 'duplicate' ? '/projects/{projectId}/duplicate' : '/projects/{projectId}';
    bffProject.on(method, path, { status: operation === 'duplicate' ? 201 : 200, body: f.projectDetails(confirmed) });
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    t.after(() => release());
    const fetch = global.fetch;
    t.mock.method(global, 'fetch', async (input, init) => {
      const response = await fetch(input, init);
      if (input === (operation === 'duplicate' ? '/projects/project-1/duplicate' : '/projects/project-1') && init?.method === method.toUpperCase()) await gate;
      return response;
    });
    let pending;
    await view.act(() => {
      const props = view.props('KanbanBoard');
      pending = operation === 'duplicate' ? props.onProjectDuplicate(props.projects[0]) : props.onMoveProject(props.projects[0], 'review');
    });
    await view.waitFor(() => bffProject.calls(path, method).length === 1);

    bffProject.on('get', '/projects-page', request => ({ body: f.projectsPage([confirmed], {
      pagination: pagination(Number(request.url.searchParams.get('page'))),
    }) }));
    await view.act(() => {
      view.props('SearchInput').onChange('éclairage');
      view.props('FilterSelect', 0).onChange('review');
      view.props('FilterSelect', 1).onChange('high');
      view.props('ViewToggle').onChange('grid');
    });
    await view.fire(props => props['aria-label'] === 'Échéance avant', 'onChange', { target: { value: '2026-12-20' } });
    await view.waitFor(() => reads().length >= 2 && view.props('ProjectPagination').pagination?.page === 1 && !view.props('ProjectPagination').pending);
    await view.click(props => props['aria-label'] === 'Page suivante');
    await view.waitFor(() => view.props('ProjectPagination').pagination?.page === 2);
    const currentQuery = query(reads().at(-1));
    assert.deepEqual(currentQuery, { q: 'éclairage', status: 'review', priority: 'high', dueBefore: '2026-12-20', view: 'grid', page: '2', limit: '50' });
    const intendedQuery = operation === 'duplicate'
      ? { status: 'all', priority: 'all', view: 'grid', page: '1', limit: '50' }
      : currentQuery;

    if (refusedRefresh) bffProject.on('get', '/projects-page', harness.errorReply(503, f.apiError('UNAVAILABLE', 'Lecture après écriture refusée')));
    release();
    await pending;
    await view.settle();
    assert.deepEqual(query(reads().at(-1)), intendedQuery, 'post-write GET must use the current view and intended filters');
    assert.equal(view.props('SearchInput').value, operation === 'duplicate' ? '' : 'éclairage');
    assert.equal(view.props('ViewToggle').value, 'grid');
    assert.equal(view.props('GridView').projects[0].title, confirmed.title);
    assert.equal(view.props('ProjectPagination').pagination.page, operation === 'duplicate' && !refusedRefresh ? 1 : 2);
    if (refusedRefresh) {
      assert.match(view.text(), /Lecture après écriture refusée/);
      bffProject.on('get', '/projects-page', { body: f.projectsPage([confirmed], { pagination: pagination(operation === 'duplicate' ? 1 : 2) }) });
      await view.click('Réessayer');
      await view.waitFor(html => !html.includes('Lecture après écriture refusée'));
      assert.deepEqual(query(reads().at(-1)), intendedQuery);
    }
    assert.equal(bffProject.calls(path, method).length, 1);
    assert.equal(bffProject.requests.filter(request => request.method !== 'GET').length, 1);
  });
}
