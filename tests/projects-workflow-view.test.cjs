const assert = require('node:assert/strict');
const { test, afterEach } = require('node:test');
const { requireTs } = require('./support/typescript.cjs');
const { installReactRuntime, mount } = require('./support/server-view.cjs');
installReactRuntime();
const React = require('react');
const { ProjectWorkflow } = requireTs('src/components/ProjectsWorkspace/components/ProjectDetailModal/components/ProjectWorkflow/ProjectWorkflow.tsx');
const { ProjectTemplatePicker } = requireTs('src/components/ProjectsWorkspace/components/CreateProjectModal/components/ProjectTemplatePicker/ProjectTemplatePicker.tsx');
const { ProjectTemplateManager } = requireTs('src/components/ProjectsWorkspace/components/ProjectTemplateManager/ProjectTemplateManager.tsx');
const statuses = [
  { id: 'status-1', name: 'Demandes reçues', color: '#1256a6', category: 'todo' },
  { id: 'status-2', name: 'Conseil municipal', color: '#4b908d', category: 'inprogress' },
  { id: 'status-3', name: 'Dossiers clos', color: '#267845', category: 'done' },
];
const snapshot = { projectId: 'project-1', revision: 'v1', statuses, tasks: [{ id: 'task-1', title: 'Préparer le conseil', statusId: 'status-2', canUpdateStatus: true }] };
const template = { id: 'template-1', revision: 'r1', name: 'Modèle municipal', statuses };
const port = { readProject: async () => snapshot, readTemplates: async () => [template] };
let view;
afterEach(() => { view?.unmount(); view = undefined; });

test('server-view: Kanban uses the statuses of the selected project', async () => {
  view = mount(React.createElement(ProjectWorkflow, { projectId: 'project-1', role: 'User', port }));
  await view.waitFor(html => html.includes('Préparer le conseil'));
  assert.match(view.html, /aria-label="Demandes reçues"/);
  assert.match(view.html, /aria-label="Conseil municipal"/);
  assert.match(view.html, /aria-label="Dossiers clos"/);
  assert.doesNotMatch(view.html, /Paramétrer les statuts/);
  const selector = view.hostElements((props, _text, tag) => tag === 'select' && props.value === 'status-2');
  assert.equal(selector.length, 1);
  assert.equal(selector[0].props.disabled, true);
});

test('server-view: a responsible configures a status and sees success only from its confirmed receipt', async () => {
  view = mount(React.createElement(ProjectWorkflow, { projectId: 'project-1', role: 'Responsable', port: { ...port, saveProjectStatuses: async draft => ({ ...snapshot, revision: 'v2', statuses: draft.statuses }) } }));
  await view.waitFor(html => html.includes('Paramétrer les statuts'));
  await view.fire((_props, text, tag) => tag === 'button' && text === 'Paramétrer les statuts', 'onClick');
  await view.fire((props, _text, tag) => tag === 'input' && props.value === 'Demandes reçues', 'onChange', { target: { value: 'Demandes à instruire' } });
  await view.fire((props, _text, tag) => tag === 'form' && props['aria-label'] === 'Paramétrage des statuts', 'onSubmit', { preventDefault() {} });
  await view.waitFor(html => html.includes('Statuts enregistrés.'));
  assert.match(view.html, /aria-label="Demandes à instruire"/);
});

test('server-view: template selection previews ordered statuses and carries the selected template', async () => {
  let selected;
  view = mount(React.createElement(ProjectTemplatePicker, { port, onChange: value => { selected = value; } }));
  await view.waitFor(html => html.includes('Modèle municipal'));
  await view.fire((_props, _text, tag) => tag === 'select', 'onChange', { target: { value: 'template-1' } });
  assert.match(view.html, /aria-label="Statuts du modèle"/);
  assert.ok(view.html.indexOf('Demandes reçues') < view.html.indexOf('Conseil municipal'));
  assert.equal(selected.id, 'template-1');
  assert.equal(selected.revision, 'r1');
});

for (const role of ['User', 'Guest', 'Maire', undefined]) {
  test(`server-view: template management is unavailable for role ${role}`, async () => {
    view = mount(React.createElement(ProjectTemplateManager, { role, port }));
    await view.settle();
    assert.doesNotMatch(view.html, /Gérer les modèles|Enregistrer le modèle/);
  });
}
