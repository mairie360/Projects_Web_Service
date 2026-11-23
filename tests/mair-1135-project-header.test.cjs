const assert = require('node:assert/strict');
const { test, before, after, beforeEach, afterEach } = require('node:test');
const { requireTs } = require('./support/typescript.cjs');
const { installReactRuntime, mount } = require('./support/server-view.cjs');

// MAIR-1135 (Figma F5): the project page header — title first, meta line (status, priority, « En retard »,
// separator, responsible, due date), description, three size m actions — and the airier overview with the labels in
// « Informations ».

installReactRuntime();
const React = require('react');
const { createFrontHarness } = require('./support/front-harness.cjs');
const f = require('./support/bff-fixtures.cjs');
const Page = requireTs('src/app/projects-client.tsx').default;

const harness = createFrontHarness();
const { bffProject } = harness;
const project = f.projectListItem({ dueDate: '2020-01-15', labels: ['voirie', 'énergie'] });
let view;

before(() => harness.start());
after(() => harness.stop());
beforeEach(() => {
  harness.reset();
  harness.location.search = '';
  harness.signIn(f.jwt(f.agents.marie.id));
  bffProject.on('get', '/projects-page', { body: f.projectsPage([project]) });
  bffProject.on('get', '/projects/{projectId}', { body: f.projectDetails(project) });
});
afterEach(() => {
  view?.unmount();
  view = undefined;
  assert.deepEqual(harness.violations(), []);
});

async function openPage() {
  view = mount(React.createElement(Page));
  await view.waitFor((html) => !html.includes('Chargement des projets'));
  await view.act(() => view.props('KanbanBoard').onProjectOpen(view.props('KanbanBoard').projects[0]));
  await view.waitFor(() => view.find('ProjectPage').length === 1);
}

test('MAIR-1135 C4: title, then the meta line, then the description; labels no longer in the header', async () => {
  await openPage();
  const header = view.html.match(/<header class="space-y-4">[\s\S]*?<\/header>/)[0];
  const title = header.indexOf('<h1');
  const meta = header.indexOf('aria-label="Résumé du projet"');
  const description = header.indexOf(project.description);
  assert.ok(title > -1 && meta > title && description > meta, 'title, meta line, description');
  const metaHtml = header.slice(meta, description);
  assert.match(metaHtml, /En retard/);
  assert.match(metaHtml, /15\/01\/2020/);
  assert.match(metaHtml, new RegExp(project.responsible.name));
  assert.doesNotMatch(header, /Étiquettes du projet/);
  for (const label of ['Modifier', 'Nouvelle tâche']) {
    assert.match(header, new RegExp(`data-size="m"[^>]*>[^]*?${label}`));
  }
});

test('MAIR-1135 C5: 32 px between the blocks, 20 px between the indicators, labels in « Informations »', async () => {
  await openPage();
  assert.match(view.html, /<section aria-labelledby="[^"]+" class="space-y-8">/);
  assert.match(view.html, /aria-label="Indicateurs du projet" class="grid grid-cols-2 gap-5 xl:grid-cols-4"/);
  assert.match(view.html, /lg:grid-cols-\[minmax\(0,1fr\)_clamp\(320px,28vw,380px\)\]/);
  const aside = view.html.match(/<aside[^>]*aria-label="Informations du projet"[\s\S]*?<\/aside>/)[0];
  assert.match(aside, /Étiquettes du projet/);
  assert.match(aside, /voirie/);
  assert.equal(bffProject.requests.filter((request) => request.method !== 'GET').length, 0);
});
