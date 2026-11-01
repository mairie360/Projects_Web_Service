// Field projection derived from the pinned published GetProjectsPage200 response.
import { boolean, choice, list, nullValue, number, optional, ranged, record, text, union } from './receipt-readers';
const dto2 = choice(["Admin", "Maire", "Responsable", "User", "Guest"]);
const dto3 = choice(["all", "team", "assigned"]);
const dto1 = record({ "canCommentTasks": boolean, "canCreateProject": boolean, "canManageProjects": boolean, "canManageTasks": boolean, "canUpdateAssignedTaskStatus": boolean, "role": dto2, "scope": dto3 });
const dto5 = record({ "label": text, "value": text });
const dto6 = record({ "label": text, "value": text });
const dto4 = record({ "priorities": list(dto5), "priority": text, "search": union(text, nullValue), "status": text, "statuses": list(dto6) });
const dto9 = choice(["todo", "in-progress", "review", "done"]);
const dto8 = record({ "count": number, "label": text, "projectIds": list(text), "status": dto9 });
const dto7 = record({ "columns": list(dto8) });
const dto11 = record({ "label": text, "value": text });
const dto12 = record({ "avatarUrl": union(text, nullValue), "label": text, "name": text, "value": text });
const dto10 = record({ "labels": list(dto11), "members": list(dto12) });
const dto14 = choice(["kanban", "grid", "table"]);
const dto16 = choice(["kanban", "grid", "table"]);
const dto15 = record({ "label": text, "value": dto16 });
const dto13 = record({ "defaultView": dto14, "subtitle": text, "title": text, "views": list(dto15) });
const dto17 = record({ "hasNextPage": boolean, "limit": number, "page": number, "total": number });
const dto19 = record({ "avatarUrl": union(text, nullValue), "id": text, "name": text });
const dto20 = record({ "canAssignMembers": boolean, "canClose": boolean, "canCreateTask": boolean, "canDelete": boolean, "canDuplicate": boolean, "canEdit": boolean, "canView": boolean });
const dto21 = choice(["high", "medium", "low"]);
const dto22 = record({ "avatarUrl": union(text, nullValue), "id": text, "name": text });
const dto23 = choice(["todo", "in-progress", "review", "done"]);
const dto24 = record({ "active": number, "archived": number, "completed": number, "total": number });
const dto18 = record({ "assignees": list(dto19), "createdAt": text, "description": text, "dueDate": text, "id": text, "labels": list(text), "permissions": dto20, "priority": dto21, "priorityLabel": text, "progress": ranged(number, 0, 100), "responsible": dto22, "status": dto23, "statusLabel": text, "tasks": dto24, "title": text });
const dto26 = record({ "high": optional(number), "medium": optional(number), "low": optional(number) });
const dto27 = record({ "todo": optional(number), "in-progress": optional(number), "review": optional(number), "done": optional(number) });
const dto25 = record({ "projectsByPriority": dto26, "projectsByStatus": dto27, "totalProjects": number });
const dto0 = record({ "access": dto1, "filters": dto4, "kanban": dto7, "options": dto10, "page": dto13, "pagination": dto17, "projects": list(dto18), "summary": dto25 });

export const readGetProjectsPage200 = dto0;

import type { ProjectsPageResponse } from '@mairie360/bff-project-openapi/model';
import { isProjectPaginationValid } from './projectPagination';
import type { ProjectPageUrlState } from './project-page-query';
export function parseProjectsPageReceipt(value: unknown, requestedPage = 1): ProjectsPageResponse {
  if (!isProjectPaginationValid((value as { pagination?: unknown } | null)?.pagination, requestedPage)) throw new Error('La pagination reçue est incohérente. Réessayez le chargement des projets.');
  const parsed = readGetProjectsPage200(value) as ProjectsPageResponse;
  if (new Set(parsed.projects.map(project => project.id)).size !== parsed.projects.length || parsed.projects.some(project => !project.id.trim())) throw new Error('Les projets reçus ne sont pas cohérents.');
  return { ...parsed, projects: parsed.projects.map(project => ({ ...project, dueDate: project.dueDate.split('T')[0], createdAt: project.createdAt.split('T')[0] })) };
}
export type InitialProjectsPage = { status: 'confirmed'; data: ProjectsPageResponse; query: ProjectPageUrlState } | { status: 'unavailable'; message: string };
export const PROJECT_INITIAL_UNAVAILABLE = 'Le premier chargement des projets est indisponible. Réessayez dans cette page.';
export function readInitialProjectsPage(value?: InitialProjectsPage) {
  if (value?.status !== 'confirmed') return null;
  try { return { ...value, data: parseProjectsPageReceipt(value.data, Number(value.query.page)) }; } catch { return null; }
}
