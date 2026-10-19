import { bffProject, normalizeProjectDetails, type CreateProjectBody, type ProjectDetailsResponse } from './bffProjectClient';
import { assertTemplate, assertWorkflowSnapshot, sameStatuses, validStatuses, WORKFLOW_UNVERIFIED, type ProjectTemplate, type ProjectWorkflowPort, type TaskStatusDefinition } from './projectWorkflow';

type Operations = typeof bffProject;
type ServiceStatuses = Awaited<ReturnType<Operations['getProjectsProjectIdStatuses']>>['data']['statuses'];
const segment = encodeURIComponent;
const toCategory = (category: 'todo' | 'inprogress' | 'done') => category === 'inprogress' ? 'in-progress' as const : category;
const fromCategory = (category: string): TaskStatusDefinition['category'] => category === 'in-progress' ? 'inprogress' : category as TaskStatusDefinition['category'];
// The service currently has no ETag/version precondition. This fingerprint is
// only a local stale-draft guard; it is never sent as an invented API field.
const fingerprint = (value: unknown) => JSON.stringify(value);
function mapTemplate(value: Awaited<ReturnType<Operations['getProjectTemplates']>>['data']['templates'][number]): ProjectTemplate {
  const template = { id: value.id, name: value.name, revision: fingerprint(value), statuses: [...value.statuses].sort((a, b) => a.position - b.position).map((status, index) => ({ id: `template-status-${index}`, name: status.name, color: status.color, category: fromCategory(status.category) })) };
  assertTemplate(template);
  return template;
}
export function createPublishedProjectWorkflowPort(operations: Operations): ProjectWorkflowPort {
  const mapStatuses = (statuses: Awaited<ReturnType<Operations['getProjectsProjectIdStatuses']>>['data']['statuses']) =>
    [...statuses].sort((a, b) => a.position - b.position).map(status => ({ id: status.id, name: status.name, color: status.color, category: fromCategory(status.category), taskCount: status.taskCount }));
  const readActiveTasks = async (projectId: string, signal: AbortSignal) => {
    const { data } = await operations.getProjectsProjectId(segment(projectId), { signal });
    if (data.project.id !== projectId) throw new Error(WORKFLOW_UNVERIFIED);
    return data.taskItems;
  };
  // A caller that already holds the project detail passes its active tasks: the detail is not read twice.
  // Write preflights and confirmations never pass them, so they always read the current detail.
  const readProject: ProjectWorkflowPort['readProject'] = async (projectId, signal, loaded) => {
    signal.throwIfAborted();
    const [statusResponse, activeTasks, firstArchived] = await Promise.all([
      operations.getProjectsProjectIdStatuses(segment(projectId), { signal }),
      loaded ? Promise.resolve(loaded.tasks) : readActiveTasks(projectId, signal),
      operations.getProjectsProjectIdArchivedTasks(segment(projectId), { page: 1, limit: 100 }, { signal }),
    ]);
    signal.throwIfAborted();
    const archived = [...firstArchived.data.tasks];
    let pagination = firstArchived.data.pagination;
    if (pagination.page !== 1) throw new Error(WORKFLOW_UNVERIFIED);
    // Each page receipt determines whether another request is valid.
    const readNextArchivedPage = async (): Promise<void> => {
      if (!pagination.hasNextPage) return;
      const page = pagination.page + 1;
      if (page > 100000 || pagination.limit < 1) throw new Error(WORKFLOW_UNVERIFIED);
      const response = await operations.getProjectsProjectIdArchivedTasks(segment(projectId), { page, limit: 100 }, { signal });
      signal.throwIfAborted();
      if (response.data.pagination.page !== page || response.data.tasks.length === 0) throw new Error(WORKFLOW_UNVERIFIED);
      archived.push(...response.data.tasks);
      pagination = response.data.pagination;
      return readNextArchivedPage();
    };
    await readNextArchivedPage();
    const statuses = mapStatuses(statusResponse.data.statuses);
    const tasks = [...activeTasks, ...archived].map(task => ({ id: task.id, title: task.title, statusId: task.statusId ?? '', canUpdateStatus: task.permissions?.canUpdateStatus === true }));
    const snapshot = { projectId, statuses, tasks, revision: fingerprint({ statuses, tasks }) };
    assertWorkflowSnapshot(snapshot, projectId);
    return snapshot;
  };
  const readStatuses: NonNullable<ProjectWorkflowPort['readStatuses']> = async (projectId, signal) => {
    const { data } = await operations.getProjectsProjectIdStatuses(segment(projectId), { signal });
    signal.throwIfAborted();
    const statuses = mapStatuses(data.statuses);
    if (!validStatuses(statuses)) throw new Error(WORKFLOW_UNVERIFIED);
    return statuses;
  };
  const readTemplates: ProjectWorkflowPort['readTemplates'] = async signal => {
    const response = await operations.getProjectTemplates({ signal }); signal.throwIfAborted();
    const values = response.data.templates.map(mapTemplate);
    if (new Set(values.map(template => template.id)).size !== values.length) throw new Error(WORKFLOW_UNVERIFIED);
    return values;
  };
  const preflight = async (projectId: string, revision: string, signal: AbortSignal) => {
    const current = await readProject(projectId, signal);
    if (current.revision !== revision) throw new Error('Le projet a changé. Relisez les statuts pour actualiser le brouillon.');
    return current;
  };
  return {
    readProject, readStatuses, readTemplates,
    moveTask: async (draft, signal) => {
      const before = await preflight(draft.projectId, draft.revision, signal);
      if (!before.statuses.some(status => status.id === draft.statusId) || !before.tasks.some(task => task.id === draft.taskId && task.canUpdateStatus)) throw new Error(WORKFLOW_UNVERIFIED);
      const receipt = await operations.patchProjectsProjectIdTasksTaskIdStatus(segment(draft.projectId), segment(draft.taskId), { statusId: draft.statusId }, { signal });
      signal.throwIfAborted();
      if (receipt.data.id !== draft.taskId || receipt.data.statusId !== draft.statusId) throw new Error(WORKFLOW_UNVERIFIED);
      const after = await readProject(draft.projectId, signal);
      if (!after.tasks.some(task => task.id === draft.taskId && task.statusId === draft.statusId)) throw new Error(WORKFLOW_UNVERIFIED);
      return after;
    },
    saveProjectStatuses: async (draft, signal) => {
      if (!validStatuses(draft.statuses)) throw new Error('Les statuts saisis sont invalides.');
      const current = await preflight(draft.projectId, draft.revision, signal);
      const ids = new Map(current.statuses.map(status => [status.id, status.id]));
      // Every receipt is read in position order: the reorder phase compares positions by index.
      const byPosition = (items: ServiceStatuses) => [...items].sort((a, b) => a.position - b.position).map(item => ({ ...item, category: fromCategory(item.category) }));
      // Published operations are individual CRUD writes. Stop at the first
      // uncertain receipt; the UI retains its draft and requires a fresh read.
      let serverStatuses = current.statuses;
      await draft.statuses.reduce(async (previous, status) => {
        await previous;
        if (ids.has(status.id)) return;
        const knownIds = new Set(serverStatuses.map(item => item.id));
        const receipt = await operations.postProjectsProjectIdStatuses(segment(draft.projectId), { name: status.name, color: status.color, category: toCategory(status.category) }, { signal });
        signal.throwIfAborted();
        const created = receipt.data.statuses.filter(item => !knownIds.has(item.id) && item.name === status.name && item.color.toLowerCase() === status.color.toLowerCase() && fromCategory(item.category) === status.category);
        if (created.length !== 1) throw new Error(WORKFLOW_UNVERIFIED);
        ids.set(status.id, created[0].id);
        serverStatuses = byPosition(receipt.data.statuses);
      }, Promise.resolve());
      // Apply changed categories before removal, retaining the service's own
      // invariant that each category must have a status.
      await draft.statuses.reduce(async (previous, status) => {
        await previous;
        const id = ids.get(status.id)!;
        const existing = serverStatuses.find(item => item.id === id);
        if (existing && existing.name === status.name && existing.color.toLowerCase() === status.color.toLowerCase() && existing.category === status.category) return;
        const receipt = await operations.patchProjectsProjectIdStatusesStatusId(segment(draft.projectId), segment(id), { name: status.name, color: status.color, category: toCategory(status.category) }, { signal });
        signal.throwIfAborted();
        const confirmed = receipt.data.statuses.find(item => item.id === id);
        if (!confirmed || confirmed.name !== status.name || confirmed.color.toLowerCase() !== status.color.toLowerCase() || fromCategory(confirmed.category) !== status.category) throw new Error(WORKFLOW_UNVERIFIED);
        serverStatuses = byPosition(receipt.data.statuses);
      }, Promise.resolve());
      await current.statuses.filter(item => !draft.statuses.some(next => next.id === item.id)).reduce(async (previous, status) => {
        await previous;
        const migration = draft.migrations.find(item => item.from === status.id);
        const targetId = migration ? ids.get(migration.to) : undefined;
        if (!targetId) throw new Error('Choisissez le statut de destination des tâches.');
        const receipt = await operations.deleteProjectsProjectIdStatusesStatusId(segment(draft.projectId), segment(status.id), { moveTo: targetId }, { signal });
        signal.throwIfAborted();
        if (receipt.data.statuses.some(item => item.id === status.id) || !receipt.data.statuses.some(item => item.id === targetId)) throw new Error(WORKFLOW_UNVERIFIED);
        serverStatuses = byPosition(receipt.data.statuses);
      }, Promise.resolve());
      await draft.statuses.reduce(async (previous, status, position) => {
        await previous;
        const id = ids.get(status.id)!;
        if (serverStatuses[position]?.id === id) return;
        const receipt = await operations.patchProjectsProjectIdStatusesStatusId(segment(draft.projectId), segment(id), { position }, { signal });
        signal.throwIfAborted();
        serverStatuses = byPosition(receipt.data.statuses);
        if (serverStatuses[position]?.id !== id) throw new Error(WORKFLOW_UNVERIFIED);
      }, Promise.resolve());
      const after = await readProject(draft.projectId, signal);
      const expected = draft.statuses.map(status => ({ ...status, id: ids.get(status.id)! }));
      if (!sameStatuses(after.statuses, expected) || current.tasks.some(task => {
        const migration = draft.migrations.find(item => item.from === task.statusId);
        return !after.tasks.some(item => item.id === task.id && item.statusId === (migration ? ids.get(migration.to) : task.statusId));
      })) throw new Error(WORKFLOW_UNVERIFIED);
      return { ...after, draftStatusIds: Object.fromEntries(ids) };
    },
    saveTemplate: async (draft, signal) => {
      const templates = await readTemplates(signal);
      if (draft.id && !templates.some(template => template.id === draft.id && template.revision === draft.revision)) throw new Error('Le modèle a changé. Relisez le catalogue pour actualiser le brouillon.');
      const body = { name: draft.name, statuses: draft.statuses.map(status => ({ name: status.name, color: status.color, category: toCategory(status.category) })) };
      const response = draft.id ? await operations.patchProjectTemplatesTemplateId(segment(draft.id), body, { signal }) : await operations.postProjectTemplates(body, { signal });
      signal.throwIfAborted();
      const receipt = mapTemplate(response.data);
      if ((draft.id && receipt.id !== draft.id) || (!draft.id && templates.some(template => template.id === receipt.id)) || receipt.name !== draft.name || !sameStatuses(receipt.statuses, draft.statuses, true)) throw new Error(WORKFLOW_UNVERIFIED);
      return receipt;
    },
    createProjectFromTemplate: async (template, body: CreateProjectBody) => {
      const signal = new AbortController().signal;
      const templates = await readTemplates(signal);
      if (!templates.some(item => item.id === template.id && item.revision === template.revision)) throw new Error('Le modèle a changé. Sélectionnez à nouveau un modèle.');
      // Same date normalization as an ordinary project creation (createProject).
      return normalizeProjectDetails((await operations.postProjects({ ...body, templateId: template.id })).data as ProjectDetailsResponse);
    },
  };
}
/** The currently installed generated contract alone decides availability. */
export const publishedProjectWorkflowPort: ProjectWorkflowPort | undefined =
  'getProjectsProjectIdStatuses' in bffProject && 'getProjectTemplates' in bffProject
    ? createPublishedProjectWorkflowPort(bffProject) : undefined;
