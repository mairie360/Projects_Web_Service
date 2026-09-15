const assert = require('node:assert/strict');
const { describe, test, before, after, beforeEach, afterEach } = require('node:test');
const { requireTs } = require('./support/typescript.cjs');
const { createFrontHarness } = require('./support/front-harness.cjs');
const { analyseNetworkCalls } = require('./support/network-calls.cjs');
const { unreachableUrl } = requireTs('tests/support/contract-mock-server.ts');
const fixtures = require('./support/bff-fixtures.cjs');

// Client BFF_Project du navigateur (src/lib/bffProjectClient.ts) testé de bout en bout sans stub de fetch
// applicatif : fonction du client → route catch-all Next.js → proxy contractuel → vrai serveur HTTP
// simulant BFF_Project à partir de contracts/openapi.json. Le mock refuse tout chemin, méthode, paramètre
// ou corps absent du contrat et valide chaque réponse ; le harnais refuse tout autre appel réseau.

const harness = createFrontHarness();
const { bffProject, bffUser } = harness;
let client;

before(async () => {
  await harness.start();
  client = requireTs('src/lib/bffProjectClient.ts');
});
after(() => harness.stop());
beforeEach(() => {
  harness.reset();
  harness.signIn(fixtures.jwt(fixtures.agents.marie.id));
});
afterEach(() => assert.deepEqual(harness.violations(), []));

const bearer = (agent = fixtures.agents.marie) => `Bearer ${fixtures.jwt(agent.id)}`;
const onlyCall = (template, method) => {
  const calls = bffProject.calls(template, method);
  assert.equal(calls.length, 1, `${method} ${template} doit être appelé une fois`);
  return calls[0];
};

function projectForm(overrides = {}) {
  return {
    title: '  Rénovation de l’éclairage public ',
    description: ' Remplacement des candélabres. ',
    status: 'todo',
    priority: 'high',
    responsible: '',
    assignees: ['3', ' 2 ', '3', ''],
    labels: ['voirie', ' voirie', 'énergie'],
    dueDate: '2026-12-15',
    progress: 0,
    totalTasks: 1,
    completedTasks: 0,
    taskItems: [fixtures.projectTask({ title: ' Relevé ', assignees: [fixtures.people.alice, { name: 'Prestataire' }], labels: ['voirie', 'voirie'] })],
    ...overrides,
  };
}

describe('lecture des projets', () => {
  test('GET /projects-page transmet uniquement les filtres déclarés et normalise les dates', async () => {
    bffProject.on('get', '/projects-page', { body: fixtures.projectsPage() });

    const page = await client.getProjectsPage({ q: 'éclairage', status: 'in-progress', priority: 'all', view: 'table', page: 2, limit: 10, dueBefore: '2026-12-31', dueAfter: '', });

    const call = onlyCall('/projects-page', 'get');
    assert.deepEqual(Object.fromEntries(call.url.searchParams), { q: 'éclairage', status: 'in-progress', priority: 'all', view: 'table', page: '2', limit: '10', dueBefore: '2026-12-31' });
    assert.equal(call.headers.authorization, bearer());
    assert.equal(call.headers.accept, 'application/json');
    assert.equal(page.projects[0].dueDate, '2026-12-15');
    assert.equal(page.projects[0].createdAt, '2026-09-01');
    assert.equal(page.access.role, 'Responsable');
  });

  test('sans filtre ni cookie, le jeton stocké (y compris la clé historique) sert d’Authorization', async () => {
    harness.cookies.clear();
    harness.storage.setItem('mairie360.projects.jwt', ` ${fixtures.jwt(fixtures.agents.alice.id)} `);
    bffProject.on('get', '/projects-page', { body: fixtures.projectsPage([]) });

    await client.getProjectsPage();

    const call = onlyCall('/projects-page', 'get');
    assert.equal(call.url.search, '');
    assert.equal(call.headers.authorization, bearer(fixtures.agents.alice));
    assert.equal(client.getStoredBffProjectJwtToken(), fixtures.jwt(fixtures.agents.alice.id));
    assert.equal(harness.storage.getItem('mairie360.auth.jwt'), fixtures.jwt(fixtures.agents.alice.id));
  });

  test('un en-tête Authorization explicite n’est jamais remplacé par le cookie', async () => {
    client.storeBffProjectJwtToken('Bearer explicit-session');
    bffProject.on('get', '/projects-page', { body: fixtures.projectsPage([]) });

    await client.getProjectsPage({ view: 'kanban' });

    assert.equal(onlyCall('/projects-page', 'get').headers.authorization, 'Bearer explicit-session');
  });

  test('GET /projects/{projectId} encode l’identifiant et fusionne les tâches normalisées', async () => {
    bffProject.on('get', '/projects/{projectId}', ({ pathParams }) => ({ body: fixtures.projectDetails(fixtures.projectListItem({ id: pathParams.projectId })) }));

    const details = await client.getProjectDetails('projet 42');

    assert.equal(onlyCall('/projects/{projectId}', 'get').pathParams.projectId, 'projet 42');
    assert.equal(details.project.id, 'projet 42');
    assert.deepEqual(details.project.taskItems, details.taskItems);
    assert.deepEqual(details.taskItems.map((task) => [task.dueDate, task.createdAt, task.updatedAt]), [['2026-10-01', '2026-09-01', '2026-09-02'], ['2026-10-01', '2026-09-01', '2026-09-02']]);
    assert.deepEqual(client.mergeProjectDetails(details), { ...details.project, taskItems: details.taskItems });
  });

  test('une tâche sans updatedAt reste sans updatedAt', async () => {
    const task = fixtures.projectTask();
    delete task.updatedAt;
    bffProject.on('get', '/projects/{projectId}', { body: fixtures.projectDetails(fixtures.projectListItem(), [task]) });

    const details = await client.getProjectDetails('project-1');

    assert.equal(details.taskItems[0].updatedAt, undefined);
  });

  test('GET /projects/{projectId}/tasks/{taskId}/collaboration renvoie commentaires et historique', async () => {
    bffProject.on('get', '/projects/{projectId}/tasks/{taskId}/collaboration', { body: fixtures.taskCollaboration() });

    const collaboration = await client.getTaskCollaboration('project-1', 'task-1');

    assert.deepEqual(onlyCall('/projects/{projectId}/tasks/{taskId}/collaboration', 'get').pathParams, { projectId: 'project-1', taskId: 'task-1' });
    assert.deepEqual(collaboration, fixtures.taskCollaboration());
  });
});

describe('écritures sur les projets', () => {
  test('POST /projects envoie un CreateProjectBody conforme construit depuis le formulaire', async () => {
    bffProject.on('post', '/projects', { status: 201, body: fixtures.projectDetails() });

    const details = await client.createProject(client.createProjectBodyFromForm(projectForm()));

    const call = onlyCall('/projects', 'post');
    assert.equal(call.headers['content-type'], 'application/json');
    assert.deepEqual(call.body, {
      title: 'Rénovation de l’éclairage public',
      description: 'Remplacement des candélabres.',
      status: 'todo',
      priority: 'high',
      responsibleId: '3',
      assigneeIds: ['3', '2'],
      labels: ['voirie', 'énergie'],
      dueDate: '2026-12-15',
      taskItems: [{ title: 'Relevé', status: 'todo', priority: 'medium', assigneeIds: ['2', 'Prestataire'], labels: ['voirie'], dueDate: '2026-10-01T00:00:00.000Z' }],
    });
    assert.equal(details.project.dueDate, '2026-12-15');
  });

  test('PATCH /projects/{projectId} place le responsable choisi en tête des participants', async () => {
    bffProject.on('patch', '/projects/{projectId}', { body: fixtures.projectDetails() });

    await client.updateProject('project-1', client.updateProjectBodyFromForm(projectForm({ responsible: ' 1 ', assignees: ['2'], taskItems: [] })));

    const { body } = onlyCall('/projects/{projectId}', 'patch');
    assert.equal(body.responsibleId, '1');
    assert.deepEqual(body.assigneeIds, ['1', '2']);
    assert.deepEqual(body.taskItems, []);
  });

  test('POST /projects/{projectId}/duplicate part sans corps', async () => {
    bffProject.on('post', '/projects/{projectId}/duplicate', { status: 201, body: fixtures.projectDetails(fixtures.projectListItem({ id: 'project-2' })) });

    const details = await client.duplicateProject('project-1');

    const call = onlyCall('/projects/{projectId}/duplicate', 'post');
    assert.equal(call.body, undefined);
    assert.equal(call.headers['content-type'], undefined);
    assert.equal(details.project.id, 'project-2');
  });

  test('PATCH /projects/{projectId}/close envoie le statut de clôture', async () => {
    bffProject.on('patch', '/projects/{projectId}/close', { body: fixtures.projectDetails(fixtures.projectListItem({ status: 'review' })) });

    const details = await client.closeProject('project-1', 'review');

    assert.deepEqual(onlyCall('/projects/{projectId}/close', 'patch').body, { status: 'review' });
    assert.equal(details.project.status, 'review');
  });

  test('DELETE /projects/{projectId} résout sur un 204 sans corps', async () => {
    bffProject.on('delete', '/projects/{projectId}', { status: 204 });

    assert.equal(await client.deleteProject('project-1'), undefined);
    onlyCall('/projects/{projectId}', 'delete');
  });
});

describe('écritures sur les tâches', () => {
  const draft = {
    title: ' Commander les lampes ',
    status: 'todo',
    responsible: { name: 'Marie Durand' },
    assignees: [fixtures.people.alice, fixtures.people.alice],
    priority: 'low',
    labels: ['achat', ''],
    dueDate: '2026-11-01',
  };

  test('POST /projects/{projectId}/tasks envoie un CreateTaskBody issu du brouillon', async () => {
    bffProject.on('post', '/projects/{projectId}/tasks', { status: 201, body: fixtures.projectTask({ id: 'task-3' }) });

    const task = await client.createProjectTask('project-1', client.taskBodyFromDraft(draft));

    assert.deepEqual(onlyCall('/projects/{projectId}/tasks', 'post').body, {
      title: 'Commander les lampes', status: 'todo', priority: 'low', responsibleId: 'Marie Durand',
      assigneeIds: ['Marie Durand', '2'], labels: ['achat'], dueDate: '2026-11-01',
    });
    assert.equal(task.dueDate, '2026-10-01');
  });

  test('un brouillon sans responsable prend le premier participant', () => {
    const body = client.taskBodyFromDraft({ ...draft, responsible: { name: '' } });
    assert.equal(body.responsibleId, '2');
    assert.deepEqual(body.assigneeIds, ['2']);
  });

  test('PATCH /projects/{projectId}/tasks/{taskId} et /status ciblent la tâche encodée', async () => {
    bffProject.on('patch', '/projects/{projectId}/tasks/{taskId}', { body: fixtures.projectTask({ title: 'Renommée' }) });
    bffProject.on('patch', '/projects/{projectId}/tasks/{taskId}/status', { body: fixtures.projectTask({ status: 'done' }) });

    const renamed = await client.updateProjectTask('project-1', 'tâche 1', { title: 'Renommée' });
    const done = await client.updateProjectTaskStatus('project-1', 'task-1', 'done');

    const update = onlyCall('/projects/{projectId}/tasks/{taskId}', 'patch');
    assert.equal(update.url.pathname, '/projects/project-1/tasks/t%C3%A2che%201');
    assert.deepEqual(update.body, { title: 'Renommée' });
    assert.deepEqual(onlyCall('/projects/{projectId}/tasks/{taskId}/status', 'patch').body, { status: 'done' });
    assert.equal(renamed.title, 'Renommée');
    assert.equal(done.completed, true);
  });

  test('DELETE /projects/{projectId}/tasks/{taskId} et POST /comments', async () => {
    bffProject.on('delete', '/projects/{projectId}/tasks/{taskId}', { status: 204 });
    bffProject.on('post', '/projects/{projectId}/tasks/{taskId}/comments', ({ body }) => ({ status: 201, body: fixtures.taskComment({ message: body.message }) }));

    assert.equal(await client.deleteProjectTask('project-1', 'task-1'), undefined);
    const comment = await client.addTaskComment('project-1', 'task-2', 'Devis validé.');

    onlyCall('/projects/{projectId}/tasks/{taskId}', 'delete');
    assert.deepEqual(onlyCall('/projects/{projectId}/tasks/{taskId}/comments', 'post').pathParams, { projectId: 'project-1', taskId: 'task-2' });
    assert.equal(comment.message, 'Devis validé.');
  });
});

describe('erreurs du BFF', () => {
  test('les erreurs ApiError documentées deviennent des BffProjectError typées', async () => {
    const cases = [
      [400, () => client.createProject(client.createProjectBodyFromForm(projectForm())), 'post', '/projects', fixtures.apiError('BAD_REQUEST', 'Titre requis', [{ path: 'title' }])],
      [403, () => client.addTaskComment('project-1', 'task-1', 'Hors équipe'), 'post', '/projects/{projectId}/tasks/{taskId}/comments', fixtures.apiError('FORBIDDEN', 'Accès refusé')],
      [404, () => client.getProjectDetails('inconnu'), 'get', '/projects/{projectId}', fixtures.apiError('NOT_FOUND', 'Projet introuvable')],
      [501, () => client.duplicateProject('project-1'), 'post', '/projects/{projectId}/duplicate', fixtures.apiError('NOT_IMPLEMENTED', 'Fonction indisponible')],
      [502, () => client.getProjectsPage(), 'get', '/projects-page', fixtures.apiError('BAD_GATEWAY', 'Service amont indisponible')],
    ];
    for (const [status, call, method, template, body] of cases) {
      bffProject.on(method, template, { status, body });
      await assert.rejects(call(), (error) => {
        assert.ok(error instanceof client.BffProjectError);
        assert.deepEqual([error.status, error.code, error.message, error.details], [status, body.error.code, body.error.message, body.error.details]);
        assert.equal(client.getBffProjectErrorMessage(error), body.error.message);
        return true;
      });
    }
    assert.equal(harness.location.reloads, 0);
  });

  test('un corps d’erreur illisible donne un message générique avec le statut', async () => {
    // Page HTML d'un reverse proxy devant le BFF : volontairement hors contrat (le contrat impose ApiError).
    bffProject.on('get', '/projects-page', { status: 502, raw: '<html>Bad Gateway</html>', contentType: 'text/html', outOfContract: true });

    await assert.rejects(client.getProjectsPage(), { name: 'BffProjectError', status: 502, code: undefined, message: 'Erreur BFF (502)' });
  });

  test('un BFF injoignable produit l’erreur 502 contrôlée du proxy', async () => {
    const closed = await unreachableUrl();
    harness.allowUpstream(closed);
    process.env.BFF_PROJECT_BASE_URL = closed;

    await assert.rejects(client.getProjectDetails('project-1'), { status: 502, message: 'Le service est indisponible.' });
    assert.deepEqual(bffProject.requests, []);
  });

  test('un 401 déconnecte via BFF User POST /auth/logout, vide le stockage et recharge la page', async () => {
    client.storeBffProjectJwtToken('stale-session');
    bffProject.on('get', '/projects-page', { status: 401, body: fixtures.apiError('UNAUTHORIZED', 'Session expirée') });
    bffUser.on('post', '/auth/logout', { body: { message: 'Déconnecté' }, headers: { 'Set-Cookie': 'accessToken=; Max-Age=0; Path=/; HttpOnly' } });

    await assert.rejects(client.getProjectsPage(), { status: 401, code: 'UNAUTHORIZED', message: 'Votre session a expiré.' });

    assert.equal(bffUser.calls('/auth/logout', 'post')[0].headers.authorization, bearer());
    assert.equal(harness.storage.length, 0);
    assert.equal(harness.cookies.has('accessToken'), false);
    assert.equal(harness.location.reloads, 1);
    assert.deepEqual(harness.browserCalls.map(({ method, path }) => `${method} ${path}`), ['GET /projects-page', 'POST /api/auth/logout']);
  });

  test('une requête annulée rejette avec AbortError', async () => {
    bffProject.on('get', '/projects-page', { body: fixtures.projectsPage([]) });
    const controller = new AbortController();
    controller.abort();

    await assert.rejects(client.getProjectsPage({}, controller.signal), { name: 'AbortError' });
    assert.deepEqual(bffProject.requests, []);
  });

  test('getBffProjectErrorMessage couvre les erreurs natives et inconnues', () => {
    assert.equal(client.getBffProjectErrorMessage(new Error('réseau')), 'réseau');
    assert.equal(client.getBffProjectErrorMessage('boom'), 'Une erreur inconnue est survenue.');
  });
});

describe('frontière contractuelle du proxy', () => {
  test('les routes, méthodes et segments hors contrat sont refusés sans atteindre le BFF', async () => {
    const unknown = await fetch('/projects/project-1/archive', { method: 'POST' });
    const wrongMethod = await fetch('/projects/project-1', { method: 'PUT', body: '{}' });
    const traversal = await fetch('/projects/a%2F..%2Fadmin');

    assert.deepEqual([unknown.status, wrongMethod.status, traversal.status], [404, 405, 400]);
    assert.equal(wrongMethod.headers.get('Allow'), 'DELETE, PATCH, GET, HEAD');
    assert.deepEqual(bffProject.requests, []);
    assert.deepEqual(bffUser.requests, []);
  });

  test('un appel direct vers une autre origine est refusé par le harnais', async () => {
    await assert.rejects(fetch('https://bff-project.example/projects-page'), TypeError);
    assert.deepEqual(harness.violations(), ['appel réseau hors contrat : GET https://bff-project.example/projects-page']);
    harness.reset();
  });

  test('chaque opération BFF_Project appelée par le client a été exercée contre le mock', () => {
    const consumed = [...new Set(analyseNetworkCalls().bffCalls.map(({ method, target }) => `${method} ${bffProject.contract.match(method, target.path).template}`))].sort();
    assert.deepEqual(harness.exercisedOperations(), consumed);
  });
});
