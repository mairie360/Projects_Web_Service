const assert = require('node:assert/strict');
const { test } = require('node:test');
const { requireTs } = require('./support/typescript.cjs');
const { createPublishedProjectWorkflowPort } = requireTs('src/lib/publishedProjectWorkflow.ts');

// MAIR-567: the adapter between the published BFF_Project operations and the project workflow port.
const signal = () => new AbortController().signal;
const statuses = [
  { id: 'status-1', name: 'À instruire', color: '#1256a6', category: 'todo', position: 0, taskCount: 0 },
  { id: 'status-2', name: 'Validation', color: '#4b908d', category: 'in-progress', position: 1, taskCount: 1 },
  { id: 'status-3', name: 'Archivé', color: '#267845', category: 'done', position: 2, taskCount: 0 },
];
const task = { id: 'task-1', title: 'Dossier scolaire', statusId: 'status-2', permissions: { canUpdateStatus: true } };
const emptyArchive = { data: { tasks: [], pagination: { page: 1, limit: 100, total: 0, hasNextPage: false } } };
const service = (overrides = {}) => ({
  getProjectsProjectIdStatuses: async () => ({ data: { statuses } }),
  getProjectsProjectId: async () => ({ data: { project: { id: 'project-1' }, taskItems: [task] } }),
  getProjectsProjectIdArchivedTasks: async () => emptyArchive,
  ...overrides,
});
const templateStatuses = [
  { name: 'Demande', color: '#1256a6', category: 'todo', position: 0 },
  { name: 'Instruction', color: '#4b908d', category: 'in-progress', position: 1 },
  { name: 'Clos', color: '#267845', category: 'done', position: 2 },
];

test('MAIR-567: reading maps service categories and follows every archived page', async () => {
  const port = createPublishedProjectWorkflowPort(service({
    getProjectsProjectIdArchivedTasks: async (_id, { page }) => ({ data: {
      tasks: [{ id: `old-${page}`, title: `Archive ${page}`, statusId: 'status-3', permissions: { canUpdateStatus: false } }],
      pagination: { page, limit: 100, total: 2, hasNextPage: page < 2 },
    } }),
  }));
  const snapshot = await port.readProject('project-1', signal());
  assert.equal(snapshot.statuses[1].category, 'inprogress');
  assert.deepEqual(snapshot.tasks.map(item => item.title), ['Dossier scolaire', 'Archive 1', 'Archive 2']);
});

test('MAIR-567: a detail of another project or an inconsistent archive page is refused', async () => {
  const other = createPublishedProjectWorkflowPort(service({ getProjectsProjectId: async () => ({ data: { project: { id: 'project-2' }, taskItems: [task] } }) }));
  await assert.rejects(other.readProject('project-1', signal()), /vérifi/);
  const shifted = createPublishedProjectWorkflowPort(service({ getProjectsProjectIdArchivedTasks: async () => ({ data: { tasks: [], pagination: { page: 2, limit: 100, total: 0, hasNextPage: false } } }) }));
  await assert.rejects(shifted.readProject('project-1', signal()), /vérifi/);
});

test('MAIR-567: invalid statuses are refused by the statuses-only read', async () => {
  const port = createPublishedProjectWorkflowPort(service({ getProjectsProjectIdStatuses: async () => ({ data: { statuses: [{ ...statuses[0], color: 'blue' }] } }) }));
  await assert.rejects(port.readStatuses('project-1', signal()), /vérifi/);
});

test('MAIR-567: moving a task uses its statusId and accepts only a confirmed, re-read destination', async () => {
  let current = task;
  const port = createPublishedProjectWorkflowPort(service({
    getProjectsProjectId: async () => ({ data: { project: { id: 'project-1' }, taskItems: [current] } }),
    patchProjectsProjectIdTasksTaskIdStatus: async (_p, _t, body) => { current = { ...task, statusId: body.statusId }; return { data: current }; },
  }));
  const before = await port.readProject('project-1', signal());
  const after = await port.moveTask({ projectId: 'project-1', revision: before.revision, taskId: 'task-1', statusId: 'status-1' }, signal());
  assert.equal(after.tasks[0].statusId, 'status-1');

  const ignored = createPublishedProjectWorkflowPort(service({ patchProjectsProjectIdTasksTaskIdStatus: async () => ({ data: task }) }));
  const snapshot = await ignored.readProject('project-1', signal());
  await assert.rejects(ignored.moveTask({ projectId: 'project-1', revision: snapshot.revision, taskId: 'task-1', statusId: 'status-1' }, signal()), /vérifi/);
});

test('MAIR-567: saving statuses refuses a changed snapshot before any write', async () => {
  let changed = false;
  const port = createPublishedProjectWorkflowPort(service({
    getProjectsProjectIdStatuses: async () => ({ data: { statuses: changed ? statuses.map(item => ({ ...item, name: `${item.name} modifié` })) : statuses } }),
    postProjectsProjectIdStatuses: async () => { throw new Error('Unexpected mutation'); },
  }));
  const before = await port.readProject('project-1', signal());
  changed = true;
  await assert.rejects(port.saveProjectStatuses({ projectId: 'project-1', revision: before.revision, statuses: before.statuses, migrations: [] }, signal()), /actualis/);
});

test('MAIR-567: saving statuses creates, recolours, migrates and reorders with service ids', async () => {
  let columns = statuses.map(item => ({ ...item }));
  let current = { ...task };
  const normalize = () => { columns = columns.map((item, position) => ({ ...item, position })); return { data: { statuses: columns.map(item => ({ ...item })) } }; };
  const port = createPublishedProjectWorkflowPort(service({
    getProjectsProjectIdStatuses: async () => normalize(),
    getProjectsProjectId: async () => ({ data: { project: { id: 'project-1' }, taskItems: [current] } }),
    postProjectsProjectIdStatuses: async (_id, body) => { columns.push({ ...body, id: 'status-4', taskCount: 0 }); return normalize(); },
    patchProjectsProjectIdStatusesStatusId: async (_id, id, body) => {
      columns = columns.map(item => item.id === id ? { ...item, ...body } : item);
      if (body.position !== undefined) {
        const moving = columns.find(item => item.id === id);
        columns = columns.filter(item => item.id !== id);
        columns.splice(body.position, 0, moving);
      }
      return normalize();
    },
    deleteProjectsProjectIdStatusesStatusId: async (_id, id, { moveTo }) => {
      columns = columns.filter(item => item.id !== id);
      if (current.statusId === id) current = { ...current, statusId: moveTo };
      return normalize();
    },
  }));
  const before = await port.readProject('project-1', signal());
  const next = [
    { id: 'draft-5', name: 'Conseil municipal', color: '#1256a6', category: 'inprogress' },
    { ...before.statuses[0], name: 'Dossier reçu', color: '#267845' },
    before.statuses[2],
  ];
  const after = await port.saveProjectStatuses({ projectId: 'project-1', revision: before.revision, statuses: next, migrations: [{ from: 'status-2', to: 'draft-5' }] }, signal());
  assert.deepEqual(after.statuses.map(item => [item.id, item.name, item.color]), [
    ['status-4', 'Conseil municipal', '#1256a6'], ['status-1', 'Dossier reçu', '#267845'], ['status-3', 'Archivé', '#267845'],
  ]);
  assert.equal(after.tasks[0].statusId, 'status-4');
  assert.equal(after.draftStatusIds['draft-5'], 'status-4');

  const noTarget = createPublishedProjectWorkflowPort(service());
  const snapshot = await noTarget.readProject('project-1', signal());
  await assert.rejects(noTarget.saveProjectStatuses({ projectId: 'project-1', revision: snapshot.revision, statuses: [statuses[0], statuses[2]].map(({ position, taskCount, ...item }) => ({ ...item })), migrations: [] }, signal()), /destination/);
});

test('MAIR-567: templates are read, created, edited and used for a new project only when confirmed', async () => {
  let templates = [{ id: 'template-1', name: 'Voirie', statuses: templateStatuses }];
  const created = [];
  const port = createPublishedProjectWorkflowPort(service({
    getProjectTemplates: async () => ({ data: { templates } }),
    postProjectTemplates: async (body) => { const value = { id: 'template-2', ...body, statuses: body.statuses.map((item, position) => ({ ...item, position })) }; templates = [...templates, value]; return { data: value }; },
    patchProjectTemplatesTemplateId: async (id, body) => { const value = { id, ...body, statuses: body.statuses.map((item, position) => ({ ...item, position })) }; templates = templates.map(item => item.id === id ? value : item); return { data: value }; },
    postProjects: async (body) => { created.push(body); return { data: { project: { id: 'project-9' } } }; },
  }));
  const [voirie] = await port.readTemplates(signal());
  assert.deepEqual(voirie.statuses.map(item => [item.name, item.category]), [['Demande', 'todo'], ['Instruction', 'inprogress'], ['Clos', 'done']]);

  const fresh = await port.saveTemplate({ name: 'Écoles', statuses: voirie.statuses }, signal());
  assert.equal(fresh.id, 'template-2');
  const renamed = await port.saveTemplate({ id: voirie.id, revision: voirie.revision, name: 'Voirie et réseaux', statuses: voirie.statuses }, signal());
  assert.equal(renamed.name, 'Voirie et réseaux');
  await assert.rejects(port.saveTemplate({ id: voirie.id, revision: voirie.revision, name: 'Ancienne version', statuses: voirie.statuses }, signal()), /Le modèle a changé/);

  await port.createProjectFromTemplate(renamed, { title: 'Réfection' });
  assert.deepEqual(created, [{ title: 'Réfection', templateId: 'template-1' }]);
  await assert.rejects(port.createProjectFromTemplate(voirie, { title: 'Obsolète' }), /Sélectionnez à nouveau un modèle/);
  assert.equal(created.length, 1);
});
