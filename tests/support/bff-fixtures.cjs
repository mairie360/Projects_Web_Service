// Réponses de BFF_Project conformes au contrat publié @mairie360/bff-project-openapi. Le mock valide chaque
// réponse de succès contre ce contrat : une fixture qui en dérive fait échouer le test qui l'utilise.

const STATUS_LABELS = { todo: 'À faire', 'in-progress': 'En cours', review: 'En revue', done: 'Terminé' };
// MAIR-1084: a project may also be put on hold (`on-hold`, Project API `Suspended`); a task never is.
const PROJECT_STATUS_LABELS = { todo: 'À faire', 'in-progress': 'En cours', review: 'En revue', 'on-hold': 'Suspendu', done: 'Terminé' };
const PRIORITY_LABELS = { high: 'Haute', medium: 'Moyenne', low: 'Basse' };

// BFF_Project identifie les personnes par `user-<id Core>` (schémas CreateProjectBody.assigneeIds / responsibleId).
const person = (id, name) => ({ id: `user-${id}`, name, avatarUrl: null });

/** Agents de la mairie ; l'id est celui de la base (test user id 2 = Alice). */
const agents = {
  admin: { id: 1, first_name: 'Admin', last_name: 'Mairie' },
  alice: { id: 2, first_name: 'Alice', last_name: 'Martin' },
  marie: { id: 3, first_name: 'Marie', last_name: 'Durand' },
};
const people = Object.fromEntries(Object.entries(agents).map(([key, agent]) => [key, person(agent.id, `${agent.first_name} ${agent.last_name}`)]));

function projectTask(overrides = {}) {
  const status = overrides.status ?? 'todo';
  const priority = overrides.priority ?? 'medium';
  return {
    id: 'task-1',
    title: 'Relevé des candélabres',
    // The description of the task, an empty string without one.
    description: '',
    status,
    statusId: STATUS_IDS[status],
    statusLabel: STATUS_LABELS[status],
    responsible: people.marie,
    assignees: [people.marie, people.alice],
    priority,
    priorityLabel: PRIORITY_LABELS[priority],
    labels: ['voirie'],
    dueDate: '2026-10-01T00:00:00.000Z',
    // MAIR-1087: the start date of the task, `null` without one.
    startDate: null,
    completed: status === 'done',
    createdAt: '2026-09-01T08:30:00.000Z',
    updatedAt: '2026-09-02T10:00:00.000Z',
    permissions: { canView: true, canEdit: true, canDelete: true, canUpdateStatus: true, canComment: true },
    ...overrides,
  };
}

function projectListItem(overrides = {}) {
  const status = overrides.status ?? 'in-progress';
  const priority = overrides.priority ?? 'high';
  return {
    id: 'project-1',
    title: 'Rénovation de l’éclairage public',
    description: 'Remplacement des candélabres du centre-ville.',
    status,
    statusLabel: PROJECT_STATUS_LABELS[status],
    priority,
    priorityLabel: PRIORITY_LABELS[priority],
    responsible: people.marie,
    assignees: [people.marie, people.alice],
    labels: ['voirie', 'énergie'],
    progress: 50,
    dueDate: '2026-12-15T00:00:00.000Z',
    createdAt: '2026-09-01T08:30:00.000Z',
    // MAIR-1088: the first members with their role, and the caller's role (`null` when not a member).
    members: [{ ...people.marie, role: 'manager' }, { ...people.alice, role: 'contributor' }],
    myRole: null,
    // MAIR-1085: budgets in cents of euro, `null` when not filled in.
    budgetVoted: null,
    budgetCommitted: null,
    tasks: { total: 2, completed: 1, active: 2, archived: 0 },
    // MAIR-1200: `canReopen` is true only for the managers of a closed (`done`) project.
    permissions: { canView: true, canEdit: true, canDuplicate: true, canDelete: true, canCreateTask: true, canAssignMembers: true, canClose: true, canReopen: false },
    ...overrides,
  };
}

// MAIR-880: the detail names the project's group (`null` for a project created before groups).
const DEFAULT_GROUP = { id: 'group-1', name: 'Services techniques' };
// MAIR-1088: the detail gives every member their load (active tasks assigned to them, open ones).
const memberLoad = (member, taskItems) => {
  const assigned = taskItems.filter((task) => task.assignees.some((person) => person.id === member.id));
  return { tasksOpen: assigned.filter((task) => !task.completed).length, tasksTotal: assigned.length };
};
function milestone(overrides = {}) {
  return { id: 'milestone-1', title: 'Validation du devis', dueDate: '2026-11-15', reached: false, ...overrides };
}
function projectDetails(project = projectListItem(), taskItems = [projectTask(), projectTask({ id: 'task-2', status: 'done' })]) {
  const members = (project.members ?? []).map((member) => ({ ...member, load: member.load ?? memberLoad(member, taskItems) }));
  const milestones = project.milestones ?? [];
  return { project: { group: DEFAULT_GROUP, ...project, members, milestones, milestonesTotal: project.milestonesTotal ?? milestones.length }, taskItems };
}

// MAIR-1089: a page of the project activity (comments and the history of its tasks, newest first).
function activityItem(overrides = {}) {
  return {
    kind: 'comment', id: 'comment-1', taskId: null, taskTitle: null, author: { id: people.alice.id, name: people.alice.name },
    message: 'Réunion de chantier fixée.', changes: null, label: 'Comment', createdAt: '2026-09-04T09:00:00.000Z', ...overrides,
  };
}
const projectActivity = (items = [], pagination = {}) => ({ items, pagination: { page: 1, limit: 20, total: items.length, hasNextPage: false, ...pagination } });
const projectMilestones = (milestones = [], pagination = {}) => ({ milestones, pagination: { page: 1, limit: 100, total: milestones.length, hasNextPage: false, ...pagination } });

function projectsPage(projects = [projectListItem()], overrides = {}) {
  const byStatus = Object.fromEntries(Object.keys(PROJECT_STATUS_LABELS).map((status) => [status, projects.filter((project) => project.status === status).length]));
  return {
    access: { role: 'Responsable', scope: 'team', canCreateProject: true, canManageProjects: true, canManageTasks: true, canUpdateAssignedTaskStatus: true, canCommentTasks: true },
    page: {
      title: 'Projets',
      subtitle: 'Suivi des projets de la mairie',
      defaultView: 'kanban',
      views: [{ value: 'kanban', label: 'Kanban' }, { value: 'grid', label: 'Grille' }, { value: 'table', label: 'Tableau' }],
    },
    filters: {
      search: null,
      status: 'all',
      priority: 'all',
      statuses: Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => ({ label, value })),
      priorities: Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ label, value })),
    },
    options: {
      members: Object.values(people).map(({ id, name }) => ({ label: name, value: id, name, avatarUrl: null })),
      labels: [{ label: 'voirie', value: 'voirie' }],
    },
    summary: { totalProjects: projects.length, projectsByStatus: byStatus, projectsByPriority: { high: projects.length, medium: 0, low: 0 } },
    kanban: {
      columns: Object.entries(PROJECT_STATUS_LABELS).map(([status, label]) => {
        const projectIds = projects.filter((project) => project.status === status).map((project) => project.id);
        return { status, label, projectIds, count: projectIds.length };
      }),
    },
    projects,
    pagination: { page: 1, limit: 20, total: projects.length, hasNextPage: false },
    ...overrides,
  };
}

function taskComment(overrides = {}) {
  return { id: 'comment-1', message: 'Devis reçu.', author: { id: people.alice.id, name: people.alice.name }, createdAt: '2026-09-03T09:00:00.000Z', ...overrides };
}

function taskCollaboration() {
  return {
    // TaskCollaborationResponse.pagination (comments and history are read page by page since Project API 1.0).
    pagination: { page: 1, limit: 50, commentsTotal: 1, historyTotal: 1, hasNextPage: false },
    comments: [taskComment()],
    history: [{ id: 'history-1', action: 'status_changed', label: 'Statut modifié', author: { id: people.marie.id, name: people.marie.name }, createdAt: '2026-09-02T10:00:00.000Z', changes: { status: 'in-progress' } }],
  };
}

/** Codes d'erreur publiés par ErrorResponseErrorCode (enveloppe commune des BFFs, MAIR-234). */
const ERROR_CODES = new Set(['BAD_REQUEST', 'UNAUTHORIZED', 'FORBIDDEN', 'NOT_FOUND', 'CONFLICT', 'PAYLOAD_TOO_LARGE', 'UNPROCESSABLE_ENTITY', 'TOO_MANY_REQUESTS', 'INTERNAL_ERROR', 'BAD_GATEWAY', 'SERVICE_UNAVAILABLE', 'GATEWAY_TIMEOUT']);
/** Codes historiques des scénarios de test, ramenés au code publié correspondant. */
const LEGACY_CODES = { UNAVAILABLE: 'SERVICE_UNAVAILABLE', BFF_UNAVAILABLE: 'SERVICE_UNAVAILABLE', REFUSED: 'FORBIDDEN', NOT_IMPLEMENTED: 'INTERNAL_ERROR' };

/**
 * Enveloppe d'erreur du BFF (schéma ErrorResponse) : le code appartient à l'enum publié (les codes de scénario
 * tels que READ/PAGE deviennent BAD_GATEWAY) et chaque détail porte un message.
 */
const apiError = (code, message, details = []) => ({
  error: {
    code: ERROR_CODES.has(code) ? code : (LEGACY_CODES[code] ?? 'BAD_GATEWAY'),
    message,
    details: details.map((detail) => (typeof detail === 'object' && detail !== null && !('message' in detail) ? { ...detail, message } : detail)),
  },
});

const b64url = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
/**
 * JWT non signé : le front ne fait que décoder `exp`, la signature est vérifiée par les BFF. Expiration fixe
 * (01/01/2100) pour que deux appels à `jwt(sub)` donnent toujours le même jeton.
 */
const jwt = (sub, exp = 4102444800) => `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({ sub: String(sub), exp })}.signature`;

// Per-project task statuses (MAIR-567): one status per legacy task status, so each task's `statusId` resolves.
// The contract identifies a status as `status-<n>`.
const STATUS_IDS = { todo: 'status-1', 'in-progress': 'status-2', review: 'status-3', done: 'status-4' };
const STATUS_CATEGORIES = { todo: 'todo', 'in-progress': 'in-progress', review: 'in-progress', done: 'done' };
const STATUS_COLORS = { todo: '#57606a', 'in-progress': '#0969da', review: '#8250df', done: '#1a7f37' };
function projectTaskStatuses() {
  return { statuses: Object.entries(STATUS_LABELS).map(([status, name], position) => ({
    id: STATUS_IDS[status], name, color: STATUS_COLORS[status], category: STATUS_CATEGORIES[status], position, taskCount: 0,
  })) };
}
const archivedTasks = (tasks = []) => ({ tasks, pagination: { page: 1, limit: 100, total: tasks.length, hasNextPage: false } });

// MAIR-880: groups the caller may link a project to (`GET /project-groups`); one group by default.
const projectGroups = (groups = [{ id: 'group-1', name: 'Services techniques' }]) => ({ groups });

// MAIR-1230: answer of the global search (`GET /search`), results grouped by module.
const globalSearch = (groups = [
  { module: 'projects', items: [
    { kind: 'project', id: 1, title: 'Rénovation de l’éclairage public', excerpt: 'Remplacement des candélabres', parent_id: null, updated_at: '2026-11-20T09:00:00.000Z' },
    { kind: 'task', id: 2, title: 'Relevé des candélabres', excerpt: null, parent_id: 1, updated_at: '2026-11-21T09:00:00.000Z' },
  ] },
], unavailable = []) => ({ groups, unavailable });

module.exports = { globalSearch, milestone, activityItem, projectActivity, projectMilestones, projectGroups, projectTaskStatuses, archivedTasks, agents, people, projectTask, projectListItem, projectDetails, projectsPage, taskComment, taskCollaboration, apiError, jwt };
