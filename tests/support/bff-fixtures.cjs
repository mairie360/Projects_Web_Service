// Réponses de BFF_Project conformes à contracts/openapi.json et réponses de BFF User conformes au
// paquet @mairie360/bff-user-openapi installé. Les mocks valident chaque réponse de succès contre le
// contrat : une fixture qui dérive du contrat fait échouer le test qui l'utilise.

const STATUS_LABELS = { todo: 'À faire', 'in-progress': 'En cours', review: 'En revue', done: 'Terminé' };
const PRIORITY_LABELS = { high: 'Haute', medium: 'Moyenne', low: 'Basse' };

const person = (id, name) => ({ id: String(id), name, avatarUrl: null });

/** Agents de la mairie ; l'id est celui de la base (test user id 2 = Alice). */
const agents = {
  admin: { id: 1, first_name: 'Admin', last_name: 'Mairie', role: 'Admin' },
  alice: { id: 2, first_name: 'Alice', last_name: 'Martin', role: 'User' },
  marie: { id: 3, first_name: 'Marie', last_name: 'Durand', role: 'Responsable' },
};
const people = Object.fromEntries(Object.entries(agents).map(([key, agent]) => [key, person(agent.id, `${agent.first_name} ${agent.last_name}`)]));

function projectTask(overrides = {}) {
  const status = overrides.status ?? 'todo';
  const priority = overrides.priority ?? 'medium';
  return {
    id: 'task-1',
    title: 'Relevé des candélabres',
    status,
    statusLabel: STATUS_LABELS[status],
    responsible: people.marie,
    assignees: [people.marie, people.alice],
    priority,
    priorityLabel: PRIORITY_LABELS[priority],
    labels: ['voirie'],
    dueDate: '2026-10-01T00:00:00.000Z',
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
    statusLabel: STATUS_LABELS[status],
    priority,
    priorityLabel: PRIORITY_LABELS[priority],
    responsible: people.marie,
    assignees: [people.marie, people.alice],
    labels: ['voirie', 'énergie'],
    progress: 50,
    dueDate: '2026-12-15T00:00:00.000Z',
    createdAt: '2026-09-01T08:30:00.000Z',
    tasks: { total: 2, completed: 1 },
    permissions: { canView: true, canEdit: true, canDuplicate: true, canDelete: true, canCreateTask: true, canAssignMembers: true, canClose: true },
    ...overrides,
  };
}

function projectDetails(project = projectListItem(), taskItems = [projectTask(), projectTask({ id: 'task-2', status: 'done' })]) {
  return { project, taskItems };
}

function projectsPage(projects = [projectListItem()], overrides = {}) {
  const byStatus = Object.fromEntries(Object.keys(STATUS_LABELS).map((status) => [status, projects.filter((project) => project.status === status).length]));
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
      statuses: Object.entries(STATUS_LABELS).map(([value, label]) => ({ label, value })),
      priorities: Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ label, value })),
    },
    options: {
      members: Object.values(people).map(({ id, name }) => ({ label: name, value: id, name, avatarUrl: null })),
      labels: [{ label: 'voirie', value: 'voirie' }],
    },
    summary: { totalProjects: projects.length, projectsByStatus: byStatus, projectsByPriority: { high: projects.length, medium: 0, low: 0 } },
    kanban: {
      columns: Object.entries(STATUS_LABELS).map(([status, label]) => {
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
    comments: [taskComment()],
    history: [{ id: 'history-1', action: 'status_changed', label: 'Statut modifié', author: { id: people.marie.id, name: people.marie.name }, createdAt: '2026-09-02T10:00:00.000Z', changes: { status: 'in-progress' } }],
  };
}

/** Enveloppe d'erreur du BFF (schéma ApiError). */
const apiError = (code, message, details = []) => ({ error: { code, message, details } });

/** Corps de BFF User `GET /me` et `GET /session/me` (SessionResponse). */
function sessionResponse(agent = agents.marie, user = {}) {
  return {
    user: {
      id: agent.id,
      first_name: agent.first_name,
      last_name: agent.last_name,
      email: `${agent.first_name.toLowerCase()}@mairie.test`,
      phone: null,
      status: 'active',
      role: agent.role,
      ...user,
    },
    groups: [{ id: 1, name: 'Service urbanisme', owner_id: 1, description: null }],
    roles: [{ id: 3, name: agent.role }],
  };
}

const b64url = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
/**
 * JWT non signé : le front ne fait que décoder `exp`, la signature est vérifiée par les BFF. Expiration fixe
 * (01/01/2100) pour que deux appels à `jwt(sub)` donnent toujours le même jeton.
 */
const jwt = (sub, exp = 4102444800) => `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({ sub: String(sub), exp })}.signature`;

module.exports = { agents, people, projectTask, projectListItem, projectDetails, projectsPage, taskComment, taskCollaboration, apiError, sessionResponse, jwt };
