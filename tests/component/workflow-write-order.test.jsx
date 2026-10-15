import { expect, it } from 'vitest';
import { waitFor } from '@testing-library/react';
import { createPublishedProjectWorkflowPort } from '@/lib/publishedProjectWorkflow';

const initial = [
  { id: 'todo', name: 'À faire', color: '#1256a6', category: 'todo', position: 0, taskCount: 0 },
  { id: 'doing', name: 'En cours', color: '#1256a6', category: 'in-progress', position: 1, taskCount: 0 },
  { id: 'done', name: 'Terminé', color: '#1256a6', category: 'done', position: 2, taskCount: 0 },
];
const extra = index => ({ id: `draft-${index}`, name: `Étape ${index}`, color: '#1256a6', category: 'todo' });
function reads(getColumns) {
  return {
    getProjectsProjectIdStatuses: async () => ({ data: { statuses: getColumns() } }),
    getProjectsProjectId: async () => ({ data: { project: { id: 'project' }, taskItems: [] } }),
    getProjectsProjectIdArchivedTasks: async () => ({ data: { tasks: [], pagination: { page: 1, limit: 100, hasNextPage: false } } }),
  };
}

it('waits for each confirmed status creation before dispatching the next write', async () => {
  let columns = initial.map(status => ({ ...status }));
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const dispatched = [];
  const adapter = createPublishedProjectWorkflowPort({
    ...reads(() => columns),
    postProjectsProjectIdStatuses: async (_project, body) => {
      dispatched.push(body.name);
      if (body.name === 'Étape 1') await gate;
      columns = [...columns, { ...body, id: `server-${dispatched.length}`, position: columns.length, taskCount: 0 }];
      return { data: { statuses: columns } };
    },
  });
  const signal = new AbortController().signal;
  const before = await adapter.readProject('project', signal);
  const saving = adapter.saveProjectStatuses({ projectId: 'project', revision: before.revision, statuses: [...before.statuses, extra(1), extra(2)], migrations: [] }, signal);
  try {
    await waitFor(() => expect(dispatched).toEqual(['Étape 1']));
    expect(columns).toHaveLength(3);
  } finally { release(); }
  const result = await saving;
  expect(dispatched).toEqual(['Étape 1', 'Étape 2']);
  expect(result.statuses.map(status => status.id)).toEqual(['todo', 'doing', 'done', 'server-1', 'server-2']);
});

it('stops the remaining writes when a creation receipt does not confirm the new status', async () => {
  const dispatched = [];
  const adapter = createPublishedProjectWorkflowPort({
    ...reads(() => initial),
    postProjectsProjectIdStatuses: async (_project, body) => { dispatched.push(body.name); return { data: { statuses: initial } }; },
    patchProjectsProjectIdStatusesStatusId: async () => { throw new Error('Unconfirmed write was followed by an update'); },
    deleteProjectsProjectIdStatusesStatusId: async () => { throw new Error('Unconfirmed write was followed by a deletion'); },
  });
  const signal = new AbortController().signal;
  const before = await adapter.readProject('project', signal);
  await expect(adapter.saveProjectStatuses({ projectId: 'project', revision: before.revision, statuses: [...before.statuses, extra(1), extra(2)], migrations: [] }, signal)).rejects.toThrow(/vérifi/i);
  expect(dispatched).toEqual(['Étape 1']);
});
