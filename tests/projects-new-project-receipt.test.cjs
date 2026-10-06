const assert = require('node:assert/strict');
const { test, before, after, beforeEach, afterEach } = require('node:test');
const { requireTs } = require('./support/typescript.cjs');
const { installReactRuntime, mount } = require('./support/server-view.cjs');
installReactRuntime();
const React = require('react');
const { createFrontHarness } = require('./support/front-harness.cjs');
const f = require('./support/bff-fixtures.cjs');
const { projectToFormState } = requireTs('src/lib/projectPageState.ts');
const Page = requireTs('src/app/page.tsx').default;
const harness = createFrontHarness();
const first = f.projectListItem(), second = f.projectListItem({ id: 'project-2', title: 'Autre projet intact' });
let view;
before(() => harness.start());
after(() => harness.stop());
beforeEach(() => { harness.reset(); harness.signIn(f.jwt(f.agents.marie.id)); harness.location.search = ''; });
afterEach(() => { view?.unmount(); view = undefined; assert.deepEqual(harness.violations(), []); });
const writes = () => harness.bffProject.requests.filter(({ method }) => method !== 'GET');
const keyFor = kind => kind === 'create' ? 'create' : `duplicate:${first.id}`;
const pathFor = kind => kind === 'create' ? '/projects' : '/projects/{projectId}/duplicate';

async function loaded() {
  harness.bffProject.on('get', '/projects-page', { body: f.projectsPage([first, second]) });
  harness.bffProject.on('get', '/projects/{projectId}', ({ pathParams }) => ({
    body: f.projectDetails(pathParams.projectId === first.id ? first : second),
  }));
  view = mount(React.createElement(Page));
  await view.waitFor(html => !html.includes('Chargement des projets'));
}

async function prepare(kind) {
  if (kind !== 'create') return;
  await view.act(() => view.props('ProjectsWorkspace').openCreateProject());
  await view.act(() => view.props('CreateProjectModal').onChange({
    ...projectToFormState(first), title: 'Brouillon de nouvelle création', taskItems: [],
  }));
}

async function perform(kind) {
  if (kind === 'create') return view.props('CreateProjectModal').onSubmit({ preventDefault() {} });
  return view.props('ProjectsWorkspace').duplicateProject(first);
}

function invalidReceipt(kind) {
  const id = kind === 'known' ? second.id : kind === 'source' ? first.id : kind === 'empty' ? ' ' : 'new-id';
  const task = f.projectTask();
  return f.projectDetails({ ...second, id, title: 'Reçu non vérifié à ne pas appliquer' },
    kind === 'task-collision' ? [task, { ...task }] : []);
}

for (const operation of ['create', 'duplicate']) {
  for (const bad of ['known', 'source', 'empty', 'task-collision']) {
    test(`${operation}: ${bad} new-project receipt preserves rows, detail and draft without replay`, async () => {
      await loaded();
      await view.act(() => view.props('ProjectsWorkspace').openProjectDetails(second));
      const selected = structuredClone(view.props('ProjectDetailModal').project);
      const rows = structuredClone(view.props('ProjectsWorkspace').projects);
      await prepare(operation);
      harness.bffProject.on('post', pathFor(operation), { body: invalidReceipt(bad) });
      const reads = harness.bffProject.requests.filter(({ method }) => method === 'GET').length;
      await view.act(() => perform(operation));
      assert.deepEqual(view.props('ProjectsWorkspace').projects, rows);
      assert.deepEqual(view.props('ProjectDetailModal').project, selected);
      assert.equal(view.props('ProjectsWorkspace').newProjectReceiptIssues.has(keyFor(operation)), true);
      assert.match(view.text(), bad === 'task-collision' ? /tâches.*incohérentes/ : /identité du nouveau projet n’est pas vérifiable/);
      assert.doesNotMatch(view.text(), /Reçu non vérifié à ne pas appliquer/);
      if (operation === 'create') {
        assert.equal(view.props('CreateProjectModal').form.title, 'Brouillon de nouvelle création');
        assert.equal(view.props('CreateProjectModal').verificationRequired, true);
        assert.equal(view.props('CreateProjectModal').verificationLabel, bad === 'task-collision' ? 'Vérifier le projet' : 'Actualiser le catalogue');
      }
      await view.act(() => perform(operation));
      assert.equal(writes().length, 1);
      assert.equal(harness.bffProject.requests.filter(({ method }) => method === 'GET').length, reads);
      assert.equal(view.props('ProjectsWorkspace').unverifiedProjectIds.size, 0, 'do not lock a colliding existing target');
    });
  }

  test(`${operation}: catalogue refusal and matching draft fields cannot confirm the uncertain creation`, async () => {
    await loaded(); await prepare(operation);
    harness.bffProject.on('post', pathFor(operation), { body: invalidReceipt('known') });
    await view.act(() => perform(operation));
    harness.bffProject.on('get', '/projects-page', harness.errorReply(503, f.apiError('READ', 'Catalogue refusé')));
    await view.act(() => view.props('ProjectsWorkspace').readNewProjectCatalogue());
    assert.equal(view.props('ProjectsWorkspace').newProjectCatalogueReadError, 'Catalogue refusé');
    assert.equal(view.props('ProjectsWorkspace').newProjectReceiptIssues.has(keyFor(operation)), true);
    const unrelatedNew = f.projectListItem({ id: 'catalogue-new', title: 'Brouillon de nouvelle création' });
    harness.bffProject.on('get', '/projects-page', { body: f.projectsPage([first, second, unrelatedNew]) });
    await view.act(() => view.props('ProjectsWorkspace').readNewProjectCatalogue());
    assert.equal(view.props('ProjectsWorkspace').newProjectCatalogueReadError, '');
    assert.equal(view.props('ProjectsWorkspace').newProjectReceiptIssues.has(keyFor(operation)), true);
    assert.equal(view.props('ProjectsWorkspace').projects[1].title, second.title);
    await view.act(() => perform(operation));
    assert.equal(writes().length, 1, 'a title match is not an idempotency/creation acknowledgement');
  });

  test(`${operation}: previously observed but now filtered-out IDs still collide`, async () => {
    await loaded();
    harness.bffProject.on('get', '/projects-page', { body: f.projectsPage([first]) });
    await view.act(() => view.props('ProjectsWorkspace').retryProjectsPage());
    assert.equal(view.props('ProjectsWorkspace').projects.length, 1);
    await prepare(operation);
    harness.bffProject.on('post', pathFor(operation), { body: invalidReceipt('known') });
    await view.act(() => perform(operation));
    assert.equal(view.props('ProjectsWorkspace').newProjectReceiptIssues.has(keyFor(operation)), true);
    assert.deepEqual(view.props('ProjectsWorkspace').projects.map(project => project.id), [first.id]);
    assert.equal(writes().length, 1);
  });
}

test('uncertain creation survives closing and another editor without blocking that project', async () => {
  await loaded(); await prepare('create');
  harness.bffProject.on('post', '/projects', { body: invalidReceipt('known') });
  await view.act(() => perform('create'));
  await view.act(() => view.props('CreateProjectModal').onChange({ title: 'Brouillon conservé après refus' }));
  await view.act(() => view.props('CreateProjectModal').onClose());
  assert.match(view.text(), /Création non vérifiée/);
  await view.act(() => view.props('ProjectsWorkspace').openEditProject(second));
  assert.equal(view.props('CreateProjectModal').verificationRequired, false);
  harness.bffProject.on('patch', '/projects/{projectId}', { body: f.projectDetails(second) });
  await view.act(() => view.props('CreateProjectModal').onSubmit({ preventDefault() {} }));
  await view.act(() => view.props('ProjectsWorkspace').openCreateProject());
  assert.equal(view.props('CreateProjectModal').form.title, 'Brouillon conservé après refus');
  assert.equal(view.props('CreateProjectModal').verificationRequired, true);
  await view.act(() => perform('create'));
  assert.equal(writes().length, 2, 'only the original create and unrelated PATCH were sent');
});

test('two catalogue verification dispatches share a pending GET and never clear uncertainty', async t => {
  await loaded(); await prepare('create');
  harness.bffProject.on('post', '/projects', { body: invalidReceipt('known') });
  await view.act(() => perform('create'));
  const originalFetch = global.fetch;
  let release, received, pending;
  const gate = new Promise(resolve => { release = resolve; });
  const ready = new Promise(resolve => { received = resolve; });
  t.mock.method(global, 'fetch', async (...args) => {
    const response = await originalFetch(...args);
    if (String(args[0]).startsWith('/projects-page')) { received(); await gate; }
    return response;
  });
  const reads = harness.bffProject.requests.length;
  try {
    await view.act(() => { pending = view.props('ProjectsWorkspace').readNewProjectCatalogue(); });
    await ready;
    assert.equal(view.props('CreateProjectModal').verificationPending, true);
    await view.act(() => view.props('ProjectsWorkspace').readNewProjectCatalogue());
    assert.equal(harness.bffProject.requests.length, reads + 1);
    release(); await pending; await view.settle();
    assert.equal(view.props('CreateProjectModal').verificationRequired, true);
    assert.equal(writes().length, 1);
  } finally { release(); await pending; await view.settle(); }
});

test('a late duplicate cannot reuse the ID already confirmed by a different new-project request', async t => {
  await loaded();
  const created = f.projectListItem({ id: 'new-shared-id', title: 'Création concurrente confirmée' });
  harness.bffProject.on('post', '/projects/{projectId}/duplicate', {
    body: f.projectDetails({ ...created, title: 'Copie incohérente arrivée ensuite' }),
  });
  harness.bffProject.on('post', '/projects', { status: 201, body: f.projectDetails(created) });
  harness.bffProject.on('get', '/projects-page', { body: f.projectsPage([first, second, created]) });
  const originalFetch = global.fetch;
  let release, received, pending;
  const gate = new Promise(resolve => { release = resolve; });
  const ready = new Promise(resolve => { received = resolve; });
  t.mock.method(global, 'fetch', async (...args) => {
    const response = await originalFetch(...args);
    if (args[0] === `/projects/${first.id}/duplicate` && args[1]?.method === 'POST') {
      received(); await gate;
    }
    return response;
  });
  try {
    await view.act(() => { pending = perform('duplicate'); });
    await ready;
    await prepare('create');
    await view.act(() => perform('create'));
    assert.equal(view.props('ProjectsWorkspace').projects.find(project => project.id === created.id).title, created.title);
    release(); await pending; await view.settle();
    assert.equal(view.props('ProjectsWorkspace').projects.find(project => project.id === created.id).title, created.title);
    assert.equal(view.props('ProjectsWorkspace').newProjectReceiptIssues.has(keyFor('duplicate')), true);
    assert.equal(view.props('ProjectDetailModal').project.title, created.title);
    await view.act(() => perform('duplicate'));
    assert.equal(writes().length, 2);
  } finally { release(); await pending; await view.settle(); }
});

for (const mode of ['kanban', 'grid', 'table']) {
  test(`${mode}: an uncertain duplicate is visibly blocked without changing server permissions`, async () => {
    await loaded();
    harness.bffProject.on('post', pathFor('duplicate'), { body: invalidReceipt('known') });
    await view.act(() => perform('duplicate'));
    await view.act(() => view.props('ProjectsWorkspace').setViewMode(mode));
    await view.waitFor(() => !view.props('ProjectsWorkspace').pageLoading);
    await view.click(props => props['aria-label'] === `Actions pour ${first.title}`);
    const blocked = view.hostElements((props, text, tag) => tag === 'button' && props.role === 'menuitem' && text === 'Copie à vérifier');
    assert.equal(blocked.length, 1);
    assert.equal(blocked[0].props.disabled, true);
    assert.equal(blocked[0].props['aria-busy'], undefined, 'uncertainty is not a still-running request');
    assert.equal(view.props('ProjectsWorkspace').projects[0].permissions.canDuplicate, first.permissions.canDuplicate);
    await view.click(props => props['aria-label'] === `Actions pour ${first.title}`);
    await view.click(props => props['aria-label'] === `Actions pour ${second.title}`);
    const available = view.hostElements((props, text, tag) => tag === 'button' && props.role === 'menuitem' && text === 'Dupliquer');
    assert.equal(available.length, 1);
    assert.equal(available[0].props.disabled, false);
    assert.equal(writes().length, 1);
  });
}

for (const operation of ['create', 'duplicate']) {
  for (const response of ['refused', 'foreign', 'repeated-tasks']) {
    test(`${operation}: distinct receipt detail ${response} keeps uncertainty until a coherent GET only`, async () => {
      await loaded(); await prepare(operation);
      const created = f.projectListItem({ id: 'new-id', title: 'Projet vérifié par sa fiche' });
      harness.bffProject.on('post', pathFor(operation), { status: 201, body: invalidReceipt('task-collision') });
      await view.act(() => perform(operation));
      const key = keyFor(operation);
      assert.equal(view.props('ProjectsWorkspace').newProjectReceiptIssues.get(key).verificationId, created.id);
      if (operation === 'duplicate') assert.equal(view.props('ProjectsWorkspace').alert.message, 'Le nouveau projet est identifié, mais les tâches de son reçu sont incohérentes. Vérifiez sa fiche sans répéter l’action.');
      const reads = harness.bffProject.requests.length;
      const bad = response === 'refused' ? harness.errorReply(503, f.apiError('READ', 'Fiche indisponible'))
        : { body: response === 'foreign' ? f.projectDetails(second) : invalidReceipt('task-collision') };
      harness.bffProject.on('get', '/projects/{projectId}', bad);
      await view.act(() => view.props('ProjectsWorkspace').verifyNewProjectReceipt(key));
      assert.equal(view.props('ProjectsWorkspace').newProjectReceiptIssues.has(key), true);
      assert.equal(view.props('ProjectsWorkspace').newProjectReceiptErrors.has(key), true);
      assert.equal(harness.bffProject.requests.length, reads + 1);
      assert.equal(harness.bffProject.requests.at(-1).path, `/projects/${created.id}`);
      assert.equal(view.props('ProjectsWorkspace').projects.some(p => p.id === created.id), false);
      harness.bffProject.on('get', '/projects/{projectId}', { body: f.projectDetails(created, [f.projectTask()]) });
      await view.act(() => view.props('ProjectsWorkspace').verifyNewProjectReceipt(key));
      assert.equal(view.props('ProjectsWorkspace').newProjectReceiptIssues.has(key), false);
      assert.equal(view.props('ProjectsWorkspace').newProjectReceiptErrors.has(key), false);
      assert.equal(view.props('ProjectsWorkspace').newProjectReceiptPendingKeys.size, 0);
      assert.equal(view.props('ProjectsWorkspace').projects.find(p => p.id === created.id).title, created.title);
      assert.equal(view.props('ProjectsWorkspace').projects.find(p => p.id === second.id).title, second.title);
      assert.equal(writes().length, 1);
      if (operation === 'create') {
        assert.equal(view.props('CreateProjectModal').form.title, 'Brouillon de nouvelle création');
        assert.equal(view.props('CreateProjectModal').confirmedCreationTitle, created.title);
        await view.act(() => perform(operation));
        assert.equal(writes().length, 1, 'confirmed create form is still not a new POST');
        await view.act(() => view.props('CreateProjectModal').onClose());
        await view.act(() => view.props('ProjectsWorkspace').openCreateProject());
        assert.equal(view.props('CreateProjectModal').form.title, '');
        assert.equal(view.props('CreateProjectModal').confirmedCreationTitle, undefined);
      }
    });
  }

  test(`${operation}: matching current consultation resolves distinct receipt without catalogue inference`, async () => {
    await loaded(); await prepare(operation);
    harness.bffProject.on('post', pathFor(operation), { status: 201, body: invalidReceipt('task-collision') });
    await view.act(() => perform(operation));
    const created = f.projectListItem({ id: 'new-id', title: 'Projet consulté vérifié' });
    harness.bffProject.on('get', '/projects/{projectId}', { body: f.projectDetails(created) });
    await view.act(() => view.props('ProjectsWorkspace').openProjectDetails(created));
    assert.equal(view.props('ProjectDetailModal').project.id, created.id);
    assert.equal(view.props('ProjectsWorkspace').newProjectReceiptIssues.has(keyFor(operation)), false);
    assert.equal(writes().length, 1);
  });
}

test('two distinct-receipt verification dispatches share GET and retain a continued creation draft', async t => {
  await loaded(); await prepare('create');
  const created = f.projectListItem({ id: 'new-id', title: 'Confirmation officielle' });
  harness.bffProject.on('post', '/projects', { status: 201, body: invalidReceipt('task-collision') });
  await view.act(() => perform('create'));
  harness.bffProject.on('get', '/projects/{projectId}', { body: f.projectDetails(created) });
  const originalFetch = global.fetch;
  let release, received, pending;
  const gate = new Promise(resolve => { release = resolve; });
  const ready = new Promise(resolve => { received = resolve; });
  t.mock.method(global, 'fetch', async (...args) => {
    const response = await originalFetch(...args);
    if (args[0] === `/projects/${created.id}`) { received(); await gate; }
    return response;
  });
  const reads = harness.bffProject.requests.length;
  try {
    await view.act(() => { pending = view.props('ProjectsWorkspace').verifyNewProjectReceipt('create'); });
    await ready;
    assert.equal(view.props('CreateProjectModal').verificationPending, true);
    await view.act(() => view.props('CreateProjectModal').onChange({ title: 'Saisie poursuivie pendant GET' }));
    await view.act(() => view.props('ProjectsWorkspace').verifyNewProjectReceipt('create'));
    assert.equal(harness.bffProject.requests.length, reads + 1);
    release(); await pending; await view.settle();
    assert.equal(view.props('CreateProjectModal').form.title, 'Saisie poursuivie pendant GET');
    assert.equal(view.props('CreateProjectModal').confirmedCreationTitle, created.title);
    await view.act(() => perform('create'));
    assert.equal(writes().length, 1);
  } finally { release(); await pending; await view.settle(); }
});

test('two accepted new writes claiming the same pending identity cannot be attributed by a GET', async () => {
  await loaded(); await prepare('create');
  harness.bffProject.on('post', '/projects', { status: 201, body: invalidReceipt('task-collision') });
  harness.bffProject.on('post', '/projects/{projectId}/duplicate', { status: 201, body: invalidReceipt('task-collision') });
  await view.act(() => perform('create'));
  await view.act(() => perform('duplicate'));
  const issues = view.props('ProjectsWorkspace').newProjectReceiptIssues;
  assert.equal(issues.get('create').verificationId, undefined);
  assert.equal(issues.get(keyFor('duplicate')).verificationId, undefined);
  const created = f.projectListItem({ id: 'new-id', title: 'Identité ambiguë' });
  harness.bffProject.on('get', '/projects/{projectId}', { body: f.projectDetails(created) });
  await view.act(() => view.props('ProjectsWorkspace').openProjectDetails(created));
  assert.equal(view.props('ProjectsWorkspace').newProjectReceiptIssues.size, 2);
  assert.equal(view.props('ProjectsWorkspace').verifiedCreation, null);
  assert.equal(writes().length, 2);
});

test('an abandoned consultation cannot resolve a distinct receipt or reopen another detail', async t => {
  await loaded(); await prepare('duplicate');
  harness.bffProject.on('post', pathFor('duplicate'), { status: 201, body: invalidReceipt('task-collision') });
  await view.act(() => perform('duplicate'));
  const created = f.projectListItem({ id: 'new-id', title: 'Fiche ancienne abandonnée' });
  harness.bffProject.on('get', '/projects/{projectId}', ({ pathParams }) => ({ body: f.projectDetails(pathParams.projectId === created.id ? created : second) }));
  const originalFetch = global.fetch;
  let release, received, pending;
  const gate = new Promise(resolve => { release = resolve; });
  const ready = new Promise(resolve => { received = resolve; });
  t.mock.method(global, 'fetch', async (...args) => {
    const response = await originalFetch(...args);
    if (args[0] === `/projects/${created.id}`) { received(); await gate; }
    return response;
  });
  try {
    await view.act(() => { pending = view.props('ProjectsWorkspace').openProjectDetails(created); });
    await ready;
    await view.act(() => view.props('ProjectsWorkspace').openProjectDetails(second));
    release(); await pending; await view.settle();
    assert.equal(view.props('ProjectDetailModal').project.id, second.id);
    assert.equal(view.props('ProjectsWorkspace').newProjectReceiptIssues.has(keyFor('duplicate')), true);
    assert.equal(writes().length, 1);
  } finally { release(); await pending; await view.settle(); }
});

test('verification after closing creation leaves a different editor and consultation untouched', async () => {
  await loaded(); await prepare('create');
  harness.bffProject.on('post', '/projects', { status: 201, body: invalidReceipt('task-collision') });
  await view.act(() => perform('create'));
  await view.act(() => view.props('CreateProjectModal').onChange({ title: 'Dernier brouillon avant fermeture' }));
  await view.act(() => view.props('CreateProjectModal').onClose());
  await view.act(() => view.props('ProjectsWorkspace').openProjectDetails(second));
  await view.act(() => view.props('ProjectsWorkspace').openEditProject(second));
  await view.act(() => view.props('CreateProjectModal').onChange({ title: 'Autre édition préservée' }));
  const created = f.projectListItem({ id: 'new-id', title: 'Création vérifiée en arrière-plan' });
  harness.bffProject.on('get', '/projects/{projectId}', { body: f.projectDetails(created) });
  await view.act(() => view.props('ProjectsWorkspace').verifyNewProjectReceipt('create'));
  assert.equal(view.props('CreateProjectModal').mode, 'edit');
  assert.equal(view.props('CreateProjectModal').form.title, 'Autre édition préservée');
  assert.equal(view.props('CreateProjectModal').confirmedCreationTitle, undefined);
  assert.equal(view.props('ProjectDetailModal').project.id, second.id);
  await view.act(() => view.props('CreateProjectModal').onClose());
  await view.act(() => view.props('ProjectsWorkspace').openCreateProject());
  assert.equal(view.props('CreateProjectModal').form.title, 'Dernier brouillon avant fermeture');
  assert.equal(view.props('CreateProjectModal').confirmedCreationTitle, created.title);
  await view.act(() => perform('create'));
  assert.equal(writes().length, 1);
});
