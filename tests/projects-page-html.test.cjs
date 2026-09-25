const assert = require('node:assert/strict');
const { test, before, after, beforeEach, afterEach } = require('node:test');
const { requireTs } = require('./support/typescript.cjs');
const { installReactRuntime, mount } = require('./support/server-view.cjs');

// HTML of the projects page (src/app/page.tsx) rendered with react-dom/server against the mocked BFF_Project:
// the real page, its components and the shell components of @mairie360/lib-components are rendered, the hook
// state is kept between render passes (tests/support/server-view.cjs), so the markup reflects what the BFF
// answered through the contract-gated proxy.

installReactRuntime();
const React = require('react');
const { createFrontHarness } = require('./support/front-harness.cjs');
const fixtures = require('./support/bff-fixtures.cjs');
const ProjectsPage = requireTs('src/app/page.tsx').default;

const harness = createFrontHarness();
const { bffProject } = harness;
let view;

before(() => harness.start());
after(() => harness.stop());
beforeEach(() => {
  harness.reset();
  harness.signIn(fixtures.jwt(fixtures.agents.marie.id));
});
afterEach(() => {
  view?.unmount();
  view = undefined;
  assert.deepEqual(harness.violations(), []);
});

const pageCalls = () => bffProject.calls('/projects-page', 'get').map((call) => Object.fromEntries(call.url.searchParams));

async function renderLoadedPage(body = fixtures.projectsPage()) {
  bffProject.on('get', '/projects-page', { body });
  view = mount(React.createElement(ProjectsPage));
  return view.waitFor((html) => !html.includes('Chargement des projets'));
}

test('the first pass renders the loading state, the next one the projects of GET /projects-page', async () => {
  bffProject.on('get', '/projects-page', { body: fixtures.projectsPage() });
  view = mount(React.createElement(ProjectsPage));

  assert.equal(view.passes, 1);
  assert.match(view.html, /<h1[^>]*>Projets<\/h1>/);
  assert.match(view.text(), /Chargement des projets\.\.\./);
  assert.equal(view.find('KanbanBoard').length, 0);
  assert.doesNotMatch(view.text(), /Nouveau projet/);

  const html = await view.waitFor((current) => !current.includes('Chargement des projets'));

  // The page debounces its first load (250 ms) and sends only the declared filters.
  assert.deepEqual(pageCalls(), [{ status: 'all', priority: 'all', view: 'kanban', page: '1', limit: '50' }]);
  assert.equal(bffProject.requests[0].headers.authorization, `Bearer ${fixtures.jwt(fixtures.agents.marie.id)}`);
  assert.match(html, /<p[^>]*>Suivi des projets de la mairie<\/p>/);
  assert.match(html, /<span[^>]*>Projets de mon équipe<\/span>/);
  assert.match(view.text(), /Rénovation de l’éclairage public/);
  assert.match(view.text(), /Remplacement des candélabres du centre-ville\./);
  assert.match(view.text(), /Nouveau projet/);
  assert.equal(view.find('KanbanBoard').length, 1);
  assert.deepEqual(view.props('KanbanBoard').columns.map((column) => column.label), ['À faire', 'En cours', 'En revue', 'Terminé']);
  assert.deepEqual(view.props('ViewToggle').options.map((option) => option.value), ['kanban', 'grid', 'table']);
  assert.equal(view.props('Header').isAdmin, false);
});

test('an agent without the creation right sees no "Nouveau projet" button', async () => {
  const page = fixtures.projectsPage();
  page.access = { ...page.access, role: 'User', scope: 'assigned', canCreateProject: false };
  await renderLoadedPage(page);

  assert.doesNotMatch(view.text(), /Nouveau projet/);
  assert.match(view.html, /<span[^>]*>Mes projets assignés<\/span>/);
  assert.equal(view.props('KanbanBoard').onAddProject, undefined);
});

test('dragging a project changes only its status and reloads the Kanban from the BFF', async () => {
  await renderLoadedPage();
  const project = view.props('KanbanBoard').projects[0];
  const moved = fixtures.projectListItem({ status: 'review' });
  bffProject.on('patch', '/projects/{projectId}', ({ body }) => ({ body: fixtures.projectDetails(fixtures.projectListItem({ status: body.status })) }));
  bffProject.on('get', '/projects-page', { body: fixtures.projectsPage([moved]) });

  const payload = new Map();
  const dataTransfer = {
    effectAllowed: 'none',
    dropEffect: 'none',
    setData(type, value) { payload.set(type, value); },
    getData(type) { return payload.get(type) ?? ''; },
  };
  await view.fire((props) => props['data-project-id'] === project.id, 'onDragStart', { dataTransfer });
  await view.fire((props) => props['data-project-status'] === 'review', 'onDragOver', { dataTransfer });
  await view.fire((props) => props['data-project-status'] === 'review', 'onDrop', { dataTransfer });
  await view.waitFor(() => pageCalls().length === 2 && view.props('KanbanBoard').projects[0].status === 'review');

  assert.equal(dataTransfer.effectAllowed, 'move');
  assert.equal(dataTransfer.dropEffect, 'move');
  assert.deepEqual(bffProject.calls('/projects/{projectId}', 'patch')[0].body, { status: 'review' });
  assert.equal(bffProject.calls('/projects/{projectId}', 'patch')[0].pathParams.projectId, project.id);
  assert.equal(pageCalls().length, 2);
  assert.equal(view.props('KanbanBoard').projects[0].status, 'review');
  assert.equal(alertText(), `Statut du projet "${project.title}" mis à jour.`);
});

test('a failed status change keeps the project in its original column and reports the error', async () => {
  await renderLoadedPage();
  const project = view.props('KanbanBoard').projects[0];
  bffProject.on('patch', '/projects/{projectId}', harness.errorReply(403, fixtures.apiError('FORBIDDEN', 'Modification du projet interdite')));

  await view.act(() => view.props('KanbanBoard').onMoveProject(project, 'done'));

  assert.deepEqual(bffProject.calls('/projects/{projectId}', 'patch')[0].body, { status: 'done' });
  assert.equal(pageCalls().length, 1);
  assert.equal(view.props('KanbanBoard').projects[0].status, 'in-progress');
  assert.equal(alertText(), 'Modification du projet interdite');
});

test('Kanban status changes reject the same column and projects without management permission', async () => {
  const forbidden = fixtures.projectListItem({ permissions: { ...fixtures.projectListItem().permissions, canEdit: false } });
  await renderLoadedPage(fixtures.projectsPage([forbidden]));

  assert.equal(view.hostElements((props) => props['data-project-id'] === forbidden.id)[0].props.draggable, false);
  await view.act(() => view.props('KanbanBoard').onMoveProject(forbidden, 'done'));
  assert.equal(bffProject.calls('/projects/{projectId}', 'patch').length, 0);

  const allowed = fixtures.projectListItem();
  bffProject.on('get', '/projects-page', { body: fixtures.projectsPage([allowed]) });
  await view.act(() => view.props('ViewToggle').onChange('grid'));
  await view.act(() => view.props('ViewToggle').onChange('kanban'));
  await view.act(() => view.props('KanbanBoard').onMoveProject(allowed, allowed.status));
  assert.equal(bffProject.calls('/projects/{projectId}', 'patch').length, 0);
});

test('Kanban ignores control-origin and foreign drags, and prevents a post-drag card click', async () => {
  await renderLoadedPage();
  const card = (props) => props['data-project-id'] === 'project-1';
  const column = (props) => props['data-project-status'] === 'review';
  let prevented = 0;
  let stopped = 0;
  const payload = new Map();
  const dataTransfer = {
    effectAllowed: 'none',
    dropEffect: 'none',
    setData(type, value) { payload.set(type, value); },
    getData(type) { return payload.get(type) ?? ''; },
  };

  await view.fire(card, 'onPointerDownCapture', { target: { closest: () => ({ tagName: 'BUTTON' }) } });
  await view.fire(card, 'onDragStart', { dataTransfer, preventDefault() { prevented++; } });
  assert.equal(prevented, 1);
  assert.equal(dataTransfer.effectAllowed, 'none');

  await view.fire(card, 'onPointerDownCapture', { target: { closest: () => null } });
  await view.fire(card, 'onDragStart', { dataTransfer });
  await view.fire(column, 'onDragOver', { dataTransfer });
  await view.fire(column, 'onDragLeave', { currentTarget: { contains: () => false }, relatedTarget: null });
  dataTransfer.setData('application/x-mairie360-project', 'another-project');
  await view.fire(column, 'onDrop', { dataTransfer });
  assert.equal(bffProject.calls('/projects/{projectId}', 'patch').length, 0);

  await view.fire(card, 'onDragEnd');
  await view.fire(card, 'onClickCapture', { preventDefault() { prevented++; }, stopPropagation() { stopped++; } });
  assert.equal(prevented, 2);
  assert.equal(stopped, 1);
});

test('Kanban disables dragging when project management access is absent', async () => {
  const page = fixtures.projectsPage();
  page.access = { ...page.access, canManageProjects: false };
  await renderLoadedPage(page);

  assert.equal(view.props('KanbanBoard').onMoveProject, undefined);
  assert.equal(view.hostElements((props) => props['data-project-id'] === 'project-1')[0].props.draggable, false);
});

test('a BFF error is rendered in the page instead of the board', async () => {
  bffProject.on('get', '/projects-page', harness.errorReply(503, fixtures.apiError('BFF_UNAVAILABLE', 'Le service projets est indisponible')));
  view = mount(React.createElement(ProjectsPage));

  const html = await view.waitFor((current) => !current.includes('Chargement des projets'));

  assert.match(html, /<div[^>]*>Le service projets est indisponible<\/div>/);
  assert.equal(view.find('KanbanBoard').length, 0);
  assert.match(html, /<h1[^>]*>Projets<\/h1>/);
});

test('switching the view reloads the page with the new view and renders the table', async () => {
  await renderLoadedPage();

  await view.act(() => view.props('ViewToggle').onChange('table'));
  await view.waitFor(() => pageCalls().length === 2 && view.find('TableView').length === 1);

  assert.equal(pageCalls()[1].view, 'table');
  assert.equal(view.find('KanbanBoard').length, 0);
  assert.match(view.text(), /Rénovation de l’éclairage public/);
});

test('opening a project loads its details and renders them in the modal', async () => {
  await renderLoadedPage();
  bffProject.on('get', '/projects/{projectId}', ({ pathParams }) => ({ body: fixtures.projectDetails(fixtures.projectListItem({ id: pathParams.projectId })) }));
  const [project] = view.props('KanbanBoard').projects;

  await view.act(() => view.props('KanbanBoard').onProjectOpen(project));
  await view.waitFor(() => view.find('ProjectDetailModal').length === 1);

  assert.equal(bffProject.calls('/projects/{projectId}', 'get')[0].pathParams.projectId, 'project-1');
  const modal = view.props('ProjectDetailModal');
  assert.equal(modal.project.id, 'project-1');
  assert.deepEqual(modal.tasks.map((task) => task.id), ['task-1', 'task-2']);
  assert.match(view.text(), /Relevé des candélabres/);

  await view.act(() => modal.onClose());
  assert.equal(view.find('ProjectDetailModal').length, 0);
});

test('creating a project posts the form, reloads the page and announces the success', async () => {
  await renderLoadedPage();
  const created = fixtures.projectListItem({ id: 'project-9', title: 'Fête de la musique', status: 'todo' });
  bffProject.on('post', '/projects', { status: 201, body: fixtures.projectDetails(created, []) });
  bffProject.on('get', '/projects-page', { body: fixtures.projectsPage([fixtures.projectListItem(), created]) });

  await view.click('Nouveau projet');
  assert.equal(view.find('CreateProjectModal').length, 1);
  assert.equal(view.props('CreateProjectModal').mode, 'create');

  await view.act(() => view.props('CreateProjectModal').onChange({ title: 'Fête de la musique', description: 'Scène place de la mairie', dueDate: '2026-06-21', responsible: fixtures.people.marie.id }));
  await view.act(() => view.props('CreateProjectModal').onSubmit({ preventDefault() {} }));
  const html = await view.waitFor((current) => current.includes('Projet &quot;Fête de la musique&quot; créé.'));

  assert.equal(bffProject.calls('/projects', 'post').length, 1);
  assert.equal(pageCalls().length, 2, 'the page is reloaded after the creation');
  assert.equal(view.find('CreateProjectModal').length, 0);
  assert.match(view.text(), /Fête de la musique/);
  assert.match(html, /Projet &quot;Fête de la musique&quot; créé\./);
});

test('an incomplete creation form is refused in the page without any network call', async () => {
  await renderLoadedPage();

  await view.click('Nouveau projet');
  await view.act(() => view.props('CreateProjectModal').onSubmit({ preventDefault() {} }));

  assert.equal(view.props('CreateProjectModal').error, 'Les champs obligatoires doivent être renseignés.');
  assert.match(view.text(), /Les champs obligatoires doivent être renseignés\./);
  assert.equal(bffProject.calls('/projects', 'post').length, 0);
});

// Filters, card actions and the detail modal: every interaction below goes through the real component
// callbacks or host elements (buttons, inputs) of the rendered page.

const alertText = () => view.find('Alert')[0]?.props.message;
const openDetails = async () => {
  bffProject.on('get', '/projects/{projectId}', ({ pathParams }) => ({ body: fixtures.projectDetails(fixtures.projectListItem({ id: pathParams.projectId })) }));
  await view.act(() => view.props('KanbanBoard').onProjectOpen(view.props('KanbanBoard').projects[0]));
  await view.waitFor(() => view.find('ProjectDetailModal').length === 1);
};

test('search, filters and the grid view reload the page with the declared query parameters', async () => {
  await renderLoadedPage();

  await view.act(() => view.props('SearchInput').onChange('éclairage'));
  assert.match(view.html, /<input[^>]*placeholder="Rechercher des projets\.\.\."[^>]*value="éclairage"/);
  await view.waitFor(() => pageCalls().length === 2);
  assert.equal(pageCalls()[1].q, 'éclairage');

  // The contract fixtures declare no `all` option: the trigger shows the first status until one is picked.
  await view.click((props, text, tag) => tag === 'button' && props['aria-haspopup'] === 'listbox' && text === 'À faire');
  assert.match(view.html, /role="listbox" aria-label="Filtrer par statut"/);
  await view.click((props, text, tag) => tag === 'button' && props.role === 'option' && text === 'En cours');
  await view.waitFor(() => pageCalls().length === 3);
  assert.equal(pageCalls()[2].status, 'in-progress');
  assert.doesNotMatch(view.html, /role="listbox"/);

  await view.fire((props) => props.type === 'date' && props['aria-label'] === 'Échéance avant', 'onChange', { target: { value: '2026-12-31' } });
  await view.waitFor(() => pageCalls().length === 4);
  assert.equal(pageCalls()[3].dueBefore, '2026-12-31');
  assert.match(view.html, /<input type="date" aria-label="Échéance avant"[^>]*value="2026-12-31"/);

  await view.act(() => view.props('ViewToggle').onChange('grid'));
  await view.waitFor(() => pageCalls().length === 5 && view.find('GridView').length === 1);
  assert.equal(pageCalls()[4].view, 'grid');
  assert.match(view.text(), /Rénovation de l’éclairage public/);

  await view.act(() => view.props('SearchInput').onChange('inexistant'));
  bffProject.on('get', '/projects-page', { body: fixtures.projectsPage([]) });
  await view.waitFor(() => pageCalls().length === 6 && view.props('GridView').projects.length === 0);
  assert.doesNotMatch(view.text(), /Rénovation de l’éclairage public/);
});

test('the card menu duplicates, edits and deletes a project through the BFF and announces each result', async () => {
  await renderLoadedPage();
  const title = 'Rénovation de l’éclairage public';

  await view.click((props) => props['aria-label'] === `Actions pour ${title}`);
  assert.match(view.html, /role="menuitem"[^>]*>[\s\S]*?Dupliquer/);
  bffProject.on('post', '/projects/{projectId}/duplicate', { status: 201, body: fixtures.projectDetails(fixtures.projectListItem({ id: 'project-2', title: `${title} (copie)` })) });
  bffProject.on('get', '/projects-page', { body: fixtures.projectsPage([fixtures.projectListItem(), fixtures.projectListItem({ id: 'project-2', title: `${title} (copie)` })]) });
  await view.click((props, text) => props.role === 'menuitem' && text === 'Dupliquer');
  await view.waitFor(() => alertText() === `Projet "${title} (copie)" dupliqué.`);
  assert.equal(bffProject.calls('/projects/{projectId}/duplicate', 'post')[0].pathParams.projectId, 'project-1');
  assert.match(view.text(), /\(copie\)/);
  assert.doesNotMatch(view.html, /role="menuitem"/, 'the menu closes after an action');

  await view.act(() => view.props('Alert').onClose());
  assert.equal(view.find('Alert').length, 0);

  bffProject.on('get', '/projects/{projectId}', ({ pathParams }) => ({ body: fixtures.projectDetails(fixtures.projectListItem({ id: pathParams.projectId })) }));
  await view.click((props) => props['aria-label'] === `Actions pour ${title}`);
  await view.click((props, text) => props.role === 'menuitem' && text === 'Modifier');
  await view.waitFor(() => view.find('CreateProjectModal').length === 1 && view.props('CreateProjectModal').form.title === title);
  assert.equal(view.props('CreateProjectModal').mode, 'edit');
  bffProject.on('patch', '/projects/{projectId}', { body: fixtures.projectDetails(fixtures.projectListItem({ title: 'Éclairage public rénové' })) });
  await view.act(() => view.props('CreateProjectModal').onChange({ title: 'Éclairage public rénové' }));
  await view.act(() => view.props('CreateProjectModal').onSubmit({ preventDefault() {} }));
  await view.waitFor(() => alertText() === 'Projet "Éclairage public rénové" modifié.');
  assert.equal(bffProject.calls('/projects/{projectId}', 'patch')[0].body.title, 'Éclairage public rénové');
  assert.equal(view.find('CreateProjectModal').length, 0);

  await view.click((props) => props['aria-label'] === `Actions pour ${title}`);
  await view.click((props, text) => props.role === 'menuitem' && text === 'Supprimer');
  assert.match(view.html, /role="dialog" aria-modal="true" aria-labelledby="delete-project-title"/);
  assert.match(view.text(), new RegExp(`Le projet ${title} et ses tâches seront supprimés définitivement\\.`));
  await view.click((props, text, tag) => tag === 'button' && text === 'Annuler');
  assert.doesNotMatch(view.html, /role="dialog"/);

  bffProject.on('delete', '/projects/{projectId}', { status: 204 });
  bffProject.on('get', '/projects-page', { body: fixtures.projectsPage([]) });
  await view.act(() => view.props('KanbanBoard').onProjectDelete(view.props('KanbanBoard').projects[0]));
  await view.click((props, text, tag) => tag === 'button' && text === 'Supprimer' && props.className.includes('bg-[#cf222e]'));
  await view.waitFor(() => alertText() === `Projet "${title}" supprimé.`);
  assert.equal(bffProject.calls('/projects/{projectId}', 'delete')[0].pathParams.projectId, 'project-1');
  assert.doesNotMatch(view.html, /role="dialog"/);
  assert.equal(view.props('KanbanBoard').projects.length, 0);
});

test('the task composer of a card refuses an empty title, then posts the task and refreshes the project', async () => {
  await renderLoadedPage();

  await view.click((props, text, tag) => tag === 'button' && text.includes('Ajouter une tâche'));
  await view.fire((props, text, tag) => tag === 'form' && props.className.includes('mt-3'), 'onSubmit');
  assert.match(view.text(), /Le titre de la tâche est obligatoire\./);
  assert.equal(bffProject.calls('/projects/{projectId}/tasks', 'post').length, 0);

  bffProject.on('post', '/projects/{projectId}/tasks', { status: 201, body: fixtures.projectTask({ id: 'task-3', title: 'Commander les mâts' }) });
  bffProject.on('get', '/projects/{projectId}', { body: fixtures.projectDetails(fixtures.projectListItem(), [fixtures.projectTask(), fixtures.projectTask({ id: 'task-3', title: 'Commander les mâts' })]) });
  await view.fire((props) => props.placeholder === 'Ajouter une tâche...', 'onChange', { target: { value: 'Commander les mâts' } });
  assert.doesNotMatch(view.text(), /Le titre de la tâche est obligatoire\./);
  await view.fire((props, text, tag) => tag === 'form' && props.className.includes('mt-3'), 'onSubmit');
  await view.waitFor(() => alertText() === 'Tâche "Commander les mâts" ajoutée à "Rénovation de l’éclairage public".');

  const [call] = bffProject.calls('/projects/{projectId}/tasks', 'post');
  assert.equal(call.pathParams.projectId, 'project-1');
  assert.equal(call.body.title, 'Commander les mâts');
  assert.equal(bffProject.calls('/projects/{projectId}', 'get').length, 1, 'the project details are refreshed');
  assert.equal(pageCalls().length, 2, 'the page is reloaded silently');
  assert.doesNotMatch(view.html, /placeholder="Ajouter une tâche\.\.\."/, 'the composer closes');
});

test('the detail modal drives the tasks: status change, deletion with confirmation, collaboration and comments', async () => {
  await renderLoadedPage();
  await openDetails();
  const task = 'Relevé des candélabres';

  bffProject.on('patch', '/projects/{projectId}/tasks/{taskId}/status', { body: fixtures.projectTask({ status: 'done' }) });
  await view.fire((props) => props['aria-label'] === `Statut de ${task}`, 'onChange', { target: { value: 'done' } });
  await view.waitFor(() => alertText() === `Statut de la tâche "${task}" mis à jour : Terminé.`);
  assert.deepEqual(bffProject.calls('/projects/{projectId}/tasks/{taskId}/status', 'patch')[0].body, { status: 'done' });

  // The mocked BFF keeps the comments posted during the test, as the real one would.
  const comments = [fixtures.taskComment()];
  bffProject.on('get', '/projects/{projectId}/tasks/{taskId}/collaboration', () => ({ body: { ...fixtures.taskCollaboration(), comments } }));
  await view.click((props, text, tag) => tag === 'button' && text.includes('Suivi'));
  await view.waitFor((html) => html.includes('Devis reçu.'));
  assert.match(view.text(), /Statut modifié/);
  assert.deepEqual(bffProject.calls('/projects/{projectId}/tasks/{taskId}/collaboration', 'get')[0].pathParams, { projectId: 'project-1', taskId: 'task-1' });

  bffProject.on('post', '/projects/{projectId}/tasks/{taskId}/comments', ({ body }) => {
    comments.push(fixtures.taskComment({ id: 'comment-2', message: body.message }));
    return { status: 201, body: comments.at(-1) };
  });
  await view.fire((props) => props.placeholder === 'Ajouter un commentaire...', 'onChange', { target: { value: 'Mâts livrés.' } });
  assert.match(view.html, /placeholder="Ajouter un commentaire\.\.\."[^>]*value="Mâts livrés\."/);
  await view.fire((props, text, tag) => tag === 'form' && text.includes('Envoyer'), 'onSubmit');
  await view.waitFor(() => bffProject.calls('/projects/{projectId}/tasks/{taskId}/comments', 'post').length === 1 && view.text().includes('Mâts livrés.'));
  assert.equal(bffProject.calls('/projects/{projectId}/tasks/{taskId}/comments', 'post')[0].body.message, 'Mâts livrés.');
  assert.match(view.html, /placeholder="Ajouter un commentaire\.\.\."[^>]*value=""/, 'the comment field is cleared once sent');

  bffProject.on('delete', '/projects/{projectId}/tasks/{taskId}', { status: 204 });
  await view.click((props) => props['aria-label'] === `Supprimer ${task}`);
  assert.match(view.text(), /Supprimer définitivement cette tâche \?/);
  await view.click((props, text, tag) => tag === 'button' && text === 'Supprimer' && props.className.includes('bg-[#cf222e]'));
  await view.waitFor(() => alertText() === `Tâche "${task}" supprimée.`);
  assert.deepEqual(bffProject.calls('/projects/{projectId}/tasks/{taskId}', 'delete')[0].pathParams, { projectId: 'project-1', taskId: 'task-1' });
});

test('the detail modal edits the project inline, adds a task from its form and closes the project', async () => {
  await renderLoadedPage();
  await openDetails();

  await view.click((props, text, tag) => tag === 'button' && text === 'Modifier');
  assert.match(view.text(), /Les tâches restent visibles pendant l’édition\./);
  bffProject.on('patch', '/projects/{projectId}', ({ body }) => ({ body: fixtures.projectDetails(fixtures.projectListItem({ title: body.title })) }));
  await view.fire((props) => props.id === 'detail-project-title', 'onChange', { target: { value: 'Éclairage LED' } });
  await view.fire((props, text, tag) => tag === 'form' && text.includes('Modifier le projet'), 'onSubmit');
  await view.waitFor(() => alertText() === 'Projet "Éclairage LED" modifié.');
  assert.equal(bffProject.calls('/projects/{projectId}', 'patch')[0].body.title, 'Éclairage LED');

  bffProject.on('post', '/projects/{projectId}/tasks', { status: 201, body: fixtures.projectTask({ id: 'task-3', title: 'Poser les lanternes' }) });
  await view.fire((props, text, tag) => tag === 'input' && props.placeholder === 'Ajouter une tâche...', 'onChange', { target: { value: 'Poser les lanternes' } });
  await view.fire((props, text, tag) => tag === 'form' && props.className === 'space-y-3', 'onSubmit');
  await view.waitFor(() => alertText() === 'Tâche "Poser les lanternes" ajoutée à "Éclairage LED".');
  assert.equal(bffProject.calls('/projects/{projectId}/tasks', 'post')[0].body.title, 'Poser les lanternes');

  bffProject.on('patch', '/projects/{projectId}/close', ({ body }) => ({ body: fixtures.projectDetails(fixtures.projectListItem({ status: body.status })) }));
  await view.click((props, text, tag) => tag === 'button' && text === 'Suspendre');
  await view.waitFor(() => alertText() === 'Projet "Rénovation de l’éclairage public" suspendu.');
  assert.deepEqual(bffProject.calls('/projects/{projectId}/close', 'patch')[0].body, { status: 'review' });
  await view.click((props, text, tag) => tag === 'button' && text === 'Clôturer');
  await view.waitFor(() => alertText() === 'Projet "Rénovation de l’éclairage public" clôturé.');
  assert.deepEqual(bffProject.calls('/projects/{projectId}/close', 'patch')[1].body, { status: 'done' });

  await view.click((props) => props['aria-label'] === 'Fermer la fiche projet');
  assert.equal(view.find('ProjectDetailModal').length, 0);
});
