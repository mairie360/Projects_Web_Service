import type { Project, ProjectPriority, ProjectStatus, ProjectTask, ProjectTaskDraft } from '../types/project';
import {
  clearStoredAuthJwtToken,
  getStoredAuthJwtToken,
  getStoredAuthorizationHeader,
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
};

export type ProjectsPageResponse = {
  page: {
    title: string;
    subtitle: string;
    defaultView: ViewMode;
    views: {
      value: ViewMode;
      label: string;
    }[];
  };
  filters: {
    search: string | null;
    status: string;
    priority: string;
    statuses: BffSelectOption[];
    priorities: BffSelectOption[];
  };
  options: {
    members: BffSelectOption[];
    labels: BffSelectOption[];
  };
  summary: {
    totalProjects: number;
    projectsByStatus: Record<string, number>;
    projectsByPriority: Record<string, number>;
  };
  kanban: {
    columns: {
      status: ProjectStatus;
      label: string;
      projectIds: string[];
      count: number;
    }[];
  };
  projects: Project[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNextPage: boolean;
  };
};

export type ProjectDetailsResponse = {
  project: Project;
  taskItems: ProjectTask[];
};

export type CreateProjectBody = {
  title: string;
  description: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  responsibleId?: string;
  assigneeIds: string[];
  labels: string[];
  dueDate: string;
  taskItems?: {
    title: string;
    status: ProjectStatus;
    priority: ProjectPriority;
    assigneeIds: string[];
    labels: string[];
    dueDate: string;
  }[];
};

export type UpdateProjectBody = Partial<CreateProjectBody>;

export type CreateTaskBody = {
  title: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  responsibleId: string;
  assigneeIds: string[];
  labels: string[];
  dueDate: string;
};

export type UpdateTaskBody = Partial<CreateTaskBody>;

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

function uniquePreservingOrder(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function toDateInputValue(value: string) {
  return value.includes('T') ? value.slice(0, 10) : value;
}

function normalizeProjectTask(task: ProjectTask): ProjectTask {
  return {
    ...task,
    dueDate: toDateInputValue(task.dueDate),
    createdAt: toDateInputValue(task.createdAt),
    updatedAt: task.updatedAt ? toDateInputValue(task.updatedAt) : undefined,
  };
}

function normalizeProject(project: Project): Project {
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

function createQueryString(query?: ProjectsPageQuery) {
  const params = new URLSearchParams();

  if (!query) return '';

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    params.set(key, String(value));
  });

  const queryString = params.toString();

  return queryString ? `?${queryString}` : '';
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

  if (!headers.has('Authorization')) {
    const authorizationHeader = getStoredAuthorizationHeader();

    if (authorizationHeader) {
      headers.set('Authorization', authorizationHeader);
    }
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

  throw new BffProjectError(
    errorBody?.error?.message ?? `Erreur BFF (${response.status})`,
    response.status,
    errorBody?.error?.code,
    errorBody?.error?.details
  );
}

async function requestBff<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(`/api/bff${path}`, {
    ...init,
    headers: createRequestHeaders(init),
  });

  if (!response.ok) {
    await parseResponseError(response);
  }

  if (response.status === 204) return undefined as T;

  return (await response.json()) as T;
}

export function getBffProjectErrorMessage(error: unknown) {
  if (error instanceof BffProjectError) return error.message;
  if (error instanceof Error) return error.message;

  return 'Une erreur inconnue est survenue.';
}

export async function getProjectsPage(query?: ProjectsPageQuery, signal?: AbortSignal) {
  const response = await requestBff<ProjectsPageResponse>(`/projects-page${createQueryString(query)}`, { signal });

  return {
    ...response,
    projects: response.projects.map(normalizeProject),
  };
}

export async function getProjectDetails(projectId: string) {
  return normalizeProjectDetails(await requestBff<ProjectDetailsResponse>(`/projects/${encodeURIComponent(projectId)}`));
}

export async function createProject(body: CreateProjectBody) {
  return normalizeProjectDetails(
    await requestBff<ProjectDetailsResponse>('/projects', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  );
}

export async function updateProject(projectId: string, body: UpdateProjectBody) {
  return normalizeProjectDetails(
    await requestBff<ProjectDetailsResponse>(`/projects/${encodeURIComponent(projectId)}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  );
}

export async function duplicateProject(projectId: string) {
  return normalizeProjectDetails(
    await requestBff<ProjectDetailsResponse>(`/projects/${encodeURIComponent(projectId)}/duplicate`, {
      method: 'POST',
    })
  );
}

export function deleteProject(projectId: string) {
  return requestBff<void>(`/projects/${encodeURIComponent(projectId)}`, {
    method: 'DELETE',
  });
}

export async function createProjectTask(projectId: string, body: CreateTaskBody) {
  return normalizeProjectTask(
    await requestBff<ProjectTask>(`/projects/${encodeURIComponent(projectId)}/tasks`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  );
}

export async function updateProjectTask(projectId: string, taskId: string, body: UpdateTaskBody) {
  return normalizeProjectTask(
    await requestBff<ProjectTask>(
      `/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(body),
      }
    )
  );
}

export async function updateProjectTaskStatus(projectId: string, taskId: string, status: ProjectStatus) {
  return normalizeProjectTask(
    await requestBff<ProjectTask>(
      `/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }
    )
  );
}

export function mergeProjectDetails(details: ProjectDetailsResponse): Project {
  return {
    ...details.project,
    taskItems: details.taskItems,
  };
}

export function createProjectBodyFromForm(form: ProjectFormState): CreateProjectBody {
  const assigneeIds = uniquePreservingOrder(form.assignees);
  const responsibleId = form.responsible.trim() || assigneeIds[0];

  return {
    title: form.title.trim(),
    description: form.description.trim(),
    status: form.status,
    priority: form.priority,
    ...(responsibleId ? { responsibleId } : {}),
    assigneeIds: uniquePreservingOrder([responsibleId ?? '', ...assigneeIds]),
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
