const assert = require('node:assert/strict');
const { test, before, after, beforeEach, afterEach } = require('node:test');
const { installReactRuntime, mount } = require('./support/server-view.cjs');
installReactRuntime();
const React = require('react');
const { requireTs } = require('./support/typescript.cjs');
const { createFrontHarness } = require('./support/front-harness.cjs');
const fixtures = require('./support/bff-fixtures.cjs');
const Client = requireTs('src/app/projects-client.tsx').default;
const { projectUrlSchema } = requireTs('src/lib/project-page-query.ts');
const { readPageUrlState } = requireTs('src/lib/page-url-state.ts');
const harness = createFrontHarness();
const project = fixtures.projectListItem();
let view;
before(() => harness.start());
after(() => harness.stop());
beforeEach(() => { harness.reset(); harness.signIn(fixtures.jwt(fixtures.agents.marie.id)); harness.location.search = '?view=table'; harness.location.href = 'https://projects.mairie.test/?view=table'; });
afterEach(() => { view?.unmount(); view = undefined; assert.deepEqual(harness.violations(), []); });
const initial = () => ({ status: 'confirmed', query: readPageUrlState('?view=table', projectUrlSchema), data: fixtures.projectsPage([project]) });
const reads = () => harness.bffProject.calls('/projects-page', 'get');

test('a confirmed server receipt is visible immediately and is not fetched again during hydration or remount', async () => {
  view = mount(React.createElement(Client, { initial: initial() }));
  assert.match(view.html, /Rénovation de l’éclairage public/);
  await new Promise(resolve => setTimeout(resolve, 320));
  assert.equal(reads().length, 0);
  view.unmount();
  view = mount(React.createElement(Client, { initial: initial() }));
  await new Promise(resolve => setTimeout(resolve, 320));
  assert.equal(reads().length, 0);
});

test('foreground refresh after a server receipt keeps the open draft through success and refusal', async () => {
  view = mount(React.createElement(Client, { initial: initial() }));
  await view.act(() => view.props('ProjectsWorkspace').openCreateProject());
  await view.act(() => view.props('CreateProjectModal').onChange({ title: 'Draft retained across foreground' }));
  harness.bffProject.on('get', '/projects-page', { body: fixtures.projectsPage([{ ...project, title: 'Confirmed foreground project' }]) });
  await view.act(() => window.dispatchEvent(new Event('focus')));
  await view.waitFor(() => reads().length === 1 && view.props('ProjectsWorkspace').projects[0].title === 'Confirmed foreground project');
  assert.equal(view.props('CreateProjectModal').form.title, 'Draft retained across foreground');
  harness.bffProject.on('get', '/projects-page', harness.errorReply(503, fixtures.apiError('UNAVAILABLE', 'Refused foreground')));
  await view.act(() => window.dispatchEvent(new Event('focus')));
  await view.waitFor(() => reads().length === 2 && view.props('ProjectsWorkspace').pageError.includes('Refused foreground'));
  assert.equal(view.props('CreateProjectModal').form.title, 'Draft retained across foreground');
  assert.equal(view.props('ProjectsWorkspace').projects[0].title, 'Confirmed foreground project');
});

test('an unavailable server receipt resumes through the existing same-origin browser route', async () => {
  harness.bffProject.on('get', '/projects-page', { body: fixtures.projectsPage([project]) });
  view = mount(React.createElement(Client, { initial: { status: 'unavailable', message: 'Initial server read unavailable' } }));
  await view.waitFor(() => reads().length === 1 && !view.props('ProjectsWorkspace').pageLoading);
  assert.equal(view.props('ProjectsWorkspace').projects[0].id, project.id);
  assert.equal(view.props('ProjectsWorkspace').pageError, '');
});

test('paging from a server receipt performs one read and preserves the confirmed next-page metadata', async () => {
  const seed = initial();
  seed.data.pagination = { page: 1, limit: 50, total: 85, hasNextPage: true };
  const next = { ...project, id: 'project-2', title: 'Confirmed second project page' };
  harness.bffProject.on('get', '/projects-page', { body: fixtures.projectsPage([next], { pagination: { page: 2, limit: 50, total: 85, hasNextPage: false } }) });
  view = mount(React.createElement(Client, { initial: seed }));
  // Browser commands run after React has flushed the passive hydration effects.
  await view.settle();
  assert.equal(reads().length, 0);
  await view.act(() => view.props('ProjectPagination').onChange('next'));
  await view.waitFor(() => view.props('ProjectPagination').pagination.page === 2);
  await new Promise(resolve => setTimeout(resolve, 320));
  assert.equal(reads().length, 1, 'A page-only URL change must not also schedule the filter debounce');
  assert.equal(view.props('ProjectPagination').pagination.page, 2);
  assert.match(view.text(), /Confirmed second project page/);
});
