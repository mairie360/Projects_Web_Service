const assert = require('node:assert/strict');
const { test, before, after, beforeEach, afterEach } = require('node:test');
const { requireTs } = require('./support/typescript.cjs');
const { installReactRuntime, mount } = require('./support/server-view.cjs');

// « Envoyer un message » of the project page « … » menu opens the messaging front with the project as context
// (`<MESSAGE_FRONT_URL>/?context=project-<n>`); only the id travels, the messaging front reads the title itself.

installReactRuntime();
const React = require('react');
const { createFrontHarness } = require('./support/front-harness.cjs');
const f = require('./support/bff-fixtures.cjs');
const Page = requireTs('src/app/projects-client.tsx').default;
const { setBrowserFrontUrls } = requireTs('src/lib/front-urls.ts');
const { projectMessageHref } = requireTs('src/lib/project-message-url.ts');

const harness = createFrontHarness();
const { bffProject } = harness;
const MESSAGES = 'https://messages.test.example/';
let view;

before(() => harness.start());
after(() => harness.stop());
beforeEach(() => {
  harness.reset();
  harness.location.search = '';
  harness.signIn(f.jwt(f.agents.marie.id));
  setBrowserFrontUrls({ MESSAGE_FRONT_URL: MESSAGES });
});
afterEach(() => {
  view?.unmount();
  view = undefined;
  setBrowserFrontUrls({});
  assert.deepEqual(harness.violations(), []);
});

test('MAIR-1181 the messaging link carries only the project id as context', () => {
  assert.equal(projectMessageHref('project-12'), `${MESSAGES}?context=project-12`);
  assert.equal(projectMessageHref('12'), `${MESSAGES}?context=project-12`);
  setBrowserFrontUrls({ MESSAGE_FRONT_URL: 'https://messages.test.example/app/?conversation=3#top' });
  assert.equal(projectMessageHref('project-12'), 'https://messages.test.example/app/?context=project-12');
});

test('MAIR-1181 no messaging link for an unknown front or a non-project id', () => {
  assert.equal(projectMessageHref('task-4'), undefined);
  assert.equal(projectMessageHref('project-0'), undefined);
  assert.equal(projectMessageHref('project-1"><script>'), undefined);
  setBrowserFrontUrls({});
  assert.equal(projectMessageHref('project-12'), undefined);
});

async function openProject() {
  view = mount(React.createElement(Page));
  await view.waitFor((html) => !html.includes('Chargement des projets'));
  await view.act(() => view.props('KanbanBoard').onProjectOpen(view.props('KanbanBoard').projects[0]));
  await view.waitFor(() => view.find('ProjectPage').length === 1);
}

test('MAIR-1181 the project page offers « Envoyer un message » to the messaging front of this project', async () => {
  const project = f.projectListItem({ id: 'project-7' });
  bffProject.on('get', '/projects-page', { body: f.projectsPage([project]) });
  bffProject.on('get', '/projects/{projectId}', { body: f.projectDetails(project) });
  await openProject();

  assert.equal(view.props('ProjectMoreMenu').messageHref, `${MESSAGES}?context=project-7`);
  // Opening the messaging front is a plain navigation: the project front writes nothing.
  assert.equal(bffProject.requests.filter((request) => request.method !== 'GET').length, 0);
});

test('MAIR-1181 a project opened from a link offers the same message action, without a messaging front none', async () => {
  harness.location.search = '?project=project-1';
  bffProject.on('get', '/projects-page', { body: f.projectsPage() });
  bffProject.on('get', '/projects/{projectId}', { body: f.projectDetails() });
  view = mount(React.createElement(Page));
  await view.waitFor(() => view.find('ProjectPage').length === 1);
  assert.equal(view.props('ProjectMoreMenu').messageHref, `${MESSAGES}?context=project-1`);

  view.unmount();
  setBrowserFrontUrls({});
  view = mount(React.createElement(Page));
  await view.waitFor(() => view.find('ProjectPage').length === 1);
  assert.equal(view.props('ProjectMoreMenu').messageHref, undefined);
});
