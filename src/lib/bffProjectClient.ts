import { parseProjectsPageReceipt } from './project-page-receipt';
import { sessionFetch } from '@mairie360/front-kit/browser';
import axios, { type AxiosAdapter } from 'axios';
import { getBffProject } from '@mairie360/bff-project-openapi/endpoints/bffProject';
import { describeBffProjectError } from './text-constraints';
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
  Project,
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
import { getPersonValue, type ProjectFormState, type ViewMode } from './projectPageState';

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

function normalizeProjectDetails(details: ProjectDetailsResponse): ProjectDetailsResponse {
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

export async function updateProject(projectId: string, body: UpdateProjectBody) {
  const { data } = await bffProject.patchProjectsProjectId(encodeURIComponent(projectId), body);

  return normalizeProjectDetails(data as ProjectDetailsResponse);
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

export async function updateProjectTaskStatus(projectId: string, taskId: string, status: ProjectStatus) {
  const { data } = await bffProject.patchProjectsProjectIdTasksTaskIdStatus(encodeURIComponent(projectId), encodeURIComponent(taskId), { status });

  return normalizeProjectTask(data as ProjectTask);
}

export async function deleteProjectTask(projectId: string, taskId: string) {
  await bffProject.deleteProjectsProjectIdTasksTaskId(encodeURIComponent(projectId), encodeURIComponent(taskId));
}

export async function closeProject(projectId: string, status: 'done' | 'review') {
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
    taskItems: form.taskItems.map((task) => ({
      title: task.title.trim(),
      status: task.status,
      priority: task.priority,
      assigneeIds: uniquePreservingOrder(task.assignees.map(getPersonValue)),
      labels: uniquePreservingOrder(task.labels),
      dueDate: task.dueDate,
    })),
  };
}

export function updateProjectBodyFromForm(form: ProjectFormState): UpdateProjectBody {
  return createProjectBodyFromForm(form);
}

export function taskBodyFromDraft(task: ProjectTaskDraft): CreateTaskBody {
  const assigneeIds = uniquePreservingOrder(task.assignees.map(getPersonValue));
  const responsibleId = getPersonValue(task.responsible) || assigneeIds[0] || '';

  return {
    title: task.title.trim(),
    status: task.status,
    priority: task.priority,
    responsibleId,
    assigneeIds: uniquePreservingOrder([responsibleId, ...assigneeIds]),
    labels: uniquePreservingOrder(task.labels),
    dueDate: task.dueDate,
  };
}
