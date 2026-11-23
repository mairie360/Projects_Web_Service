const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test, before, after, beforeEach, afterEach } = require('node:test');
const { requireTs, root } = require('./support/typescript.cjs');
const { installReactRuntime, mount } = require('./support/server-view.cjs');

// MAIR-487: the findings of the RGAA engine on the states of rgaa.yaml that belong to this front (the lib-components
// ones are MAIR-473), plus the release blocker of the Dockerfile.

installReactRuntime();
const React = require('react');
const { createFrontHarness } = require('./support/front-harness.cjs');
const f = require('./support/bff-fixtures.cjs');
const Page = requireTs('src/app/projects-client.tsx').default;

const harness = createFrontHarness();
const { bffProject } = harness;
let view;
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const sources = (dir = 'src') => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((entry) => {
  const file = path.join(dir, entry.name);
  if (entry.isDirectory()) return sources(file);
  return /\.tsx?$/.test(entry.name) && !/\.test\./.test(entry.name) ? [file] : [];
});

before(() => harness.start());
after(() => harness.stop());
beforeEach(() => { harness.reset(); harness.location.search = ''; harness.signIn(f.jwt(f.agents.marie.id)); });
afterEach(() => { view?.unmount(); view = undefined; assert.deepEqual(harness.violations(), []); });

async function renderView(search) {
  bffProject.on('get', '/projects-page', { body: f.projectsPage([f.projectListItem({ description: 'Une description longue '.repeat(20) })]) });
  harness.location.search = search;
  view = mount(React.createElement(Page));
  await view.waitFor((html) => !html.includes('Chargement des projets'));
  await view.settle();
}
const headings = () => [...view.html.matchAll(/<h([1-6])\b/g)].map((match) => Number(match[1]));

test('MAIR-487 (9.2): the front adds no main region of its own (the lib shell holds the only one)', () => {
  assert.deepEqual(sources().filter((file) => /<main\b/.test(read(file))), []);
});

test('MAIR-487 (9.1): the grid and the Kanban never skip a heading level', async () => {
  for (const search of ['?view=grid', '?view=kanban']) {
    await renderView(search);
    const levels = headings();
    assert.ok(levels.includes(2), `${search}: an h2 sits between the h1 and the cards`);
    levels.forEach((level, index) => assert.ok(index === 0 || level <= levels[index - 1] + 1, `${search}: h${levels[index - 1]} then h${level}`));
    view.unmount(); view = undefined;
  }
});

test('MAIR-487 (10.4, 10.12): a card shows its whole description', async () => {
  await renderView('?view=grid');
  assert.doesNotMatch(read('src/components/ProjectsWorkspace/components/ProjectCard/ProjectCard.tsx'), /line-clamp/);
  assert.match(view.text(), /(Une description longue ){19}Une description longue/);
});

test('MAIR-487 (5.4): the projects table has an accessible name', async () => {
  await renderView('?view=table');
  assert.equal(view.props('DataTable').label, 'Projets');
});

test('MAIR-487 (3.2, 10.7, 11.1): no grey under 4.5:1 and the draft task title is a labelled lib field', () => {
  assert.deepEqual(sources().filter((file) => /#6e7781/i.test(read(file))), []);
  const draft = read('src/components/ProjectsWorkspace/components/ProjectTasksEditor/components/TaskDraftForm/TaskDraftForm.tsx');
  assert.match(draft, /<TextField\s+id="project-form-task-title"\s+label="Nouvelle tâche"/);
  assert.doesNotMatch(draft, /outline-none/);
});

test('MAIR-487: the image reads the npm token as a BuildKit secret, never as a build argument', () => {
  for (const file of ['Dockerfile', 'development.Dockerfile']) {
    const source = read(file);
    assert.match(source, /RUN --mount=type=secret,id=node_auth_token,env=NODE_AUTH_TOKEN/, file);
    assert.doesNotMatch(source, /ARG\s+NODE_AUTH_TOKEN|ENV\s+NODE_AUTH_TOKEN/, file);
  }
});

test('MAIR-487: the RGAA states drive the V2 screens, not the controls they replaced', () => {
  const states = read('rgaa.yaml').slice(read('rgaa.yaml').indexOf('\nstates:'));
  // Removed by MAIR-829 / MAIR-846 / MAIR-1137: the card task composer, the project dialog, its « Suivi », the view tabs.
  for (const gone of ['Fermer la fiche projet', 'has-text("Suivi")', 'has-text("Ajouter une tâche")', 'role: tab,', '[role="dialog"] button']) {
    assert.ok(!states.includes(gone), gone);
  }
  assert.equal((states.match(/^  - id: /gm) ?? []).length, 23, 'the 23 states of the ticket');
  for (const text of ['Aucun projet ne correspond à la recherche ou aux filtres sélectionnés.', 'Le titre est obligatoire.', 'Lien de projet invalide.']) {
    assert.ok(sources().some((file) => read(file).includes(text)), `${text} is still rendered by the front`);
  }
});
