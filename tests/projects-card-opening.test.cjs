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
let view;
const first = f.projectListItem();
const second = f.projectListItem({ id: 'project-2', title: 'Projet choisi ensuite' });
before(() => harness.start());
after(() => harness.stop());
beforeEach(() => { harness.reset(); harness.signIn(f.jwt(f.agents.marie.id)); harness.location.search = ''; });
afterEach(() => { view?.unmount(); view = undefined; assert.deepEqual(harness.violations(), []); });
async function loaded() {
  harness.bffProject.on('get', '/projects-page', { body: f.projectsPage([first, second]) });
  harness.bffProject.on('get', '/projects/{projectId}', ({ pathParams }) => ({ body: f.projectDetails(pathParams.projectId === first.id ? first : second) }));
  view = mount(React.createElement(Page));
  await view.waitFor(html => !html.includes('Chargement des projets'));
}
function holdFirstDetail(t, projectId) {
  let release, held = 0;
  const gate = new Promise(resolve => { release = resolve; });
  const fetch = global.fetch;
  t.mock.method(global, 'fetch', async (input, init) => {
    const response = await fetch(input, init);
    if (input === `/projects/${projectId}` && (!init?.method || init.method === 'GET') && held === 0) { ++held; await gate; }
    return response;
  });
  return { release: () => release(), started: () => held > 0 };
}
function assertOwner(project) {
  const workspace = view.props('ProjectsWorkspace');
  assert.equal(workspace.editingProjectId, project.id);
  assert.equal(view.props('CreateProjectModal').mode, 'edit');
  assert.equal(view.props('CreateProjectModal').form.title, project.title);
}

for (const refused of [false, true]) {
  for (const next of ['other-edit', 'create', 'close']) {
    test(`an obsolete card opening ${refused ? 'refusal' : 'success'} respects ${next} without writes`, async t => {
      await loaded();
      if (refused) harness.bffProject.on('get', '/projects/{projectId}', harness.errorReply(503, f.apiError('OLD_READ', 'Ancien chargement refusé')));
      const held = holdFirstDetail(t, first.id);
      let pending;
      try {
        await view.act(() => { pending = view.props('KanbanBoard').onProjectEdit(first); });
        await view.waitFor(held.started);
        if (next === 'other-edit') {
          harness.bffProject.on('get', '/projects/{projectId}', { body: f.projectDetails(second) });
          await view.act(() => view.props('KanbanBoard').onProjectEdit(second));
          assertOwner(second);
        } else if (next === 'create') {
          await view.act(() => view.props('ProjectsWorkspace').openCreateProject());
          await view.act(() => view.props('CreateProjectModal').onChange({ title: 'Brouillon de création', description: 'Saisie intacte', taskItems: [f.projectTask({ id: 'draft-task', title: 'Tâche du brouillon' })] }));
        } else await view.act(() => view.props('ProjectsWorkspace').closeCreateProject());
        const draft = next === 'create' ? structuredClone(view.props('CreateProjectModal').form) : null;
        held.release(); await pending; await view.settle();
        if (next === 'other-edit') assertOwner(second);
        else if (next === 'create') {
          assert.equal(view.props('CreateProjectModal').mode, 'create');
          assert.equal(view.props('ProjectsWorkspace').editingProjectId, null);
          assert.deepEqual(view.props('CreateProjectModal').form, draft);
        } else assert.equal(view.find('CreateProjectModal').length, 0);
        assert.doesNotMatch(view.text(), /Ancien chargement refusé/);
        assert.equal(harness.bffProject.requests.filter(r => r.method !== 'GET').length, 0);
      } finally { held.release(); await pending; await view.settle(); }
    });
  }
}

test('reopening the same project has a new lifetime and retains its newest official form', async t => {
  await loaded();
  const held = holdFirstDetail(t, first.id);
  let pending;
  try {
    await view.act(() => { pending = view.props('KanbanBoard').onProjectEdit(first); });
    await view.waitFor(held.started);
    await view.act(() => view.props('ProjectsWorkspace').closeCreateProject());
    const latest = { ...first, title: 'Lecture de la nouvelle ouverture' };
    harness.bffProject.on('get', '/projects/{projectId}', { body: f.projectDetails(latest) });
    await view.act(() => view.props('KanbanBoard').onProjectEdit(first));
    assertOwner(latest);
    held.release(); await pending; await view.settle();
    assertOwner(latest);
    assert.equal(harness.bffProject.requests.filter(r => r.method !== 'GET').length, 0);
  } finally { held.release(); await pending; await view.settle(); }
});

test('a pending replacement does not retarget the displayed form; continuing its draft cancels replacement', async t => {
  await loaded();
  await view.act(() => view.props('KanbanBoard').onProjectEdit(first));
  const held = holdFirstDetail(t, second.id);
  let pending;
  try {
    await view.act(() => { pending = view.props('KanbanBoard').onProjectEdit(second); });
    await view.waitFor(held.started);
    assertOwner(first);
    await view.act(() => view.props('CreateProjectModal').onChange({ title: 'Brouillon poursuivi', labels: ['saisie'], taskItems: [f.projectTask({ title: 'Tâche non envoyée' })] }));
    const draft = structuredClone(view.props('CreateProjectModal').form);
    held.release(); await pending; await view.settle();
    assert.equal(view.props('ProjectsWorkspace').editingProjectId, first.id);
    assert.deepEqual(view.props('CreateProjectModal').form, draft);
    assert.equal(harness.bffProject.requests.filter(r => r.method !== 'GET').length, 0);
  } finally { held.release(); await pending; await view.settle(); }
});

test('submitting the displayed form keeps its target and cannot be reopened by a pending replacement', async t => {
  await loaded();
  await view.act(() => view.props('KanbanBoard').onProjectEdit(first));
  await view.act(() => view.props('CreateProjectModal').onChange({ title: 'Formulaire du premier projet' }));
  const held = holdFirstDetail(t, second.id);
  let pending;
  try {
    await view.act(() => { pending = view.props('KanbanBoard').onProjectEdit(second); });
    await view.waitFor(held.started);
    harness.bffProject.on('patch', '/projects/{projectId}', ({ pathParams, body }) => ({ body: f.projectDetails({ ...first, id: pathParams.projectId, title: body.title }) }));
    await view.act(() => view.props('CreateProjectModal').onSubmit({ preventDefault() {} }));
    held.release(); await pending; await view.settle();
    const writes = harness.bffProject.calls('/projects/{projectId}', 'patch');
    assert.equal(writes.length, 1);
    assert.equal(writes[0].pathParams.projectId, first.id);
    assert.equal(writes[0].body.title, 'Formulaire du premier projet');
    assert.equal(view.find('CreateProjectModal').length, 0);
  } finally { held.release(); await pending; await view.settle(); }
});

for (const invalid of ['foreign-project', 'duplicate-task', 'denied-permission']) {
  test(`a current ${invalid} detail cannot supply a misleading card editor`, async () => {
    await loaded();
    const details = invalid === 'foreign-project' ? f.projectDetails(second)
      : invalid === 'duplicate-task' ? f.projectDetails(first, [f.projectTask(), f.projectTask({ title: 'ID répété' })])
      : f.projectDetails({ ...first, permissions: { ...first.permissions, canEdit: false } });
    harness.bffProject.on('get', '/projects/{projectId}', { body: details });
    await view.act(() => view.props('KanbanBoard').onProjectEdit(first));
    assert.equal(view.find('CreateProjectModal').length, 0);
    assert.match(view.text(), invalid === 'denied-permission' ? /non autorisée/ : /incohérents/);
    assert.equal(harness.bffProject.requests.filter(r => r.method !== 'GET').length, 0);
  });
}

test('an explicitly denied card permission does not request an editor', async () => {
  await loaded();
  const before = harness.bffProject.requests.length;
  await view.act(() => view.props('KanbanBoard').onProjectEdit({ ...first, permissions: { ...first.permissions, canEdit: false } }));
  assert.equal(harness.bffProject.requests.length, before);
  assert.equal(view.find('CreateProjectModal').length, 0);
});

test('a current forbidden detail does not open an editor using stale permissions', async () => {
  await loaded();
  harness.bffProject.on('get', '/projects/{projectId}', harness.errorReply(403, f.apiError('FORBIDDEN', 'Accès à la fiche refusé')));
  await view.act(() => view.props('KanbanBoard').onProjectEdit(first));
  assert.equal(view.find('CreateProjectModal').length, 0);
  assert.match(view.text(), /Accès à la fiche refusé/);
  assert.equal(harness.bffProject.requests.filter(r => r.method !== 'GET').length, 0);
});

test('a current unavailable read can use the displayed project with an accessible stale-data warning', async () => {
  await loaded();
  harness.bffProject.on('get', '/projects/{projectId}', harness.errorReply(503, f.apiError('READ', 'Chargement récent indisponible')));
  await view.act(() => view.props('KanbanBoard').onProjectEdit(first));
  assertOwner(first);
  assert.deepEqual(view.props('CreateProjectModal').form, projectToFormState(first));
  assert.match(view.props('CreateProjectModal').error, /Chargement récent indisponible/);
  assert.match(view.props('CreateProjectModal').error, /projet déjà affiché/);
  assert.equal(harness.bffProject.requests.filter(r => r.method !== 'GET').length, 0);
});

for (const denied of ['permission', '403']) {
  test(`a newly denied ${denied} read closes that project's older editor`, async () => {
    await loaded();
    await view.act(() => view.props('KanbanBoard').onProjectEdit(first));
    assertOwner(first);
    harness.bffProject.on('get', '/projects/{projectId}', denied === 'permission'
      ? { body: f.projectDetails({ ...first, permissions: { ...first.permissions, canEdit: false } }) }
      : harness.errorReply(403, f.apiError('FORBIDDEN', 'Droit actuel refusé')));
    await view.act(() => view.props('KanbanBoard').onProjectEdit(first));
    assert.equal(view.find('CreateProjectModal').length, 0);
    assert.equal(view.props('ProjectsWorkspace').editingProjectId, null);
    assert.equal(harness.bffProject.requests.filter(r => r.method !== 'GET').length, 0);
  });
}

test('continuing an unsent nested task cancels a pending card replacement without moving its owner', async t => {
  await loaded();
  await view.act(() => view.props('KanbanBoard').onProjectEdit(first));
  const held = holdFirstDetail(t, second.id);
  let pending;
  try {
    await view.act(() => { pending = view.props('KanbanBoard').onProjectEdit(second); });
    await view.waitFor(held.started);
    // The real browser dispatches capture before the nested input handler.
    const form = view.hostElements((props, text, tag) => tag === 'form' && props.role === 'dialog')[0];
    await view.act(() => form.props.onChangeCapture?.({}));
    await view.fire(props => props.placeholder === 'Ajouter une tâche...', 'onChange', { target: { value: 'Brouillon imbriqué poursuivi' } });
    held.release(); await pending; await view.settle();
    assertOwner(first);
    assert.equal(view.hostElements(props => props.placeholder === 'Ajouter une tâche...')[0].props.value, 'Brouillon imbriqué poursuivi');
    assert.equal(harness.bffProject.requests.filter(r => r.method !== 'GET').length, 0);
  } finally { held.release(); await pending; await view.settle(); }
});

test('an intentional new card owner cannot inherit another project\'s unsent nested task draft', async () => {
  await loaded();
  await view.act(() => view.props('KanbanBoard').onProjectEdit(first));
  await view.fire(props => props.placeholder === 'Ajouter une tâche...', 'onChange', { target: { value: 'Brouillon uniquement pour A' } });
  await view.act(() => view.props('KanbanBoard').onProjectEdit(second));
  assertOwner(second);
  assert.equal(view.hostElements(props => props.placeholder === 'Ajouter une tâche...')[0].props.value, '');
  assert.equal(harness.bffProject.requests.filter(r => r.method !== 'GET').length, 0);
});
