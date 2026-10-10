const assert = require('node:assert/strict');
const { test, before, after, beforeEach, afterEach } = require('node:test');
const { requireTs } = require('./support/typescript.cjs');
const { installReactRuntime, mount } = require('./support/server-view.cjs');

installReactRuntime();
const React = require('react');
const { createFrontHarness } = require('./support/front-harness.cjs');
const fixtures = require('./support/bff-fixtures.cjs');
const Page = requireTs('src/app/page.tsx').default;
const harness = createFrontHarness();
let view;
before(() => harness.start());
after(() => harness.stop());
beforeEach(() => { harness.reset(); harness.signIn(fixtures.jwt(fixtures.agents.marie.id)); });
afterEach(() => { view?.unmount(); view = undefined; assert.deepEqual(harness.violations(), []); });

const draft = () => ({
  title: 'Projet de recette', description: 'Brouillon à conserver après refus',
  dueDate: '2026-11-17', responsible: fixtures.people.marie.id,
  assignees: [fixtures.people.marie.id, fixtures.people.alice.id],
  labels: ['voirie'], priority: 'high', status: 'review',
  taskItems: [fixtures.projectTask()], totalTasks: 1, completedTasks: 0, progress: 0,
});
async function openForm(mode) {
  harness.bffProject.on('get', '/projects-page', { body: fixtures.projectsPage() });
  harness.bffProject.on('get', '/projects/{projectId}', { body: fixtures.projectDetails() });
  view = mount(React.createElement(Page));
  await view.waitFor((html) => !html.includes('Chargement des projets'));
  if (mode === 'create') await view.click('Nouveau projet');
  else await view.act(() => view.props('KanbanBoard').onProjectEdit(view.props('KanbanBoard').projects[0]));
  await view.act(() => view.props('CreateProjectModal').onChange(draft()));
}
function delayWrite(method) {
  const original = global.fetch;
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  let started = 0;
  global.fetch = async (input, init) => {
    if (init?.method === method && (input === '/api/bff/projects' || input === '/api/bff/projects/project-1')) {
      started += 1;
      await gate;
    }
    return original(input, init);
  };
  return { release, started: () => started, restore: () => { global.fetch = original; } };
}

for (const mode of ['create', 'edit']) {
  const method = mode === 'create' ? 'post' : 'patch';
  const path = mode === 'create' ? '/projects' : '/projects/{projectId}';
  test(`${mode}: pending submission guards duplicate events, draft changes and dismissal; refusal allows retry`, async () => {
    await openForm(mode);
    harness.bffProject.on(method, path, harness.errorReply(503, fixtures.apiError('UNAVAILABLE', 'Écriture indisponible')));
    const beforeDraft = structuredClone(view.props('CreateProjectModal').form);
    const pending = delayWrite(method.toUpperCase());
    const submissions = [];
    try {
      const callbacks = view.props('CreateProjectModal');
      submissions.push(callbacks.onSubmit({ preventDefault() {} }));
      submissions.push(callbacks.onSubmit({ preventDefault() {} }));
      // Callbacks captured before React could render disabled controls must also be guarded.
      callbacks.onChange({ title: 'Modification pendant attente', taskItems: [] });
      callbacks.onClose();
      await view.settle();
      assert.equal(pending.started(), 1);
      assert.equal(view.props('CreateProjectModal').pending, true);
      assert.deepEqual(view.props('CreateProjectModal').form, beforeDraft);
      assert.match(view.html, /<form[^>]*role="dialog"[^>]*aria-busy="true"/);
      assert.match(view.html, /<fieldset[^>]*disabled=""/);
      assert.match(view.html, /role="status"[^>]*>Enregistrement en cours/);
      assert.equal(view.hostElements((props, text, tag) => tag === 'button' && text === 'Annuler' && props.disabled).length, 1);
      assert.equal(view.hostElements((props, text, tag) => tag === 'button' && /Fermer la (création|modification) de projet/.test(props['aria-label'] ?? '') && props.disabled).length, 1);
      await view.fire((props, text, tag) => tag === 'form' && props.role === 'dialog', 'onKeyDown', {
        key: 'Escape', defaultPrevented: false, nativeEvent: { isComposing: false }, preventDefault() {}, stopPropagation() {},
      });
      assert.equal(view.find('CreateProjectModal').length, 1);
      pending.release();
      await Promise.all(submissions);
      await view.settle();
      assert.equal(harness.bffProject.calls(path, method).length, 1);
      assert.equal(view.props('CreateProjectModal').pending, false);
      assert.deepEqual(view.props('CreateProjectModal').form, beforeDraft);
      assert.equal(view.props('CreateProjectModal').error, 'Écriture indisponible');
      assert.match(view.html, /role="alert"[^>]*>Écriture indisponible/);
      assert.doesNotMatch(view.html, /<fieldset[^>]*disabled=""/);
      const details = fixtures.projectDetails(fixtures.projectListItem({ id: mode === 'create' ? 'project-created' : 'project-1', title: draft().title }), draft().taskItems);
      harness.bffProject.on(method, path, { status: mode === 'create' ? 201 : 200, body: details });
      await view.act(() => view.props('CreateProjectModal').onSubmit({ preventDefault() {} }));
      assert.equal(harness.bffProject.calls(path, method).length, 2);
      assert.equal(view.find('CreateProjectModal').length, 0);
      await view.click('Nouveau projet');
      assert.equal(view.props('CreateProjectModal').form.title, '');
      assert.deepEqual(view.props('CreateProjectModal').form.taskItems, []);
      await view.act(() => view.props('CreateProjectModal').onClose());
      assert.equal(view.find('CreateProjectModal').length, 0);
    } finally {
      pending.release();
      await Promise.allSettled(submissions);
      pending.restore();
    }
  });

  test(`${mode}: confirmed write closes the form even when the following read fails; no write replay`, async () => {
    await openForm(mode);
    const official = fixtures.projectListItem({
      id: mode === 'create' ? 'project-created' : 'project-1',
      title: 'Nom officiel confirmé',
      permissions: { ...fixtures.projectListItem().permissions, canEdit: false },
    });
    const details = fixtures.projectDetails(official, draft().taskItems);
    harness.bffProject.on(method, path, { status: mode === 'create' ? 201 : 200, body: details });
    harness.bffProject.on('get', '/projects-page', harness.errorReply(503, fixtures.apiError('UNAVAILABLE', 'Lecture indisponible')));
    await view.act(() => view.props('CreateProjectModal').onSubmit({ preventDefault() {} }));
    assert.equal(view.find('CreateProjectModal').length, 0);
    assert.equal(harness.bffProject.calls(path, method).length, 1);
    assert.match(view.text(), /Lecture indisponible/);
    assert.equal(view.props('Alert').type, 'info', 'the confirmed write must not be presented as refused');
    assert.match(view.props('Alert').message, /enregistré\. Actualisation impossible/);
    assert.equal(view.find('ProjectDetailModal').length, mode === 'create' ? 1 : 0);
    const received = view.props('KanbanBoard').projects;
    assert.equal(received.filter(project => project.id === official.id).length, 1);
    assert.equal(received.find(project => project.id === official.id).title, official.title);
    assert.equal(received.find(project => project.id === official.id).permissions.canEdit, false);
    if (mode === 'create') await view.act(() => view.props('ProjectDetailModal').onClose());
    harness.bffProject.on('get', '/projects-page', { body: fixtures.projectsPage(mode === 'create' ? [fixtures.projectListItem(), official] : [official]) });
    await view.click((props, text, tag) => tag === 'button' && text === 'Réessayer');
    await view.waitFor(() => view.hostElements((props, text, tag) => tag === 'button' && text === 'Réessayer').length === 0);
    assert.equal(harness.bffProject.calls(path, method).length, 1, 'read recovery must not replay the confirmed form write');
    assert.equal(view.find('CreateProjectModal').length, 0);
  });
}
