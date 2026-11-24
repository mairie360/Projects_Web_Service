import { parseProjectsPageReceipt } from './project-page-receipt';
import { sessionFetch } from '@mairie360/lib-components/browser';
import axios, { type AxiosAdapter } from 'axios';
import { getBffProject } from '@mairie360/bff-project-openapi/endpoints/bffProject';
import { describeBffProjectError } from './text-constraints';
import { parseBudgetInput } from './projectBudget';
import type {
  GetProjectsPageParams,
  CreateProjectBody as ContractCreateProjectBody,
  CreateTaskBody as ContractCreateTaskBody,
  ProjectDetailsResponse as ContractProjectDetailsResponse,
  ProjectsPageResponse as ContractProjectsPageResponse,
  UpdateProjectBody as ContractUpdateProjectBody,
  UpdateTaskBody as ContractUpdateTaskBody,
} from '@mairie360/bff-project-openapi/model';
import type {
  ActivityItem,
  Milestone,
  Project,
  ProjectMember,
  ProjectMemberRole,
  ProjectPriority,
  ProjectStatus,
  ProjectTask,
  ProjectTaskDraft,
  TaskCollaboration,
  TaskComment,
} from '../types/project';
import {
  clearStoredAuthJwtToken,
  getStoredAuthJwtToken,
  navigateToLogin,
  storeAuthJwtToken,
} from './auth-token';
import { getPersonValue, taskStatusOf, type ProjectFormState, type ViewMode } from './projectPageState';

export type BffSelectOption = {
  label: string;
  value: string;
  name?: string;
  avatarUrl?: string | null;
};

export type ProjectsPageQuery = {
  q?: string;
  status?: ProjectStatus | 'all';
  priority?: ProjectPriority | 'all';
  view?: ViewMode;
  page?: number;
  limit?: number;
  dueBefore?: string;
  dueAfter?: string;
};

export type ProjectsPageResponse = ContractProjectsPageResponse;

export type ProjectDetailsResponse = ContractProjectDetailsResponse;

export type CreateProjectBody = ContractCreateProjectBody;

export type UpdateProjectBody = ContractUpdateProjectBody;

export type CreateTaskBody = ContractCreateTaskBody;

export type UpdateTaskBody = ContractUpdateTaskBody;

type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown[];
  };
};

export class BffProjectError extends Error {
  status: number;
  code?: string;
  details?: unknown[];

  constructor(message: string, status: number, code?: string, details?: unknown[]) {
    super(message);
    this.name = 'BffProjectError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class BffProjectNavigationRequiredError extends Error {
  constructor() {
    super('Une redirection nécessite de rouvrir la page des projets.');
    this.name = 'BffProjectNavigationRequiredError';
  }
}

const navigatingLocations = new WeakSet<Location>();

function uniquePreservingOrder(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function toDateInputValue(value: string) {
  return value.includes('T') ? value.slice(0, 10) : value;
}

function normalizeProjectTask<T extends ProjectTask>(task: T): T {
  return {
    ...task,
    dueDate: toDateInputValue(task.dueDate),
    // MAIR-1087: the start date is shown and edited as a day, like the due date.
    startDate: task.startDate ? toDateInputValue(task.startDate) : null,
    createdAt: toDateInputValue(task.createdAt),
    updatedAt: task.updatedAt ? toDateInputValue(task.updatedAt) : undefined,
  };
}

function normalizeProject<T extends Project>(project: T): T {
  return {
    ...project,
    dueDate: toDateInputValue(project.dueDate),
    createdAt: toDateInputValue(project.createdAt),
    taskItems: project.taskItems?.map(normalizeProjectTask),
  };
}

export function normalizeProjectDetails(details: ProjectDetailsResponse): ProjectDetailsResponse {
  const taskItems = details.taskItems.map(normalizeProjectTask);

  return {
    project: normalizeProject({ ...details.project, taskItems }),
    taskItems,
  };
}

function createQueryParams(query?: ProjectsPageQuery) {
  const params: Record<string, string> = {};

  if (!query) return params;

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    params[key] = String(value);
  });

  return params;
}

export function getStoredBffProjectJwtToken() {
  return getStoredAuthJwtToken();
}

export function storeBffProjectJwtToken(token: string) {
  storeAuthJwtToken(token);
}

export function clearStoredBffProjectJwtToken() {
  clearStoredAuthJwtToken();
}

function createRequestHeaders(init: RequestInit) {
  const headers = new Headers(init.headers);

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return headers;
}

async function parseResponseError(response: Response) {
  let errorBody: ApiErrorBody | null = null;

  try {
    errorBody = (await response.json()) as ApiErrorBody;
  } catch {
    errorBody = null;
  }

  const serviceMessage = errorBody?.error?.message;
  const message = typeof serviceMessage === 'string' && serviceMessage.trim()
    ? serviceMessage
    : response.status >= 500
      ? 'Le service des projets est temporairement indisponible.'
      : 'La demande n’a pas pu aboutir.';

  throw new BffProjectError(
    message,
    response.status,
    errorBody?.error?.code,
    errorBody?.error?.details
  );
}

async function requestBff<T>(path: string, init: RequestInit = {}) {
  const response = await sessionFetch(path, {
    ...init,
    headers: createRequestHeaders(init),
    redirect: 'manual',
  });

  // A superseded filter read must not navigate after its response arrives.
  init.signal?.throwIfAborted();

  if (response.type === 'opaqueredirect') {
    // Opaque responses expose neither status nor Location. Reopen the current
    // protected document so the existing middleware owns Login and return URL.
    // Never follow a data-route redirect or automatically replay a mutation.
    if (typeof window !== 'undefined' && !navigatingLocations.has(window.location)) {
      navigatingLocations.add(window.location);
      window.location.reload();
    }
    throw new BffProjectNavigationRequiredError();
  }

  if (response.status === 401) {
    navigateToLogin();
    throw new BffProjectError('Votre session a expiré.', 401, 'UNAUTHORIZED');
  }

  if (!response.ok) {
    await parseResponseError(response);
  }

  if (response.status === 204) return undefined as T;

  return (await response.json()) as T;
}

// The generated operations of the published BFF Project contract own every path: axios only carries the
// request through requestBff, which keeps the same-origin cookie, redirect and 401 handling.
const contractAdapter: AxiosAdapter = async (config) => {
  const body = typeof config.data === 'string' ? config.data : undefined;
  const headers = config.headers.toJSON() as Record<string, string>;
  // Axios defaults a bodiless POST to a form content type; the BFF contract declares none.
  if (body === undefined) delete headers['Content-Type'];

  const data = await requestBff<unknown>(axios.getUri(config), {
    method: (config.method ?? 'get').toUpperCase(),
    headers,
    body,
    signal: (config.signal as AbortSignal | undefined) ?? undefined,
  });

  return {
    data,
    status: data === undefined ? 204 : 200,
    statusText: data === undefined ? 'No Content' : 'OK',
    headers: {},
    config,
  };
};

export const bffProject = getBffProject(axios.create({ adapter: contractAdapter, headers: { Accept: 'application/json' } }));

export function getBffProjectErrorMessage(error: unknown) {
  // A 400 of the BFF lists the refused fields (MAIR-514); other errors keep their message.
  return describeBffProjectError(error, 'Une erreur inconnue est survenue.');
}

export async function getProjectsPage(query?: ProjectsPageQuery, signal?: AbortSignal) {
  let response: ProjectsPageResponse;

  try {
    response = (await bffProject.getProjectsPage(createQueryParams(query) as GetProjectsPageParams, { signal })).data as ProjectsPageResponse;
  } catch (error) {
    // Axios reports a cancelled read as CanceledError; callers rely on the signal's own AbortError.
    signal?.throwIfAborted();
    throw error;
  }

  return parseProjectsPageReceipt(response, query?.page ?? 1);
}

export async function getProjectDetails(projectId: string) {
  const { data } = await bffProject.getProjectsProjectId(encodeURIComponent(projectId));

  return normalizeProjectDetails(data as ProjectDetailsResponse);
}

export async function createProject(body: CreateProjectBody) {
  const { data } = await bffProject.postProjects(body);

  return normalizeProjectDetails(data as ProjectDetailsResponse);
}

/**
 * `null` when the update is saved but the caller no longer sees the project: BFF_Project answers 204 without a
 * body after a group change that removes the caller's only access (MAIR-880).
 */
export async function updateProject(projectId: string, body: UpdateProjectBody): Promise<ProjectDetailsResponse | null> {
  const { data } = await bffProject.patchProjectsProjectId(encodeURIComponent(projectId), body);

  return data === undefined || data === null ? null : normalizeProjectDetails(data as ProjectDetailsResponse);
}

export async function duplicateProject(projectId: string) {
  const { data } = await bffProject.postProjectsProjectIdDuplicate(encodeURIComponent(projectId));

  return normalizeProjectDetails(data as ProjectDetailsResponse);
}

export async function deleteProject(projectId: string) {
  await bffProject.deleteProjectsProjectId(encodeURIComponent(projectId));
}

export async function createProjectTask(projectId: string, body: CreateTaskBody) {
  const { data } = await bffProject.postProjectsProjectIdTasks(encodeURIComponent(projectId), body);

  return normalizeProjectTask(data as ProjectTask);
}

export async function updateProjectTask(projectId: string, taskId: string, body: UpdateTaskBody) {
  const { data } = await bffProject.patchProjectsProjectIdTasksTaskId(encodeURIComponent(projectId), encodeURIComponent(taskId), body);

  return normalizeProjectTask(data as ProjectTask);
}

export async function updateProjectTaskStatus(projectId: string, taskId: string, status: ProjectStatus, statusId?: string) {
  const { data } = await bffProject.patchProjectsProjectIdTasksTaskIdStatus(encodeURIComponent(projectId), encodeURIComponent(taskId), statusId ? { statusId } : { status: taskStatusOf(status) });

  return normalizeProjectTask(data as ProjectTask);
}

export async function deleteProjectTask(projectId: string, taskId: string) {
  await bffProject.deleteProjectsProjectIdTasksTaskId(encodeURIComponent(projectId), encodeURIComponent(taskId));
}

/** `done` closes the project, `on-hold` puts it on hold (MAIR-1084), `review` puts it in review. */
export async function closeProject(projectId: string, status: 'done' | 'on-hold' | 'review') {
  const { data } = await bffProject.patchProjectsProjectIdClose(encodeURIComponent(projectId), { status });

  return normalizeProjectDetails(data as ProjectDetailsResponse);
}

export async function getTaskCollaboration(projectId: string, taskId: string) {
  const { data } = await bffProject.getProjectsProjectIdTasksTaskIdCollaboration(encodeURIComponent(projectId), encodeURIComponent(taskId));

  return data as TaskCollaboration;
}

export async function addTaskComment(projectId: string, taskId: string, message: string) {
  const { data } = await bffProject.postProjectsProjectIdTasksTaskIdComments(encodeURIComponent(projectId), encodeURIComponent(taskId), { message });

  return data as TaskComment;
}

/** MAIR-1086: milestones of a project; the writes are the managers' (BFF 403 otherwise). */
export type MilestoneInput = { title: string; dueDate: string; reached?: boolean };

export async function createProjectMilestone(projectId: string, milestone: MilestoneInput) {
  const { data } = await bffProject.postProjectsProjectIdMilestones(encodeURIComponent(projectId), milestone);

  return data as Milestone;
}

export async function updateProjectMilestone(projectId: string, milestoneId: string, patch: Partial<MilestoneInput>) {
  const { data } = await bffProject.patchProjectsProjectIdMilestonesMilestoneId(encodeURIComponent(projectId), encodeURIComponent(milestoneId), patch);

  return data as Milestone;
}

export async function deleteProjectMilestone(projectId: string, milestoneId: string) {
  await bffProject.deleteProjectsProjectIdMilestonesMilestoneId(encodeURIComponent(projectId), encodeURIComponent(milestoneId));
}

export type ProjectActivityPage = { items: ActivityItem[]; pagination: { page: number; limit: number; total: number; hasNextPage: boolean } };

/** MAIR-1089: the activity of a project (its comments and the history of its tasks), newest first. */
export async function getProjectActivity(projectId: string, query: { page?: number; limit?: number } = {}, signal?: AbortSignal): Promise<ProjectActivityPage> {
  try {
    const { data } = await bffProject.getProjectsProjectIdActivity(encodeURIComponent(projectId), query, { signal });
    return data as ProjectActivityPage;
  } catch (error) {
    signal?.throwIfAborted();
    throw error;
  }
}

export type BulkDeletionResult = { projectId: string; status: 'deleted' | 'not_found' | 'forbidden' };

/** MAIR-1089: one call for the selection, one result per project (a refusal does not stop the others). */
export async function bulkDeleteProjects(projectIds: string[]): Promise<BulkDeletionResult[]> {
  const { data } = await bffProject.postProjectsBulkDelete({ projectIds });

  return data.results;
}

/** MAIR-1088: the team of a project; every write answers the whole team as re-read (a removal answers 204). */
export async function addProjectMember(projectId: string, userId: string, role?: ProjectMemberRole) {
  const { data } = await bffProject.postProjectsProjectIdMembers(encodeURIComponent(projectId), role ? { userId, role } : { userId });

  return (data as { members: ProjectMember[] }).members;
}

export async function updateProjectMemberRole(projectId: string, userId: string, role: ProjectMemberRole) {
  const { data } = await bffProject.patchProjectsProjectIdMembersUserId(encodeURIComponent(projectId), encodeURIComponent(userId), { role });

  return (data as { members: ProjectMember[] }).members;
}

export async function removeProjectMember(projectId: string, userId: string) {
  await bffProject.deleteProjectsProjectIdMembersUserId(encodeURIComponent(projectId), encodeURIComponent(userId));
}

/** MAIR-1089: a comment on the project (1 to 2000 characters once trimmed, no `<` or `>`), answered as an activity item. */
export async function addProjectComment(projectId: string, message: string) {
  const { data } = await bffProject.postProjectsProjectIdComments(encodeURIComponent(projectId), { message });

  return data as ActivityItem;
}

export function mergeProjectDetails(details: ProjectDetailsResponse): Project {
  return {
    ...details.project,
    taskItems: details.taskItems,
  };
}

export function createProjectBodyFromForm(form: ProjectFormState): CreateProjectBody {
  const assigneeIds = uniquePreservingOrder(form.assignees);
  const responsibleId = form.responsible.trim() || assigneeIds[0] || '';

  return {
    title: form.title.trim(),
    description: form.description.trim(),
    status: form.status,
    priority: form.priority,
    responsibleId,
    assigneeIds: uniquePreservingOrder([responsibleId, ...assigneeIds]),
    labels: uniquePreservingOrder(form.labels),
    dueDate: form.dueDate,
    groupId: form.groupId,
    taskItems: form.taskItems.map((task) => ({
      title: task.title.trim(),
      status: taskStatusOf(task.status),
      priority: task.priority,
      assigneeIds: uniquePreservingOrder(task.assignees.map(getPersonValue)),
      labels: uniquePreservingOrder(task.labels),
      dueDate: task.dueDate,
    })),
  };
}

export function updateProjectBodyFromForm(form: ProjectFormState): UpdateProjectBody {
  // The contract refuses `groupId: null`; a project without a group keeps it unchanged by omitting the field.
  const { groupId, ...body } = createProjectBodyFromForm(form);
  // MAIR-1085: the budgets are only set by the update (`null` clears one); the form refuses a non-amount first.
  // A form that never held the budgets (an older draft) leaves them unchanged.
  const budgetVoted = form.budgetVoted === undefined ? undefined : parseBudgetInput(form.budgetVoted);
  const budgetCommitted = form.budgetCommitted === undefined ? undefined : parseBudgetInput(form.budgetCommitted);
  const budgets = {
    ...(budgetVoted !== undefined ? { budgetVoted } : {}),
    ...(budgetCommitted !== undefined ? { budgetCommitted } : {}),
  };
  return groupId ? { ...body, ...budgets, groupId } : { ...body, ...budgets };
}

export type ProjectGroup = { id: string; name: string };

/** Groups the caller may link a project to (MAIR-880). */
export async function getProjectGroups(signal?: AbortSignal): Promise<ProjectGroup[]> {
  try {
    const { data } = await bffProject.getProjectGroups({ signal });
    return data.groups.map(({ id, name }) => ({ id, name }));
  } catch (error) {
    signal?.throwIfAborted();
    throw error;
  }
}

export function taskBodyFromDraft(task: ProjectTaskDraft): CreateTaskBody {
  const assigneeIds = uniquePreservingOrder(task.assignees.map(getPersonValue));
  const responsibleId = getPersonValue(task.responsible) || assigneeIds[0] || '';

  return {
    title: task.title.trim(),
    // Sent as typed (line breaks kept); a blank one is empty, which clears it on an edit.
    ...(task.description !== undefined ? { description: task.description.trim() ? task.description : '' } : {}),
    status: task.status,
    ...(task.statusId ? { statusId: task.statusId } : {}),
    priority: task.priority,
    responsibleId,
    assigneeIds: uniquePreservingOrder([responsibleId, ...assigneeIds]),
    labels: uniquePreservingOrder(task.labels),
    dueDate: task.dueDate,
    // MAIR-1087: an empty start date is « none » (on update the BFF clears it).
    ...(task.startDate !== undefined ? { startDate: task.startDate || null } : {}),
  };
}
