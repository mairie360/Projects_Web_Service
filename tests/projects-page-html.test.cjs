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
const { setBrowserFrontUrls } = requireTs('src/lib/front-urls.ts');

const harness = createFrontHarness();
const { bffProject } = harness;
let view;

before(() => harness.start());
after(() => harness.stop());
beforeEach(() => {
  harness.reset();
  harness.location.search = '';
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
  assert.equal(view.find('AppShell').length, 1);
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
  const footer = html.match(/<footer\b[^>]*>[\s\S]*?<\/footer>/)?.[0];
  assert.ok(footer);
  assert.match(html, /<aside\b[^]*?<footer\b[^]*?<\/footer>[^]*?<\/aside>/);
  assert.doesNotMatch(html, /<\/main>\s*<footer\b/);
  assert.match(footer.replace(/<[^>]*>/g, ''), new RegExp(`© ${new Date().getFullYear()} Mairie360`));
  assert.doesNotMatch(footer, /Version|<button\b|<a\b/);
});

test('an agent without the creation right sees no "Nouveau projet" button', async () => {
  const page = fixtures.projectsPage();
  page.access = { ...page.access, role: 'User', scope: 'assigned', canCreateProject: false };
  await renderLoadedPage(page);

  assert.doesNotMatch(view.text(), /Nouveau projet/);
  assert.match(view.html, /<span[^>]*>Mes projets assignés<\/span>/);
  assert.equal(view.props('KanbanBoard').onAddProject, undefined);
});

test('desktop and mobile navigation expose only active modules and keep Settings functional', async () => {
  const assigned = [];
  const originalAssign = global.window.location.assign;
  global.window.location.assign = (href) => assigned.push(href);
  setBrowserFrontUrls({
    DASHBOARD_FRONT_URL: 'https://dashboard.test.example/',
    PROJECT_FRONT_URL: 'https://projects.test.example/',
    MESSAGE_FRONT_URL: 'https://messages.test.example/',
    ELEARNING_FRONT_URL: 'https://training.test.example/',
    CALENDAR_FRONT_URL: 'https://calendar.test.example/',
    ADMINISTRATION_FRONT_URL: 'https://admin.test.example/',
    SETTINGS_FRONT_URL: 'https://settings.test.example/',
  });
  try {
    await renderLoadedPage();
    assert.equal(view.props('AppShell').activeItem, 'projects');
    assert.equal(view.props('AppShell').hrefs.profile, 'https://settings.test.example/');
    assert.equal(view.props('Header').profileHref, 'https://settings.test.example/');
    const isAdmin = view.props('Sidebar').isAdmin;
    for (const mobileOpen of [false, true]) {
      await view.act(() => view.props('Header').setSidebarOpen(mobileOpen));
      const sidebars = view.find('Sidebar');
      assert.equal(sidebars.length, mobileOpen ? 2 : 1);
      for (const { props } of sidebars) {
        assert.deepEqual(props.items.map(item => item.id),
          ['dashboard', 'projects', 'messages', 'training', 'calendar', 'admin', 'settings']);
        assert.equal(props.items.find(item => item.id === 'admin').adminOnly, true);
        assert.equal(props.isAdmin, isAdmin);
        assert.equal(props.activeItem, 'projects');
      }
      const menus = view.html.match(/<nav\b[^>]*aria-label="Menu principal"[^>]*>[\s\S]*?<\/nav>/g) ?? [];
      assert.equal(menus.length, sidebars.length);
      for (const menu of menus) {
        assert.doesNotMatch(menu, /E-mails|Fichiers/);
        assert.match(menu, /Paramètres/);
        assert.equal(menu.includes('>Administration<'), isAdmin);
      }
    }
    const mobileSidebar = view.find('Sidebar')[1].props;
    await view.act(() => mobileSidebar.onItemSelect(mobileSidebar.items.find(item => item.id === 'settings')));
    assert.deepEqual(assigned, ['https://settings.test.example/']);
    await view.act(() => view.props('Header').onPageChange('profile'));
    assert.deepEqual(assigned, ['https://settings.test.example/', 'https://settings.test.example/']);
    assert.equal(view.find('Sidebar').length, 1);
  } finally {
    setBrowserFrontUrls({});
    global.window.location.assign = originalAssign;
  }
});

test('the Settings action opens the configured Settings frontend', async () => {
  setBrowserFrontUrls({ SETTINGS_FRONT_URL: 'https://settings.example/' });
  try {
    await renderLoadedPage();
    const settings = view.find('ActionButton').find((button) => button.props.label === 'Paramètres');
    assert.ok(settings);

    await view.act(() => settings.props.onClick());

    assert.deepEqual(harness.location.assigned, ['https://settings.example/']);
    assert.doesNotMatch(view.text(), /Paramètres en cours de développement/);
  } finally {
    setBrowserFrontUrls({});
  }
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
  // The canonical PATCH can update the card before the following GET settles.
  // A recorded read is not completion of the detached onDrop callback.
  await view.waitFor(() => pageCalls().length === 2 && view.props('KanbanBoard').projects[0].status === 'review' &&
    alertText() === `Statut du projet "${project.title}" mis à jour.`);

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

test('Table exposes a named detail button, stops row bubbling and uses only the existing detail GET', async () => {
  const project = fixtures.projectListItem();
  await renderLoadedPage(fixtures.projectsPage([project]));
  await view.act(() => view.props('ViewToggle').onChange('table'));
  await view.waitFor(() => !view.props('ProjectsWorkspace').pageLoading);
  const name = `Ouvrir la fiche du projet ${project.title}`;
  const openers = view.hostElements((props, text, tag) => tag === 'button' && props['aria-label'] === name);
  assert.equal(openers.length, 1);
  assert.equal(openers[0].props['aria-haspopup'], 'dialog');
  assert.match(openers[0].props.className, /focus-visible:outline/);
  bffProject.on('get', '/projects/{projectId}', { body: fixtures.projectDetails(project) });
  let stopped = 0;
  await view.act(() => openers[0].props.onClick({ stopPropagation() { stopped++; } }));
  await view.waitFor(() => view.find('ProjectDetailModal').length === 1);
  assert.equal(stopped, 1);
  assert.equal(view.props('ProjectDetailModal').project.id, project.id);
  assert.equal(bffProject.calls('/projects/{projectId}', 'get').length, 1);
  await view.act(() => view.props('ProjectDetailModal').onClose());
  assert.equal(view.find('ProjectDetailModal').length, 0);
  assert.equal(bffProject.requests.filter(request => request.method !== 'GET').length, 0);
});

test('Table preserves a received view refusal without sending a detail GET from its row', async () => {
  const project = fixtures.projectListItem();
  project.permissions = { ...project.permissions, canView: false };
  await renderLoadedPage(fixtures.projectsPage([project]));
  await view.act(() => view.props('ViewToggle').onChange('table'));
  await view.waitFor(() => !view.props('ProjectsWorkspace').pageLoading);
  const opener = view.hostElements((props, text, tag) => tag === 'button' && props['aria-label'] === `Ouvrir la fiche du projet ${project.title}`)[0];
  assert.equal(opener.props.disabled, true);
  const row = view.hostElements((props, text, tag) => tag === 'tr' && !!props.onClick)[0];
  await view.act(() => row.props.onClick());
  assert.equal(bffProject.calls('/projects/{projectId}', 'get').length, 0);
  assert.equal(view.find('ProjectDetailModal').length, 0);
  assert.equal(bffProject.requests.filter(request => request.method !== 'GET').length, 0);
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
  assert.match(view.html, /role="dialog" aria-modal="true" aria-labelledby="[^"]+"/);
  assert.match(view.html, /aria-label="Ouvrir la fiche du projet Rénovation de l’éclairage public"/);

  await view.act(() => modal.onClose());
  assert.equal(view.find('ProjectDetailModal').length, 0);
});

test('a project deep link loads the authorized detail even when absent from the first project page', async () => {
  harness.location.search = '?source=dashboard&project=project-99';
  bffProject.on('get', '/projects/{projectId}', ({ pathParams }) => ({
    body: fixtures.projectDetails(fixtures.projectListItem({ id: pathParams.projectId })),
  }));
  await renderLoadedPage();
  await view.waitFor(() => view.find('ProjectDetailModal').length === 1);

  assert.equal(bffProject.calls('/projects/{projectId}', 'get')[0].pathParams.projectId, 'project-99');
  assert.equal(view.props('ProjectDetailModal').project.id, 'project-99');
  assert.equal(view.props('ProjectDetailModal').highlightTaskId, null);
});

for (const [dueDate, expected, short] of [
  ['', 'Sans échéance', 'Sans échéance'],
  ['   ', 'Sans échéance', 'Sans échéance'],
  ['incorrect', 'Échéance invalide', 'Échéance invalide'],
  ['2026-02-29', 'Échéance invalide', 'Échéance invalide'],
  ['2024-02-29T00:00:00.000Z', '29/02/2024', '29/02'],
]) {
  test(`deadline presentation across real project views and task editors: ${JSON.stringify(dueDate)}`, async () => {
    const project = fixtures.projectListItem({ dueDate });
    const task = fixtures.projectTask({ dueDate });
    bffProject.on('get', '/projects/{projectId}', { body: fixtures.projectDetails(project, [task]) });
    await renderLoadedPage(fixtures.projectsPage([project]));
    assert.ok(view.text().includes(short));

    for (const [value, component] of [['grid', 'GridView'], ['table', 'TableView'], ['kanban', 'KanbanBoard']]) {
      const count = pageCalls().length;
      await view.act(() => view.props('ViewToggle').onChange(value));
      await view.waitFor(() => pageCalls().length === count + 1 && view.find(component).length === 1);
      assert.ok(view.text().includes(value === 'kanban' ? short : expected));
      assert.doesNotMatch(view.text(), /undefined|Invalid Date/);
    }

    await view.act(() => view.props('KanbanBoard').onProjectOpen(view.props('KanbanBoard').projects[0]));
    await view.waitFor(() => view.find('ProjectDetailModal').length === 1);
    assert.ok(view.text().includes(expected));
    assert.doesNotMatch(view.text(), /undefined|Invalid Date/);
    assert.equal(view.props('ProjectDetailModal').tasks[0].dueDate,
      dueDate.includes('T') ? dueDate.slice(0, 10) : dueDate);
    await view.act(() => view.props('ProjectDetailModal').onClose());

    await view.click((props) => props['aria-label'] === `Actions pour ${project.title}`);
    await view.click((props, text) => props.role === 'menuitem' && text === 'Modifier');
    await view.waitFor(() => view.find('CreateProjectModal').length === 1 && view.find('ProjectTasksEditor').length === 1);
    assert.ok(view.text().includes(expected));
    assert.doesNotMatch(view.text(), /undefined|Invalid Date/);
    assert.equal(bffProject.requests.filter((request) => request.method.toLowerCase() !== 'get').length, 0,
      'formatting and opening views must never write a replacement deadline');
  });
}

test('a task deep link makes the selected BFF task visible and identifiable', async () => {
  harness.location.search = '?project=project-1&task=task-2';
  bffProject.on('get', '/projects/{projectId}', { body: fixtures.projectDetails() });
  await renderLoadedPage();
  await view.waitFor(() => view.find('ProjectDetailModal').length === 1 && view.props('ProjectDetailModal').highlightTaskId === 'task-2');

  assert.match(view.html, /data-linked-task="task-2"/);
  assert.match(view.html, /aria-current="true"/);
  assert.equal(bffProject.calls('/projects/{projectId}', 'get').length, 1);
});

test('invalid, missing and unauthorized deep-link targets never create a fake detail', async () => {
  harness.location.search = '?task=task-2';
  await renderLoadedPage();
  assert.match(view.text(), /Lien de projet invalide/);
  assert.equal(view.find('ProjectDetailModal').length, 0);
  assert.equal(bffProject.calls('/projects/{projectId}', 'get').length, 0);
  view.unmount();

  harness.reset();
  harness.signIn(fixtures.jwt(fixtures.agents.marie.id));
  harness.location.search = '?project=private-project';
  bffProject.on('get', '/projects-page', { body: fixtures.projectsPage() });
  bffProject.on('get', '/projects/{projectId}', harness.errorReply(403, fixtures.apiError('FORBIDDEN', 'Projet inaccessible')));
  view = mount(React.createElement(ProjectsPage));
  await view.waitFor((html) => html.includes('Projet inaccessible'));
  assert.equal(view.find('ProjectDetailModal').length, 0);
  assert.equal(bffProject.calls('/projects/{projectId}', 'get')[0].pathParams.projectId, 'private-project');
});

test('a link to a missing task leaves the modal closed and explains the missing target', async () => {
  harness.location.search = '?project=project-1&task=missing-task';
  bffProject.on('get', '/projects/{projectId}', { body: fixtures.projectDetails() });
  await renderLoadedPage();
  await view.waitFor((html) => html.includes('La tâche demandée est introuvable'));

  assert.equal(view.find('ProjectDetailModal').length, 0);
  assert.doesNotMatch(view.html, /data-linked-task=/);
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

test('same-tick nested task drafts keep independent states in the actual project-create payload', async () => {
  await renderLoadedPage();
  await view.click('Nouveau projet');
  await view.act(() => view.props('CreateProjectModal').onChange({
    title: 'Projet avec tâches indépendantes', description: 'Recette des clés locales',
    responsible: fixtures.people.marie.id, dueDate: '2026-11-17',
  }));
  const originalNow = Date.now;
  try {
    Date.now = () => 1791290000000;
    for (const title of ['Première tâche', 'Deuxième tâche']) {
      await view.fire(props => props.placeholder === 'Ajouter une tâche...', 'onChange', { target: { value: title } });
      await view.click('Ajouter la tâche');
    }
  } finally {
    Date.now = originalNow;
  }
  const draftIds = view.props('CreateProjectModal').form.taskItems.map(task => task.id);
  assert.equal(new Set(draftIds).size, 2);
  await view.click(props => props['aria-label'] === 'Marquer Première tâche comme terminée');
  assert.deepEqual(view.props('CreateProjectModal').form.taskItems.map(task => task.completed), [true, false]);
  await view.act(() => view.find('TaskEditButton')[1].props.onClick());
  await view.fire(props => props.placeholder === 'Ajouter une tâche...', 'onChange', { target: { value: 'Deuxième tâche corrigée' } });
  await view.click('Enregistrer la tâche');
  const draft = view.props('CreateProjectModal').form;
  assert.deepEqual(draft.taskItems.map(task => task.id), draftIds);
  assert.deepEqual(draft.taskItems.map(task => task.title), ['Première tâche', 'Deuxième tâche corrigée']);
  assert.deepEqual([draft.totalTasks, draft.completedTasks, draft.progress], [2, 1, 50]);
  const created = fixtures.projectListItem({ id: 'project-9', title: draft.title });
  const officialTasks = [
    fixtures.projectTask({ id: 'official-1', title: 'Première tâche', status: 'done', completed: true }),
    fixtures.projectTask({ id: 'official-2', title: 'Deuxième tâche corrigée', status: 'todo', completed: false }),
  ];
  bffProject.on('post', '/projects', { status: 201, body: fixtures.projectDetails(created, officialTasks) });
  bffProject.on('get', '/projects-page', { body: fixtures.projectsPage([fixtures.projectListItem(), created]) });
  await view.act(() => view.props('CreateProjectModal').onSubmit({ preventDefault() {} }));
  await view.waitFor(() => view.find('CreateProjectModal').length === 0);
  const writes = bffProject.calls('/projects', 'post');
  assert.equal(writes.length, 1);
  assert.deepEqual(writes[0].body.taskItems.map(task => [task.title, task.status]), [
    ['Première tâche', 'done'], ['Deuxième tâche corrigée', 'todo'],
  ]);
  assert.equal(writes[0].body.taskItems.some(task => Object.hasOwn(task, 'id')), false,
    'presentation-only draft identities must not become claimed server task identities');
  assert.equal(bffProject.requests.filter(request => request.method.toLowerCase() !== 'get').length, 1);
});

test('module boundaries preserve a nested creation draft across view and page refreshes without writes', async () => {
  await renderLoadedPage();
  await view.click('Nouveau projet');
  await view.act(() => view.props('CreateProjectModal').onChange({
    title: 'Brouillon entre composants', description: 'À conserver',
    responsible: fixtures.people.marie.id, dueDate: '2026-11-17',
    taskItems: [fixtures.projectTask({ title: 'Tâche imbriquée à conserver' })],
    totalTasks: 1, completedTasks: 0, progress: 0,
  }));
  const draft = structuredClone(view.props('CreateProjectModal').form);
  for (const value of ['grid', 'table', 'kanban']) {
    const reads = pageCalls().length;
    await view.act(() => view.props('ViewToggle').onChange(value));
    await view.waitFor(() => pageCalls().length === reads + 1);
    assert.deepEqual(view.props('CreateProjectModal').form, draft);
    assert.equal(view.find('CreateProjectModal').length, 1);
    assert.match(view.text(), /Tâche imbriquée à conserver/);
  }
  await view.act(() => view.props('CreateProjectModal').onClose());
  assert.equal(view.find('CreateProjectModal').length, 0);
  assert.equal(bffProject.requests.filter(request => request.method.toLowerCase() !== 'get').length, 0);
});

test('module boundaries retain detail task search and comment drafts through underlying view refreshes', async () => {
  await renderLoadedPage();
  bffProject.on('get', '/projects/{projectId}', { body: fixtures.projectDetails() });
  bffProject.on('get', '/projects/{projectId}/tasks/{taskId}/collaboration', { body: fixtures.taskCollaboration() });
  await view.act(() => view.props('KanbanBoard').onProjectOpen(view.props('KanbanBoard').projects[0]));
  await view.waitFor(() => view.find('ProjectDetailModal').length === 1);
  await view.fire(props => props.placeholder === 'Rechercher une tâche', 'onChange', { target: { value: 'candélabres' } });
  await view.click((props, text, tag) => tag === 'button' && text === 'Suivi');
  await view.waitFor(html => html.includes('Devis reçu.'));
  await view.fire(props => props.placeholder === 'Ajouter un commentaire...', 'onChange', { target: { value: 'Commentaire non envoyé' } });
  for (const value of ['grid', 'table']) {
    const reads = pageCalls().length;
    await view.act(() => view.props('ViewToggle').onChange(value));
    await view.waitFor(() => pageCalls().length === reads + 1);
    assert.equal(view.find('ProjectDetailModal').length, 1);
    assert.match(view.html, /placeholder="Rechercher une tâche"[^>]*value="candélabres"/);
    const comment = view.hostElements(props => props.placeholder === 'Ajouter un commentaire...');
    assert.equal(comment.length, 1);
    assert.equal(comment[0].props.value, 'Commentaire non envoyé');
  }
  assert.equal(bffProject.calls('/projects/{projectId}', 'get').length, 1);
  assert.equal(bffProject.calls('/projects/{projectId}/tasks/{taskId}/collaboration', 'get').length, 1);
  assert.equal(bffProject.requests.filter(request => request.method.toLowerCase() !== 'get').length, 0);
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

const pagedFixture = (page) => fixtures.projectsPage([
  fixtures.projectListItem({ id: `project-${page}`, title: `Projet page ${page}` }),
], { pagination: { page, limit: 50, total: 85, hasNextPage: page === 1 } });

test('pagination uses confirmed DTO metadata in all views and preserves current-page view queries', async () => {
  bffProject.on('get', '/projects-page', ({ url }) => ({ body: pagedFixture(Number(url.searchParams.get('page'))) }));
  view = mount(React.createElement(ProjectsPage));
  await view.waitFor(() => view.find('ProjectPagination').length === 1);
  assert.match(view.text(), /Page 1 · 85 projets/);
  await view.act(() => view.props('ProjectPagination').onChange('previous'));
  assert.equal(pageCalls().length, 1);
  await view.click(props => props['aria-label'] === 'Page suivante');
  await view.waitFor(() => view.props('ProjectPagination').pagination.page === 2);
  assert.doesNotMatch(view.text(), /Projet page 1/);
  assert.match(view.text(), /Page 2 · 85 projets/);
  await view.act(() => view.props('ProjectPagination').onChange('next'));
  assert.equal(pageCalls().length, 2);
  for (const mode of ['grid', 'table', 'kanban']) {
    await view.act(() => view.props('ViewToggle').onChange(mode));
    await view.waitFor(() => pageCalls().at(-1).view === mode && !view.props('ProjectPagination').pending);
    assert.equal(pageCalls().at(-1).page, '2');
    assert.match(view.text(), /Projet page 2/);
    assert.equal(view.find(mode === 'grid' ? 'GridView' : mode === 'table' ? 'TableView' : 'KanbanBoard').length, 1);
  }
  await view.click(props => props['aria-label'] === 'Page précédente');
  await view.waitFor(() => view.props('ProjectPagination').pagination.page === 1);
  assert.equal(pageCalls().at(-1).limit, '50');
  assert.equal(bffProject.requests.filter(request => request.method.toLowerCase() !== 'get').length, 0);
});

test('each changed project filter resets to page one while retaining all other query values', async () => {
  bffProject.on('get', '/projects-page', ({ url }) => ({ body: pagedFixture(Number(url.searchParams.get('page'))) }));
  view = mount(React.createElement(ProjectsPage));
  await view.waitFor(() => view.find('ProjectPagination').length === 1);
  const controls = [
    () => view.props('SearchInput').onChange('Projet'),
    () => view.props('FilterSelect', 0).onChange('in-progress'),
    () => view.props('FilterSelect', 1).onChange('high'),
    () => view.fire(props => props['aria-label'] === 'Échéance avant', 'onChange', { target: { value: '2026-12-31' } }),
  ];
  for (const change of controls) {
    await view.click(props => props['aria-label'] === 'Page suivante');
    await view.waitFor(() => view.props('ProjectPagination').pagination.page === 2);
    const count = pageCalls().length;
    await view.act(change);
    assert.equal(view.props('ProjectPagination').pending, true);
    await view.waitFor(() => pageCalls().length === count + 1 && !view.props('ProjectPagination').pending);
    assert.equal(pageCalls().at(-1).page, '1');
  }
  assert.deepEqual(pageCalls().at(-1), { q: 'Projet', status: 'in-progress', priority: 'high', dueBefore: '2026-12-31', view: 'kanban', page: '1', limit: '50' });
  const count = pageCalls().length;
  await view.act(() => {
    view.props('SearchInput').onChange('Projet');
    view.props('FilterSelect', 0).onChange('in-progress');
    view.props('FilterSelect', 1).onChange('high');
    view.props('ViewToggle').onChange('kanban');
  });
  assert.equal(pageCalls().length, count);
  assert.equal(view.props('ProjectPagination').pending, false);
});

test('a refused page navigation preserves page one and GET retry targets the failed page without writes', async () => {
  await renderLoadedPage(pagedFixture(1));
  bffProject.on('get', '/projects-page', harness.errorReply(503, fixtures.apiError('UNAVAILABLE', 'Page suivante refusée')));
  await view.click(props => props['aria-label'] === 'Page suivante');
  await view.waitFor(html => html.includes('Page suivante refusée'));
  assert.equal(pageCalls().at(-1).page, '2');
  assert.match(view.text(), /Page 1 · 85 projets|Projet page 1/);
  assert.equal(view.props('ProjectPagination').stale, true);
  await view.act(() => view.props('ProjectPagination').onChange('next'));
  assert.equal(pageCalls().length, 2);
  bffProject.on('get', '/projects-page', { body: pagedFixture(2) });
  await view.click('Réessayer');
  await view.waitFor(() => view.props('ProjectPagination').pagination.page === 2);
  assert.deepEqual(pageCalls().map(query => query.page), ['1', '2', '2']);
  assert.equal(view.props('ProjectPagination').stale, false);
  assert.equal(bffProject.requests.filter(request => request.method.toLowerCase() !== 'get').length, 0);
});

test('pagination refuses contract-shaped inconsistent metadata and recovers without fabricated totals', async () => {
  await renderLoadedPage(pagedFixture(1));
  bffProject.on('get', '/projects-page', { body: pagedFixture(1) });
  await view.click(props => props['aria-label'] === 'Page suivante');
  await view.waitFor(html => html.includes('La pagination reçue est incohérente'));
  assert.equal(view.props('ProjectPagination').pagination.page, 1);
  bffProject.on('get', '/projects-page', { body: pagedFixture(2) });
  await view.click('Réessayer');
  await view.waitFor(() => view.props('ProjectPagination').pagination.page === 2);
  const { isProjectPaginationValid } = requireTs('src/lib/projectPagination.ts');
  for (const invalid of [null, {}, { page: 2, limit: 0, total: 85, hasNextPage: false }, { page: 2, limit: 50, total: -1, hasNextPage: false }, { page: 2, limit: 50, total: 85, hasNextPage: 'false' }, { page: 2, limit: 50, total: 85, hasNextPage: true }]) {
    assert.equal(isProjectPaginationValid(invalid, 2), false);
  }
  assert.equal(isProjectPaginationValid(pagedFixture(1).pagination, 0), false);
});

test('paging guards repeated events and ignores a late page after a newer filter read', async (t) => {
  await renderLoadedPage(pagedFixture(1));
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  t.after(() => release());
  const originalFetch = global.fetch;
  t.mock.method(global, 'fetch', async (target, init) => {
    const response = await originalFetch(target, init);
    if (String(target).includes('/projects-page') && String(target).includes('page=2')) await gate;
    return response;
  });
  bffProject.on('get', '/projects-page', ({ url }) => ({ body: pagedFixture(Number(url.searchParams.get('page'))) }));
  const navigate = view.props('ProjectPagination').onChange;
  let first, second;
  await view.act(() => { first = navigate('next'); second = navigate('next'); });
  await second;
  await view.waitFor(() => pageCalls().length === 2);
  assert.equal(view.props('ProjectPagination').pending, true);
  await view.act(() => view.props('SearchInput').onChange('Projet'));
  await view.waitFor(() => pageCalls().length === 3 && !view.props('ProjectPagination').pending);
  release();
  await first;
  await view.settle();
  assert.equal(view.props('ProjectPagination').pagination.page, 1);
  assert.match(view.text(), /Projet page 1/);
  assert.doesNotMatch(view.text(), /Projet page 2/);
  assert.deepEqual(pageCalls().map(query => query.page), ['1', '2', '1']);
});

test('a confirmed duplicate from page two retries page one after a refused refresh without repeating POST', async () => {
  await renderLoadedPage(pagedFixture(1));
  bffProject.on('get', '/projects-page', { body: pagedFixture(2) });
  await view.click(props => props['aria-label'] === 'Page suivante');
  await view.waitFor(() => view.props('ProjectPagination').pagination.page === 2);
  bffProject.on('post', '/projects/{projectId}/duplicate', { status: 201, body: fixtures.projectDetails(fixtures.projectListItem({ id: 'project-3', title: 'Copie confirmée depuis la page deux' })) });
  bffProject.on('get', '/projects-page', harness.errorReply(503, fixtures.apiError('UNAVAILABLE', 'Première page refusée après duplication')));
  await view.act(() => view.props('KanbanBoard').onProjectDuplicate(view.props('KanbanBoard').projects[0]));
  assert.equal(pageCalls().at(-1).page, '1');
  assert.equal(view.props('ProjectPagination').pagination.page, 2, 'only the last confirmed metadata is labelled');
  assert.match(view.text(), /Copie confirmée depuis la page deux/);
  assert.equal(view.props('ProjectPagination').stale, true);
  bffProject.on('get', '/projects-page', { body: pagedFixture(1) });
  await view.click('Réessayer');
  await view.waitFor(() => view.props('ProjectPagination').pagination.page === 1);
  assert.deepEqual(pageCalls().map(query => query.page), ['1', '2', '1', '1']);
  assert.equal(bffProject.calls('/projects/{projectId}/duplicate', 'post').length, 1);
});

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

  await view.click((props, text, tag) => tag === 'button' && props['aria-haspopup'] === 'listbox' && text === 'Tous les statuts');
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

test('filter controls show and restore the actual unfiltered BFF query', async () => {
  await renderLoadedPage();

  assert.equal(pageCalls()[0].status, 'all');
  assert.equal(pageCalls()[0].priority, 'all');
  assert.deepEqual(view.props('FilterSelect', 0).options.map((option) => option.value), ['all', 'todo', 'in-progress', 'review', 'done']);
  assert.deepEqual(view.props('FilterSelect', 1).options.map((option) => option.value), ['all', 'high', 'medium', 'low']);
  assert.match(view.text(), /Tous les statuts/);
  assert.match(view.text(), /Toutes les priorités/);

  await view.act(() => view.props('FilterSelect', 0).onChange('in-progress'));
  await view.waitFor(() => pageCalls().length === 2);
  assert.equal(pageCalls()[1].status, 'in-progress');
  assert.equal(view.props('FilterSelect', 0).value, 'in-progress');

  await view.act(() => view.props('FilterSelect', 0).onChange('all'));
  await view.waitFor(() => pageCalls().length === 3);
  assert.equal(pageCalls()[2].status, 'all');
  assert.match(view.text(), /Tous les statuts/);

  await view.act(() => view.props('FilterSelect', 1).onChange('high'));
  await view.waitFor(() => pageCalls().length === 4);
  assert.equal(pageCalls()[3].priority, 'high');

  await view.act(() => view.props('FilterSelect', 1).onChange('all'));
  await view.waitFor(() => pageCalls().length === 5);
  assert.equal(pageCalls()[4].priority, 'all');
  assert.match(view.text(), /Toutes les priorités/);
});

test('filter controls do not duplicate all when the BFF already supplies it', async () => {
  const page = fixtures.projectsPage();
  page.filters.statuses.unshift({ value: 'all', label: 'Tous' });
  page.filters.priorities.unshift({ value: 'all', label: 'Toutes' });
  await renderLoadedPage(page);

  assert.deepEqual(view.props('FilterSelect', 0).options.map((option) => option.value), ['all', 'todo', 'in-progress', 'review', 'done']);
  assert.deepEqual(view.props('FilterSelect', 1).options.map((option) => option.value), ['all', 'high', 'medium', 'low']);
  assert.match(view.text(), /Tous les statuts/);
  assert.match(view.text(), /Toutes les priorités/);
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

test('inline task pickers retain distinct names and count descriptions while submitting the chosen fields once', async () => {
  const project = fixtures.projectListItem();
  await renderLoadedPage(fixtures.projectsPage([project]));
  bffProject.on('get', '/projects/{projectId}', { body: fixtures.projectDetails(project) });
  bffProject.on('post', '/projects/{projectId}/tasks', { status: 201, body: fixtures.projectTask({ id: 'task-picker-created', title: 'Tâche avec sélections' }) });
  await view.click((props, text, tag) => tag === 'button' && text.includes('Ajouter une tâche'));
  await view.fire(props => props['aria-label'] === 'Titre de la tâche', 'onChange', { target: { value: 'Tâche avec sélections' } });
  await view.click(props => props['aria-label'] === 'Étiquettes' && props['aria-haspopup'] === 'listbox');
  await view.click((props, text) => props.role === 'option' && text === 'voirie');
  await view.click(props => props['aria-label'] === 'Assignés' && props['aria-haspopup'] === 'listbox');
  await view.click((props, text) => props.role === 'option' && text === 'Admin Mairie');
  const names = ['Assignés', 'Étiquettes'];
  const openers = names.map(name => view.hostElements(props => props['aria-label'] === name && props['aria-haspopup'] === 'listbox')[0]);
  assert.ok(openers.every(Boolean));
  const descriptions = openers.map(opener => opener.props['aria-describedby']);
  assert.ok(descriptions.every(Boolean));
  assert.notEqual(descriptions[0], descriptions[1]);
  for (const [index, id] of descriptions.entries()) {
    const summary = view.hostElements(props => props.id === id)[0];
    assert.ok(summary);
    assert.match(summary.props.className, /sr-only/);
    assert.equal(summary.props.children.join(''), `${index === 0 ? 2 : 1} sélectionné(s)`);
  }
  assert.equal(bffProject.requests.filter(request => request.method !== 'GET').length, 0, 'picker interactions are local');
  await view.fire((props, text, tag) => tag === 'form' && props['aria-label'] === 'Créer une tâche', 'onSubmit');
  await view.waitFor(() => alertText() === `Tâche "Tâche avec sélections" ajoutée à "${project.title}".`);
  const calls = bffProject.calls('/projects/{projectId}/tasks', 'post');
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].body, { title: 'Tâche avec sélections', status: project.status, priority: project.priority, responsibleId: '3', assigneeIds: ['3', '1'], labels: ['voirie'], dueDate: '2026-12-15' });
  assert.equal(calls[0].pathParams.projectId, project.id);
  assert.equal(bffProject.requests.filter(request => request.method !== 'GET').length, 1);
});

test('the task composer of a card refuses an empty title, then posts the task and refreshes the project', async () => {
  await renderLoadedPage();

  await view.click((props, text, tag) => tag === 'button' && text.includes('Ajouter une tâche'));
  await view.fire((props, text, tag) => tag === 'form' && props.className.includes('mt-3'), 'onSubmit');
  assert.match(view.text(), /Le titre de la tâche est obligatoire\./);
  assert.equal(bffProject.calls('/projects/{projectId}/tasks', 'post').length, 0);

  bffProject.on('post', '/projects/{projectId}/tasks', { status: 201, body: fixtures.projectTask({ id: 'task-3', title: 'Commander les mâts' }) });
  bffProject.on('get', '/projects/{projectId}', () => ({ body: fixtures.projectDetails(fixtures.projectListItem(), [
    fixtures.projectTask(),
    ...(bffProject.calls('/projects/{projectId}/tasks', 'post').length ? [fixtures.projectTask({ id: 'task-3', title: 'Commander les mâts' })] : []),
  ]) }));
  await view.fire((props) => props.placeholder === 'Ajouter une tâche...', 'onChange', { target: { value: 'Commander les mâts' } });
  assert.doesNotMatch(view.text(), /Le titre de la tâche est obligatoire\./);
  await view.fire((props, text, tag) => tag === 'form' && props.className.includes('mt-3'), 'onSubmit');
  await view.waitFor(() => alertText() === 'Tâche "Commander les mâts" ajoutée à "Rénovation de l’éclairage public".');

  const [call] = bffProject.calls('/projects/{projectId}/tasks', 'post');
  assert.equal(call.pathParams.projectId, 'project-1');
  assert.equal(call.body.title, 'Commander les mâts');
  assert.equal(bffProject.calls('/projects/{projectId}', 'get').length, 2, 'an unconsulted card establishes its baseline, then refreshes after confirmation');
  assert.equal(pageCalls().length, 2, 'the page is reloaded silently');
  assert.doesNotMatch(view.html, /placeholder="Ajouter une tâche\.\.\."/, 'the composer closes');
});

for (const mode of ['create', 'edit']) {
  test(`a refused detail task ${mode} preserves the draft through real page callbacks and existing routes`, async () => {
    await renderLoadedPage();
    await openDetails();
    if (mode === 'edit') {
      await view.click((props, text, tag) => tag === 'button' && text === 'Modifier' && props.className.includes('border-[#0969da]'));
    }
    const method = mode === 'edit' ? 'patch' : 'post';
    const route = mode === 'edit' ? '/projects/{projectId}/tasks/{taskId}' : '/projects/{projectId}/tasks';
    bffProject.on(method, route, harness.errorReply(503, fixtures.apiError('UNAVAILABLE', 'Sauvegarde temporairement refusée')));
    await view.fire((props) => props.placeholder === 'Ajouter une tâche...', 'onChange', { target: { value: 'Saisie à conserver' } });
    await view.fire((props) => props.id === 'detail-task-status', 'onChange', { target: { value: 'review' } });
    await view.fire((props) => props.id === 'detail-task-priority', 'onChange', { target: { value: 'low' } });
    await view.fire((props) => props.id === 'detail-task-due-date', 'onChange', { target: { value: '2026-11-17' } });
    await view.fire((props, text, tag) => tag === 'form' && props.className === 'space-y-3', 'onSubmit');
    assert.match(view.html, /placeholder="Ajouter une tâche\.\.\."[^>]*value="Saisie à conserver"/);
    const dialog = view.html.match(/<section[^>]*role="dialog"[^]*?<\/main>/)?.[0];
    assert.match(dialog, /role="alert"[^>]*>Sauvegarde temporairement refusée/);
    assert.match(view.text(), mode === 'edit' ? /Enregistrer la tâche/ : /Ajouter la tâche/);
    assert.equal(bffProject.calls(route, method).length, 1);
    assert.equal(bffProject.calls('/projects/{projectId}', 'get').length, 1, 'no refresh before confirmation');
    bffProject.on(method, route, ({ body }) => ({ status: mode === 'edit' ? 200 : 201, body: fixtures.projectTask({ ...body, id: mode === 'edit' ? 'task-1' : 'task-3' }) }));
    await view.fire((props, text, tag) => tag === 'form' && props.className === 'space-y-3', 'onSubmit');
    assert.equal(bffProject.calls(route, method).length, 2);
    assert.deepEqual(bffProject.calls(route, method)[1].body, bffProject.calls(route, method)[0].body);
    assert.match(view.html, /placeholder="Ajouter une tâche\.\.\."[^>]*value=""/);
    assert.doesNotMatch(view.text(), /Sauvegarde temporairement refusée/);
  });
}

test('a confirmed inline task creation is not offered for retry when the following detail refresh fails', async () => {
  await renderLoadedPage();
  bffProject.on('post', '/projects/{projectId}/tasks', { status: 201, body: fixtures.projectTask({ id: 'task-confirmed', title: 'Tâche enregistrée' }) });
  bffProject.on('get', '/projects/{projectId}', () => bffProject.calls('/projects/{projectId}/tasks', 'post').length
    ? harness.errorReply(503, fixtures.apiError('UNAVAILABLE', 'Actualisation refusée'))
    : { body: fixtures.projectDetails() });
  await view.click((props, text, tag) => tag === 'button' && text.includes('Ajouter une tâche'));
  await view.fire((props) => props.placeholder === 'Ajouter une tâche...', 'onChange', { target: { value: 'Tâche enregistrée' } });
  await view.fire((props, text, tag) => tag === 'form' && props.className.includes('mt-3'), 'onSubmit');
  await view.waitFor(() => alertText()?.includes('Actualisation impossible'));
  assert.match(view.text(), /Tâche "Tâche enregistrée" enregistrée\. Actualisation impossible : Actualisation refusée/);
  assert.doesNotMatch(view.html, /placeholder="Ajouter une tâche\.\.\."/);
  assert.equal(bffProject.calls('/projects/{projectId}/tasks', 'post').length, 1);
  assert.equal(bffProject.calls('/projects/{projectId}', 'get').length, 2, 'only the post-confirmation read fails, not the pre-dispatch baseline');
  await view.click((props, text, tag) => tag === 'button' && text.includes('Ajouter une tâche'));
  assert.match(view.html, /placeholder="Ajouter une tâche\.\.\."[^>]*value=""/);
  assert.equal(bffProject.calls('/projects/{projectId}/tasks', 'post').length, 1);
});

test('task headings stack above mobile actions without changing permission-gated controls or data', async () => {
  const title = 'ValiderLePlanDesNouveauxEspaces'.repeat(3);
  const editable = fixtures.projectTask({ title });
  const restricted = fixtures.projectTask({
    id: 'task-2', title: 'Tâche en lecture seule',
    permissions: { ...editable.permissions, canEdit: false, canDelete: false, canUpdateStatus: false },
  });
  const project = fixtures.projectListItem();
  await renderLoadedPage(fixtures.projectsPage([project]));
  bffProject.on('get', '/projects/{projectId}', { body: fixtures.projectDetails(project, [editable, restricted]) });
  await view.act(() => view.props('KanbanBoard').onProjectOpen(view.props('KanbanBoard').projects[0]));
  await view.waitFor(() => view.find('ProjectDetailModal').length === 1);

  const articles = view.html.match(/<article\b[^>]*>[\s\S]*?<\/article>/g);
  const taskHtml = articles.find(html => html.includes(`>${title}</h3>`));
  const restrictedHtml = articles.find(html => html.includes('>Tâche en lecture seule</h3>'));
  assert.ok(taskHtml && restrictedHtml);
  for (const html of [taskHtml, restrictedHtml]) {
    assert.match(html, /class="[^"]*flex-col[^"]*sm:flex-row[^"]*"/);
    assert.match(html, /<h3[^>]*class="[^"]*\[overflow-wrap:anywhere\][^"]*sm:flex-1[^"]*"/);
    assert.match(html, />Suivi<|Suivi<\/button>/);
  }
  assert.match(taskHtml, />Modifier<|Modifier<\/button>/);
  assert.match(taskHtml, new RegExp(`aria-label="Supprimer ${title}"`));
  assert.match(taskHtml, new RegExp(`aria-label="Statut de ${title}"`));
  assert.doesNotMatch(restrictedHtml, />Modifier<|Supprimer Tâche en lecture seule|aria-label="Statut de Tâche en lecture seule"/);
  assert.match(restrictedHtml, /aria-label="Marquer Tâche en lecture seule comme terminée"[^>]*disabled=""|disabled=""[^>]*aria-label="Marquer Tâche en lecture seule comme terminée"/);
  assert.equal(bffProject.requests.filter(request => request.method !== 'GET').length, 0,
    'rendering the responsive headings never writes business data');
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

test('task follow-up ignores a late response from a previously selected task', async (t) => {
  await renderLoadedPage();
  await openDetails();
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  t.after(() => release());
  const originalFetch = global.fetch;
  t.mock.method(global, 'fetch', async (target, init) => {
    const response = await originalFetch(target, init);
    if (typeof target === 'string' && target === '/projects/project-1/tasks/task-1/collaboration') await gate;
    return response;
  });
  bffProject.on('get', '/projects/{projectId}/tasks/{taskId}/collaboration', ({ pathParams }) => ({ body: {
    comments: [fixtures.taskComment({ message: `Suivi ${pathParams.taskId}` })], history: [],
  } }));
  const follow = () => view.hostElements((props, text, tag) => tag === 'button' && text.includes('Suivi'));
  await view.act(() => { void follow()[0].props.onClick(); });
  await view.waitFor(() => bffProject.calls('/projects/{projectId}/tasks/{taskId}/collaboration', 'get').length === 1);
  await view.act(() => { void follow()[1].props.onClick(); });
  await view.waitFor(html => html.includes('Suivi task-2'));
  release();
  await view.waitFor(() => !view.text().includes('Chargement du suivi'));
  await new Promise(resolve => setTimeout(resolve, 20));
  await view.settle();
  assert.match(view.text(), /Suivi task-2/);
  assert.doesNotMatch(view.text(), /Suivi task-1/);
});

test('task follow-up guards synchronous repeated comment submission and preserves a refused draft', async () => {
  await renderLoadedPage();
  await openDetails();
  bffProject.on('get', '/projects/{projectId}/tasks/{taskId}/collaboration', { body: fixtures.taskCollaboration() });
  await view.click((props, text, tag) => tag === 'button' && text.includes('Suivi'));
  await view.waitFor(html => html.includes('Devis reçu.'));
  await view.fire(props => props.placeholder === 'Ajouter un commentaire...', 'onChange', { target: { value: 'Brouillon à conserver' } });
  bffProject.on('post', '/projects/{projectId}/tasks/{taskId}/comments', harness.errorReply(503, fixtures.apiError('UNAVAILABLE', 'Commentaire refusé')));
  const submit = view.hostElements((props, text, tag) => tag === 'form' && text.includes('Envoyer'))[0].props.onSubmit;
  await view.act(() => {
    submit({ preventDefault() {} });
    submit({ preventDefault() {} });
  });
  await view.waitFor(html => html.includes('Commentaire refusé'));
  assert.equal(bffProject.calls('/projects/{projectId}/tasks/{taskId}/comments', 'post').length, 1);
  assert.match(view.html, /placeholder="Ajouter un commentaire\.\.\."[^>]*value="Brouillon à conserver"|value="Brouillon à conserver"[^>]*placeholder="Ajouter un commentaire/);
  assert.match(view.html, /role="alert"[^>]*>Commentaire refusé/);
  const confirmed = fixtures.taskComment({ id: 'comment-retry', message: 'Brouillon à conserver' });
  bffProject.on('post', '/projects/{projectId}/tasks/{taskId}/comments', { status: 201, body: confirmed });
  bffProject.on('get', '/projects/{projectId}/tasks/{taskId}/collaboration', { body: { comments: [confirmed], history: [] } });
  await view.fire((props, text, tag) => tag === 'form' && text.includes('Envoyer'), 'onSubmit');
  await view.waitFor(html => html.includes('Brouillon à conserver') && !html.includes('Envoi du commentaire'));
  assert.equal(bffProject.calls('/projects/{projectId}/tasks/{taskId}/comments', 'post').length, 2);
  assert.deepEqual(bffProject.calls('/projects/{projectId}/tasks/{taskId}/comments', 'post')[1].body, { message: 'Brouillon à conserver' });
  assert.doesNotMatch(view.html, /Commentaire refusé/);
});

test('task follow-up retains a confirmed comment when its reload fails and retries only the read', async () => {
  await renderLoadedPage();
  await openDetails();
  bffProject.on('get', '/projects/{projectId}/tasks/{taskId}/collaboration', { body: fixtures.taskCollaboration() });
  await view.click((props, text, tag) => tag === 'button' && text.includes('Suivi'));
  await view.waitFor(html => html.includes('Devis reçu.'));
  await view.fire(props => props.placeholder === 'Ajouter un commentaire...', 'onChange', { target: { value: 'Commentaire confirmé' } });
  const comment = fixtures.taskComment({ id: 'comment-confirmed', message: 'Commentaire confirmé' });
  bffProject.on('post', '/projects/{projectId}/tasks/{taskId}/comments', { status: 201, body: comment });
  bffProject.on('get', '/projects/{projectId}/tasks/{taskId}/collaboration', harness.errorReply(503, fixtures.apiError('UNAVAILABLE', 'Suivi indisponible')));
  await view.fire((props, text, tag) => tag === 'form' && text.includes('Envoyer'), 'onSubmit');
  await view.waitFor(html => html.includes('Suivi indisponible'));
  assert.match(view.text(), /Commentaire confirmé/);
  assert.match(view.text(), /Commentaire enregistré\. Actualisation impossible/);
  bffProject.on('get', '/projects/{projectId}/tasks/{taskId}/collaboration', { body: { comments: [fixtures.taskComment(), comment], history: [] } });
  await view.click((props, text, tag) => tag === 'button' && text === 'Actualiser le suivi');
  await view.waitFor(html => !html.includes('Suivi indisponible') && !html.includes('Chargement du suivi'));
  assert.equal(bffProject.calls('/projects/{projectId}/tasks/{taskId}/comments', 'post').length, 1);
  assert.equal(view.text().split('Commentaire confirmé').length - 1, 1);
});

test('task follow-up retries an initial read refusal without posting a comment', async () => {
  await renderLoadedPage();
  await openDetails();
  bffProject.on('get', '/projects/{projectId}/tasks/{taskId}/collaboration', harness.errorReply(503, fixtures.apiError('UNAVAILABLE', 'Lecture refusée')));
  await view.click((props, text, tag) => tag === 'button' && text.includes('Suivi'));
  await view.waitFor(html => html.includes('Lecture refusée'));
  assert.match(view.html, /role="alert"[^>]*>Lecture refusée/);
  assert.doesNotMatch(view.html, /placeholder="Ajouter un commentaire/);
  bffProject.on('get', '/projects/{projectId}/tasks/{taskId}/collaboration', { body: fixtures.taskCollaboration() });
  await view.click((props, text, tag) => tag === 'button' && text === 'Actualiser le suivi');
  await view.waitFor(html => html.includes('Devis reçu.') && !html.includes('Chargement du suivi'));
  assert.equal(bffProject.calls('/projects/{projectId}/tasks/{taskId}/comments', 'post').length, 0);
  assert.equal(bffProject.calls('/projects/{projectId}/tasks/{taskId}/collaboration', 'get').length, 2);
});

test('task follow-up ignores a late failure after the panel has been closed and reopened', async (t) => {
  await renderLoadedPage();
  await openDetails();
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  t.after(() => release());
  let reads = 0;
  const originalFetch = global.fetch;
  t.mock.method(global, 'fetch', async (target, init) => {
    const delayed = typeof target === 'string' && target.endsWith('/task-1/collaboration') && ++reads === 1;
    const response = await originalFetch(target, init);
    if (delayed) await gate;
    return response;
  });
  bffProject.on('get', '/projects/{projectId}/tasks/{taskId}/collaboration', harness.errorReply(503, fixtures.apiError('UNAVAILABLE', 'Ancienne erreur')));
  await view.click((props, text, tag) => tag === 'button' && text.includes('Suivi'));
  await view.waitFor(() => bffProject.calls('/projects/{projectId}/tasks/{taskId}/collaboration', 'get').length === 1);
  await view.click((props, text, tag) => tag === 'button' && text.includes('Suivi'));
  bffProject.on('get', '/projects/{projectId}/tasks/{taskId}/collaboration', { body: fixtures.taskCollaboration() });
  await view.click((props, text, tag) => tag === 'button' && text.includes('Suivi'));
  await view.waitFor(html => html.includes('Devis reçu.'));
  release();
  await new Promise(resolve => setTimeout(resolve, 20));
  await view.settle();
  assert.doesNotMatch(view.html, /Ancienne erreur|Chargement du suivi/);
  assert.match(view.text(), /Devis reçu\./);
});

test('task follow-up never applies a late comment confirmation to another task', async (t) => {
  await renderLoadedPage();
  await openDetails();
  bffProject.on('get', '/projects/{projectId}/tasks/{taskId}/collaboration', ({ pathParams }) => ({ body: {
    comments: [fixtures.taskComment({ message: `Suivi ${pathParams.taskId}` })], history: [],
  } }));
  await view.click((props, text, tag) => tag === 'button' && text.includes('Suivi'));
  await view.waitFor(html => html.includes('Suivi task-1'));
  await view.fire(props => props.placeholder === 'Ajouter un commentaire...', 'onChange', { target: { value: 'Envoi pour task-1' } });
  bffProject.on('post', '/projects/{projectId}/tasks/{taskId}/comments', { status: 201, body: fixtures.taskComment({ message: 'Envoi pour task-1' }) });
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  t.after(() => release());
  const originalFetch = global.fetch;
  t.mock.method(global, 'fetch', async (target, init) => {
    const response = await originalFetch(target, init);
    if (typeof target === 'string' && target.endsWith('/task-1/comments')) await gate;
    return response;
  });
  const submit = view.hostElements((props, text, tag) => tag === 'form' && text.includes('Envoyer'))[0].props.onSubmit;
  await view.act(() => submit({ preventDefault() {} }));
  await view.waitFor(() => bffProject.calls('/projects/{projectId}/tasks/{taskId}/comments', 'post').length === 1);
  assert.match(view.html, /role="status"[^>]*>Envoi du commentaire/);
  assert.equal(view.hostElements(props => props.placeholder === 'Ajouter un commentaire...')[0].props.disabled, true);
  await view.act(() => view.hostElements((props, text, tag) => tag === 'button' && text.includes('Suivi'))[1].props.onClick());
  await view.waitFor(html => html.includes('Suivi task-2'));
  await view.act(() => submit({ preventDefault() {} }));
  release();
  await view.waitFor(html => !html.includes('Envoi du commentaire'));
  assert.match(view.text(), /Suivi task-2/);
  assert.doesNotMatch(view.text(), /Envoi pour task-1|Suivi task-1/);
  assert.equal(bffProject.calls('/projects/{projectId}/tasks/{taskId}/comments', 'post').length, 1);
  assert.equal(bffProject.calls('/projects/{projectId}/tasks/{taskId}/collaboration', 'get').length, 2, 'no stale POST-triggered read');
});

test('task follow-up preserves its draft across a same-project status refresh', async () => {
  await renderLoadedPage();
  await openDetails();
  bffProject.on('get', '/projects/{projectId}/tasks/{taskId}/collaboration', { body: fixtures.taskCollaboration() });
  await view.click((props, text, tag) => tag === 'button' && text.includes('Suivi'));
  await view.waitFor(html => html.includes('Devis reçu.'));
  await view.fire(props => props.placeholder === 'Ajouter un commentaire...', 'onChange', { target: { value: 'Brouillon encore présent' } });
  bffProject.on('patch', '/projects/{projectId}/tasks/{taskId}/status', { body: fixtures.projectTask({ status: 'done' }) });
  await view.fire(props => props['aria-label'] === 'Statut de Relevé des candélabres', 'onChange', { target: { value: 'done' } });
  await view.waitFor(() => alertText().includes('mis à jour'));
  assert.match(view.html, /placeholder="Ajouter un commentaire\.\.\."[^>]*value="Brouillon encore présent"/);
  assert.match(view.text(), /Devis reçu\./);
  assert.equal(bffProject.calls('/projects/{projectId}/tasks/{taskId}/comments', 'post').length, 0);
});

test('task follow-up keeps a confirmed comment once while a successful read is still catching up', async () => {
  await renderLoadedPage();
  await openDetails();
  bffProject.on('get', '/projects/{projectId}/tasks/{taskId}/collaboration', { body: fixtures.taskCollaboration() });
  await view.click((props, text, tag) => tag === 'button' && text.includes('Suivi'));
  await view.waitFor(html => html.includes('Devis reçu.'));
  await view.fire(props => props.placeholder === 'Ajouter un commentaire...', 'onChange', { target: { value: 'Confirmé avant relecture' } });
  bffProject.on('post', '/projects/{projectId}/tasks/{taskId}/comments', { status: 201, body: fixtures.taskComment({ id: 'confirmed-lag', message: 'Confirmé avant relecture' }) });
  await view.fire((props, text, tag) => tag === 'form' && text.includes('Envoyer'), 'onSubmit');
  await view.waitFor(html => html.includes('Confirmé avant relecture') && !html.includes('Envoi du commentaire'));
  assert.equal(view.text().split('Confirmé avant relecture').length - 1, 1);
  assert.match(view.text(), /Devis reçu\./);
  assert.match(view.html, /placeholder="Ajouter un commentaire\.\.\."[^>]*value=""/);
});

test('task follow-up bounds long content and preserves the existing comment submission', async () => {
  await renderLoadedPage();
  await openDetails();
  const author = 'LongUnbrokenAuthor'.repeat(8);
  const message = `${'LongUnbrokenComment'.repeat(12)}\nSecond line.`;
  const label = 'LongUnbrokenHistory'.repeat(8);
  const collaboration = fixtures.taskCollaboration();
  collaboration.comments = [fixtures.taskComment({ message, author: { id: fixtures.people.alice.id, name: author } })];
  collaboration.history[0] = { ...collaboration.history[0], label, author: { id: fixtures.people.marie.id, name: author } };
  bffProject.on('get', '/projects/{projectId}/tasks/{taskId}/collaboration', { body: collaboration });
  await view.click((props, text, tag) => tag === 'button' && text.includes('Suivi'));
  await view.waitFor((html) => html.includes(message));
  assert.match(view.html, /grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2/);
  assert.match(view.html, /flex flex-col[^"<>]*\[overflow-wrap:anywhere\][^"<>]*sm:flex-wrap/);
  assert.match(view.html, /whitespace-pre-wrap[^"<>]*\[overflow-wrap:anywhere\]/);
  assert.match(view.html, /border-l-2[^"<>]*\[overflow-wrap:anywhere\]/);
  assert.match(view.html, /<form class="mt-2 flex min-w-0 flex-col gap-2 sm:flex-row"/);
  assert.match(view.html, /placeholder="Ajouter un commentaire\.\.\."[^>]*class="h-8 min-w-0 rounded-md[^"<>]*sm:flex-1"/);
  assert.ok(view.text().includes(author));
  assert.ok(view.text().includes(label));
  const sent = 'CommentWithoutSpaces'.repeat(20);
  bffProject.on('post', '/projects/{projectId}/tasks/{taskId}/comments', ({ body }) => {
    const comment = fixtures.taskComment({ id: 'comment-long', message: body.message });
    collaboration.comments.push(comment);
    return { status: 201, body: comment };
  });
  await view.fire((props) => props.placeholder === 'Ajouter un commentaire...', 'onChange', { target: { value: sent } });
  await view.fire((props, text, tag) => tag === 'form' && text.includes('Envoyer'), 'onSubmit');
  await view.waitFor(() => view.text().includes(sent));
  const posts = bffProject.calls('/projects/{projectId}/tasks/{taskId}/comments', 'post');
  assert.equal(posts.length, 1);
  assert.deepEqual(posts[0].body, { message: sent });
  assert.match(view.html, /placeholder="Ajouter un commentaire\.\.\."[^>]*value=""/);
  await view.waitFor(html => !html.includes('Chargement du suivi') && !html.includes('Envoi du commentaire'));
});

test('read-only task follow-up keeps comments and history without exposing a composer', async () => {
  await renderLoadedPage();
  const task = fixtures.projectTask();
  bffProject.on('get', '/projects/{projectId}', { body: fixtures.projectDetails(undefined, [{ ...task, permissions: { ...task.permissions, canComment: false } }]) });
  await view.act(() => view.props('KanbanBoard').onProjectOpen(view.props('KanbanBoard').projects[0]));
  await view.waitFor(() => view.find('ProjectDetailModal').length === 1);
  bffProject.on('get', '/projects/{projectId}/tasks/{taskId}/collaboration', { body: fixtures.taskCollaboration() });
  await view.click((props, text, tag) => tag === 'button' && text.includes('Suivi'));
  await view.waitFor((html) => html.includes('Devis reçu.'));
  assert.match(view.text(), /Statut modifié/);
  assert.doesNotMatch(view.html, /placeholder="Ajouter un commentaire/);
  assert.equal(bffProject.calls('/projects/{projectId}/tasks/{taskId}/comments', 'post').length, 0);
});

test('inline project edits preserve the visible draft on refused PATCH and retry the same body', async () => {
  await renderLoadedPage();
  await openDetails();
  await view.click((props, text, tag) => tag === 'button' && text === 'Modifier');
  await view.fire((props) => props.id === 'detail-project-title', 'onChange', { target: { value: 'Projet à conserver' } });
  await view.fire((props) => props.id === 'detail-project-description', 'onChange', { target: { value: 'Description conservée' } });
  bffProject.on('patch', '/projects/{projectId}', harness.errorReply(503, fixtures.apiError('UNAVAILABLE', 'Projet temporairement refusé')));
  const submit = () => view.fire((props, text, tag) => tag === 'form' && props['aria-label'] === 'Modifier le projet', 'onSubmit');
  await submit();
  assert.match(view.html, /id="detail-project-title"[^>]*value="Projet à conserver"/);
  assert.match(view.html, /role="alert"[^>]*>Projet temporairement refusé/);
  assert.match(view.text(), /Description conservée/);
  assert.equal(bffProject.calls('/projects-page', 'get').length, 1, 'no refresh for an unconfirmed PATCH');
  bffProject.on('patch', '/projects/{projectId}', ({ body }) => ({ body: fixtures.projectDetails(fixtures.projectListItem({ title: body.title, description: body.description })) }));
  await submit();
  assert.equal(bffProject.calls('/projects/{projectId}', 'patch').length, 2);
  assert.deepEqual(bffProject.calls('/projects/{projectId}', 'patch')[1].body, bffProject.calls('/projects/{projectId}', 'patch')[0].body);
  assert.doesNotMatch(view.html, /id="detail-project-title"|Projet temporairement refusé/);
  assert.match(view.text(), /Projet à conserver/);
});

test('a confirmed inline project edit closes even when the later page refresh fails, without another PATCH', async () => {
  await renderLoadedPage();
  await openDetails();
  await view.click((props, text, tag) => tag === 'button' && text === 'Modifier');
  await view.fire((props) => props.id === 'detail-project-title', 'onChange', { target: { value: 'Projet confirmé' } });
  bffProject.on('patch', '/projects/{projectId}', { body: fixtures.projectDetails(fixtures.projectListItem({ title: 'Projet confirmé' })) });
  bffProject.on('get', '/projects-page', harness.errorReply(503, fixtures.apiError('UNAVAILABLE', 'Liste indisponible')));
  await view.fire((props, text, tag) => tag === 'form' && props['aria-label'] === 'Modifier le projet', 'onSubmit');
  assert.match(alertText(), /Projet "Projet confirmé" enregistré\. Actualisation impossible : Liste indisponible/);
  assert.doesNotMatch(view.html, /id="detail-project-title"/);
  assert.match(view.text(), /Projet confirmé/);
  assert.equal(bffProject.calls('/projects/{projectId}', 'patch').length, 1);
  await view.click((props, text, tag) => tag === 'button' && text === 'Modifier');
  assert.match(view.html, /id="detail-project-title"[^>]*value="Projet confirmé"/);
  assert.equal(bffProject.calls('/projects/{projectId}', 'patch').length, 1);
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
