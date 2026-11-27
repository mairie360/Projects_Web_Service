const assert = require('node:assert/strict');
const { test, before, after, beforeEach, afterEach } = require('node:test');
const { requireTs } = require('./support/typescript.cjs');
const { installReactRuntime, mount } = require('./support/server-view.cjs');

// MAIR-1230: the global search of the shared header (lib-components 2.7, Figma lib `Header/SearchResults`). The header
// asks the same-origin `GET /search`, which the contract proxy forwards to BFF_Project; a result opens its target in
// this module through `?project=<id>` or `?project=<id>&task=<id>`.

installReactRuntime();
const React = require('react');
const { createFrontHarness } = require('./support/front-harness.cjs');
const f = require('./support/bff-fixtures.cjs');
const Page = requireTs('src/app/projects-client.tsx').default;
const { globalSearchSource } = requireTs('src/lib/global-search.ts');
const { parseProjectDeepLink } = requireTs('src/lib/projectDeepLink.ts');
const { globalSearchHref } = require('@mairie360/lib-components/shell');

const harness = createFrontHarness();
const { bffProject } = harness;
const project = f.projectListItem();
const todo = f.projectTask();
const review = f.projectTask({ id: 'task-2', title: 'Plan des voiries', status: 'review' });
let view;

before(() => harness.start());
after(() => harness.stop());
beforeEach(() => {
  harness.reset();
  harness.location.search = '';
  harness.signIn(f.jwt(f.agents.marie.id));
  bffProject.on('get', '/projects-page', { body: f.projectsPage([project]) });
  bffProject.on('get', '/projects/{projectId}', { body: f.projectDetails(project, [todo, review]) });
});
afterEach(() => {
  view?.unmount();
  view = undefined;
  assert.deepEqual(harness.violations(), []);
});

const searchCalls = () => bffProject.calls('/search', 'get');
const headerSearch = (props) => props.type === 'search' && props.role === 'combobox';

// TU: the links the lib builds for this module are the deep links the page reads.
test('MAIR-1230 the links of project and task results are deep links the page opens', () => {
  const [{ items: [projectResult, taskResult] }] = f.globalSearch().groups;
  const projectHref = globalSearchHref(projectResult, 'projects', { projects: '/' });
  const taskHref = globalSearchHref(taskResult, 'projects', { projects: 'https://projets.example/' });
  assert.equal(projectHref, '/?project=1');
  assert.equal(taskHref, 'https://projets.example/?project=1&task=2');
  assert.deepEqual(parseProjectDeepLink(new URL(projectHref, 'https://front.example').search), { projectId: 'project-1', taskId: null });
  assert.deepEqual(parseProjectDeepLink(new URL(taskHref).search), { projectId: 'project-1', taskId: 'task-2' });
  // A task without its project gives no usable link: the page explains it instead of guessing.
  assert.deepEqual(parseProjectDeepLink(new URL(globalSearchHref({ ...taskResult, parent_id: null }, 'projects', { projects: '/' }), 'https://front.example').search), { error: 'Lien de projet invalide.' });
});

// TI technical: the source goes through the contract proxy to BFF_Project, with the session and the declared query only.
test('MAIR-1230 GET /search goes through the contract proxy to BFF_Project with the session', async () => {
  const result = await globalSearchSource('  éclairage ', new AbortController().signal);

  assert.deepEqual(result, f.globalSearch());
  assert.equal(searchCalls().length, 1);
  const [call] = searchCalls();
  assert.deepEqual(Object.fromEntries(call.url.searchParams), { q: 'éclairage' });
  assert.equal(call.headers.authorization, `Bearer ${f.jwt(f.agents.marie.id)}`);
  assert.equal(call.headers.cookie, undefined);
});

test('MAIR-1230 a refused search rejects with the BFF status and keeps the error envelope', async () => {
  bffProject.on('get', '/search', harness.errorReply(503, f.apiError('SERVICE_UNAVAILABLE', 'Recherche indisponible')));
  await assert.rejects(globalSearchSource('éclairage', new AbortController().signal), /status 503/);
  assert.equal(searchCalls().length, 1);
});

test('MAIR-1230 the proxy refuses methods the contract does not declare on /search', async () => {
  const response = await fetch('/search?q=voirie', { method: 'POST', body: '{}' });
  assert.equal(response.status, 405);
  assert.equal(searchCalls().length, 0);
});

// TI business: typing in the header lists the results with their links, and a link opens its target.
test('MAIR-1230 typing in the header search lists the results of every module with their links', async () => {
  bffProject.on('get', '/search', { body: f.globalSearch([
    ...f.globalSearch().groups,
    { module: 'calendar', items: [{ kind: 'event', id: 4, title: 'Réunion éclairage', excerpt: null, parent_id: null, updated_at: '2026-12-03T10:00:00.000Z' }] },
  ], ['messages']) });
  view = mount(React.createElement(Page));
  await view.waitFor((html) => !html.includes('Chargement des projets'));
  assert.equal(view.props('AccessibleShell').searchSource, globalSearchSource);
  assert.equal(searchCalls().length, 0);

  await view.fire(headerSearch, 'onChange', { target: { value: 'éclairage' } });
  await view.waitFor((html) => html.includes('Réunion éclairage'), { timeout: 3000 });

  assert.equal(searchCalls().length, 1);
  assert.equal(searchCalls()[0].url.searchParams.get('q'), 'éclairage');
  assert.match(view.html, /data-href="https:\/\/projects\.mairie\.test\/\?project=1"/);
  assert.match(view.html, /data-href="https:\/\/projects\.mairie\.test\/\?project=1&amp;task=2"/);
  // No Calendar destination in this instance: the event is listed without a link.
  assert.match(view.html, /role="option"[^>]*aria-disabled="true"/);
  assert.match(view.text(), /Relevé des candélabres/);
  assert.match(view.text(), /Messagerie ne répond pas/);

  // Choosing the task opens its project and task in this module (full-page navigation to the deep link).
  await view.click((props, text, tag) => tag === 'li' && props.role === 'option' && props['data-href']?.endsWith('task=2'));
  assert.deepEqual(harness.location.assigned, ['https://projects.mairie.test/?project=1&task=2']);
  // The module's own list is untouched by the header search.
  assert.equal(view.props('ProjectFiltersBar').search, '');
  assert.equal(bffProject.calls('/projects/{projectId}', 'get').length, 0);
});

test('MAIR-1230 a project result opens the project page', async () => {
  harness.location.search = '?project=1';
  view = mount(React.createElement(Page));
  await view.waitFor(() => view.find('ProjectPage').length === 1);

  assert.equal(bffProject.calls('/projects/{projectId}', 'get')[0].pathParams.projectId, 'project-1');
  assert.equal(view.props('ProjectPage').project.id, 'project-1');
  assert.doesNotMatch(view.html, /data-task-page=/);
});

test('MAIR-1230 a task result opens the project on the page of that task', async () => {
  harness.location.search = '?project=1&task=2';
  view = mount(React.createElement(Page));
  await view.waitFor((html) => html.includes('data-task-page="task-2"'));

  assert.equal(bffProject.calls('/projects/{projectId}', 'get').length, 1);
  assert.equal(view.props('TaskPage').task.title, 'Plan des voiries');
  assert.match(view.html, /<h2[^>]*>Plan des voiries<\/h2>/);
  assert.doesNotMatch(view.text(), /Lien de projet invalide|La tâche demandée est introuvable/);
});

test('MAIR-1230 an unknown task or project from a stale result is explained without any retry loop', async () => {
  harness.location.search = '?project=1&task=999';
  view = mount(React.createElement(Page));
  await view.waitFor((html) => html.includes('La tâche demandée est introuvable'));
  assert.equal(view.find('ProjectPage').length, 0);
  view.unmount();

  harness.reset();
  harness.signIn(f.jwt(f.agents.marie.id));
  harness.location.search = '?project=404';
  bffProject.on('get', '/projects-page', { body: f.projectsPage([project]) });
  bffProject.on('get', '/projects/{projectId}', harness.errorReply(404, f.apiError('NOT_FOUND', 'Projet introuvable')));
  view = mount(React.createElement(Page));
  await view.waitFor((html) => html.includes('Projet introuvable'));
  await view.settle();
  assert.equal(view.find('ProjectPage').length, 0);
  assert.equal(bffProject.calls('/projects/{projectId}', 'get').length, 1);
});
