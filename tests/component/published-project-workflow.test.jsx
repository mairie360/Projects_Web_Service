import { describe, expect, it } from 'vitest';
import { createPublishedProjectWorkflowPort } from '@/lib/publishedProjectWorkflow';

const statuses = [
  { id: 'status-1', name: 'À instruire', color: '#1256a6', category: 'todo', position: 0, taskCount: 0 },
  { id: 'status-2', name: 'Validation', color: '#4b908d', category: 'in-progress', position: 1, taskCount: 1 },
  { id: 'status-3', name: 'Archivé', color: '#267845', category: 'done', position: 2, taskCount: 0 },
];
const task = { id: 'task-1', title: 'Dossier scolaire', statusId: 'status-2', permissions: { canUpdateStatus: true } };
function service(overrides = {}) {
  return { getProjectsProjectIdStatuses: async () => ({ data: { statuses } }), getProjectsProjectId: async () => ({ data: { project: { id: 'project-1' }, taskItems: [task] } }), getProjectsProjectIdArchivedTasks: async () => ({ data: { tasks: [], pagination: { page: 1, limit: 100, total: 0, hasNextPage: false } } }), ...overrides };
}
describe('published project workflow adapter', () => {
  it('maps service categories and reads archived tasks across pages without losing custom columns', async () => {
    const adapter = createPublishedProjectWorkflowPort(service({ getProjectsProjectIdArchivedTasks: async (_id, { page }) => ({ data: { tasks: [{ id: `old-${page}`, title: `Archive ${page}`, statusId: 'status-3', permissions: { canUpdateStatus: false } }], pagination: { page, limit: 100, total: 2, hasNextPage: page < 2 } } }) }));
    const snapshot = await adapter.readProject('project-1', new AbortController().signal);
    expect(snapshot.statuses[1].category).toBe('inprogress');
    expect(snapshot.tasks.map(task => task.title)).toEqual(['Dossier scolaire', 'Archive 1', 'Archive 2']);
  });
  it('rejects details from another project instead of presenting them as the selected project', async () => {
    const adapter = createPublishedProjectWorkflowPort(service({ getProjectsProjectId: async () => ({ data: { project: { id: 'project-2' }, taskItems: [task] } }) }));
    await expect(adapter.readProject('project-1', new AbortController().signal)).rejects.toThrow(/vérifi/i);
  });
  it('uses the statusId mutation and verifies its receipt before accepting the refreshed board', async () => {
    let currentTask = task;
    const adapter = createPublishedProjectWorkflowPort(service({ getProjectsProjectId: async () => ({ data: { project: { id: 'project-1' }, taskItems: [currentTask] } }), patchProjectsProjectIdTasksTaskIdStatus: async (_p, _t, body) => { currentTask = { ...task, statusId: body.statusId }; return { data: currentTask }; } }));
    const before = await adapter.readProject('project-1', new AbortController().signal);
    const after = await adapter.moveTask({ projectId: 'project-1', revision: before.revision, taskId: 'task-1', statusId: 'status-1' }, new AbortController().signal);
    expect(after.tasks[0].statusId).toBe('status-1');
  });
  it('refuses to overwrite a changed service snapshot before any status mutation', async () => {
    let changed = false;
    const adapter = createPublishedProjectWorkflowPort(service({ getProjectsProjectIdStatuses: async () => ({ data: { statuses: changed ? statuses.map(s => ({ ...s, name: `${s.name} modifié` })) : statuses } }), postProjectsProjectIdStatuses: async () => { throw new Error('Unexpected mutation'); } }));
    const before = await adapter.readProject('project-1', new AbortController().signal);
    changed = true;
    await expect(adapter.saveProjectStatuses({ projectId: 'project-1', revision: before.revision, statuses: before.statuses, migrations: [] }, new AbortController().signal)).rejects.toThrow(/actualis/i);
  });
  it('creates, recolours, migrates and reorders with service IDs, confirming the resulting task destination', async () => {
    let columns = statuses.map(status => ({ ...status }));
    let currentTask = { ...task };
    const normalize = () => { columns = columns.map((status, position) => ({ ...status, position })); return { data: { statuses: columns.map(status => ({ ...status })) } }; };
    const adapter = createPublishedProjectWorkflowPort(service({
      getProjectsProjectIdStatuses: async () => normalize(),
      getProjectsProjectId: async () => ({ data: { project: { id: 'project-1' }, taskItems: [currentTask] } }),
      postProjectsProjectIdStatuses: async (_id, body) => { columns.push({ ...body, id: 'status-4', taskCount: 0 }); return normalize(); },
      patchProjectsProjectIdStatusesStatusId: async (_id, id, body) => {
        columns = columns.map(status => status.id === id ? { ...status, ...body } : status);
        if (body.position !== undefined) { const moving = columns.find(status => status.id === id); columns = columns.filter(status => status.id !== id); columns.splice(body.position, 0, moving); }
        return normalize();
      },
      deleteProjectsProjectIdStatusesStatusId: async (_id, id, { moveTo }) => { columns = columns.filter(status => status.id !== id); if (currentTask.statusId === id) currentTask = { ...currentTask, statusId: moveTo }; return normalize(); },
    }));
    const before = await adapter.readProject('project-1', new AbortController().signal);
    const next = [
      { id: 'draft-5', name: 'Conseil municipal', color: '#1256a6', category: 'inprogress' },
      { ...before.statuses[0], name: 'Dossier reçu', color: '#267845' },
      before.statuses[2],
    ];
    const after = await adapter.saveProjectStatuses({ projectId: 'project-1', revision: before.revision, statuses: next, migrations: [{ from: 'status-2', to: 'draft-5' }] }, new AbortController().signal);
    expect(after.statuses.map(status => [status.id, status.name, status.color])).toEqual([
      ['status-4', 'Conseil municipal', '#1256a6'], ['status-1', 'Dossier reçu', '#267845'], ['status-3', 'Archivé', '#267845'],
    ]);
    expect(after.tasks[0].statusId).toBe('status-4');
    expect(after.draftStatusIds['draft-5']).toBe('status-4');
  });

});
