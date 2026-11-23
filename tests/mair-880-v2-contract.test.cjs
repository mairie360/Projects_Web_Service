const assert = require('node:assert/strict');
const { test, before, after, beforeEach, afterEach } = require('node:test');
const { requireTs } = require('./support/typescript.cjs');
const { installReactRuntime, mount } = require('./support/server-view.cjs');

// MAIR-880 (epic MAIR-822): the Projects V2 contract on the real page — projects on hold (MAIR-1084), budgets
// (MAIR-1085), milestones (MAIR-1086), task start dates (MAIR-1087), project rights of a member manager (MAIR-1088)
// and the recent activity (MAIR-1089). The bulk deletion is pinned by mair-833-table-bulk-delete.test.cjs.

installReactRuntime();
const React = require('react');
const { createFrontHarness } = require('./support/front-harness.cjs');
const f = require('./support/bff-fixtures.cjs');
const Page = requireTs('src/app/projects-client.tsx').default;
const { budgetMetric, parseBudgetInput, budgetInputValue, formatBudget } = requireTs('src/lib/projectBudget.ts');
const { validateProjectForm } = requireTs('src/components/ProjectsWorkspace/project-form-validation.ts');
const { createProjectFormState, taskStatusOf, taskStatusOptions } = requireTs('src/lib/projectPageState.ts');

const harness = createFrontHarness();
const { bffProject } = harness;
let view;

before(() => harness.start());
after(() => harness.stop());
beforeEach(() => { harness.reset(); harness.location.search = ''; harness.signIn(f.jwt(f.agents.marie.id)); });
afterEach(() => { view?.unmount(); view = undefined; assert.deepEqual(harness.violations(), []); });

const button = (label) => (props, text, tag) => tag === 'button' && (text === label || props['aria-label'] === label);

async function openProject(project, { milestones = [], activity = [] } = {}) {
  bffProject.on('get', '/projects-page', { body: f.projectsPage([project]) });
  bffProject.on('get', '/projects/{projectId}', { body: f.projectDetails({ ...project, milestones }) });
  bffProject.on('get', '/projects/{projectId}/activity', { body: f.projectActivity(activity, { limit: 5 }) });
  view = mount(React.createElement(Page));
  await view.waitFor((html) => !html.includes('Chargement des projets'));
  await view.act(() => view.props('KanbanBoard').onProjectOpen(project));
  await view.waitFor(() => view.find('ProjectPage').length === 1 && bffProject.calls('/projects/{projectId}', 'get').length === 1);
  await view.settle();
}

test('MAIR-1085: amounts in euros, cents in the contract', () => {
  assert.equal(formatBudget(1250000), '12 500 €');
  assert.equal(parseBudgetInput('12 500,50 €'), 1250050);
  assert.equal(parseBudgetInput('12500.5'), 1250050);
  assert.equal(parseBudgetInput(''), null);
  for (const refused of ['-10', '1,234', 'dix']) assert.equal(parseBudgetInput(refused), undefined, refused);
  assert.equal(budgetInputValue(1250050), '12500,50');
  assert.equal(budgetInputValue(1250000), '12500');
  assert.equal(budgetInputValue(null), '');
  assert.deepEqual(budgetMetric({ budgetVoted: null, budgetCommitted: null }), { value: '—', detail: 'Budget non renseigné' });
  assert.equal(budgetMetric({ budgetVoted: 1000000, budgetCommitted: 250000 }).detail, 'Sur 10 000 € votés (25 %)');
  assert.equal(budgetMetric({ budgetVoted: 1000000, budgetCommitted: 1200000 }).over, true);
  assert.equal(budgetMetric({ budgetVoted: null, budgetCommitted: 1000 }).detail, 'Budget voté non renseigné');
  assert.equal(budgetMetric({ budgetVoted: 1000, budgetCommitted: null }).value, '—');
  const errors = validateProjectForm({ ...createProjectFormState(), title: 'A', dueDate: '2026-12-01', responsible: 'user-3', budgetVoted: '-1' }, { creating: false, groupCount: 0 });
  assert.equal(errors.budgetVoted, 'Saisissez un montant positif en euros, avec au plus deux décimales.');
});

test('MAIR-1084: a task never takes a project-only status', () => {
  assert.equal(taskStatusOf('on-hold'), 'in-progress');
  assert.equal(taskStatusOf('review'), 'in-progress');
  assert.equal(taskStatusOf('done'), 'done');
  assert.deepEqual(taskStatusOptions([{ value: 'todo' }, { value: 'review' }, { value: 'on-hold' }, { value: 'done' }]).map((option) => option.value), ['todo', 'done']);
});

test('MAIR-1084: a project on hold has its column, its filter and is resumed from its page', async () => {
  const project = f.projectListItem({ status: 'on-hold' });
  await openProject(project);
  assert.deepEqual(view.props('KanbanBoard').columns.map((column) => column.status), ['todo', 'in-progress', 'review', 'on-hold', 'done']);
  assert.ok(view.props('ProjectFiltersBar').statusOptions.some((option) => option.value === 'on-hold'));
  assert.match(view.text(), /Le projet est suspendu : reprenez-le ou clôturez-le\./);

  bffProject.on('patch', '/projects/{projectId}', ({ body }) => ({ body: f.projectDetails(f.projectListItem({ status: body.status })) }));
  await view.click(button('Reprendre'));
  await view.waitFor(() => bffProject.calls('/projects/{projectId}', 'patch').length === 1);
  assert.deepEqual(bffProject.calls('/projects/{projectId}', 'patch')[0].body, { status: 'in-progress' });
});

test('MAIR-1088: a member manager moves a project although the page grants no global management', async () => {
  const project = f.projectListItem({ myRole: 'manager' });
  const page = f.projectsPage([project]);
  page.access = { ...page.access, role: 'User', canManageProjects: false };
  bffProject.on('get', '/projects-page', { body: page });
  view = mount(React.createElement(Page));
  await view.waitFor((html) => !html.includes('Chargement des projets'));
  assert.equal(typeof view.props('KanbanBoard').onMoveProject, 'function');
  bffProject.on('patch', '/projects/{projectId}', ({ body }) => ({ body: f.projectDetails(f.projectListItem({ status: body.status, myRole: 'manager' })) }));
  await view.act(() => view.props('KanbanBoard').onMoveProject(project, 'on-hold'));
  assert.deepEqual(bffProject.calls('/projects/{projectId}', 'patch')[0].body, { status: 'on-hold' });
});

test('MAIR-1085 / MAIR-1088: the page shows the budget and the caller’s role, the edit sends the changed budget only', async () => {
  const project = f.projectListItem({ budgetVoted: 1000000, budgetCommitted: 250000, myRole: 'contributor' });
  await openProject(project);
  assert.match(view.text(), /Budget engagé 2\s500\s€/);
  assert.match(view.text(), /Sur 10\s000\s€ votés \(25 %\)/);
  assert.match(view.text(), /Votre rôle.*Contributeur/);

  await view.click(button('Modifier'));
  await view.fire((props) => props.id === 'detail-project-budget-committed', 'onChange', { target: { value: '4 000' } });
  bffProject.on('patch', '/projects/{projectId}', ({ body }) => ({ body: f.projectDetails(f.projectListItem({ budgetVoted: 1000000, budgetCommitted: body.budgetCommitted })) }));
  await view.fire((props, _text, tag) => tag === 'form' && props['aria-label'] === 'Modifier le projet', 'onSubmit', { preventDefault() {} });
  await view.waitFor(() => bffProject.calls('/projects/{projectId}', 'patch').length === 1);
  assert.deepEqual(bffProject.calls('/projects/{projectId}', 'patch')[0].body, { budgetCommitted: 400000 });
});

test('MAIR-1086: a manager adds a milestone, marks it reached and deletes it from the overview', async () => {
  const project = f.projectListItem();
  await openProject(project, { milestones: [f.milestone({ dueDate: '2099-01-15' })] });
  assert.match(view.text(), /Validation du devis/);
  assert.match(view.text(), /À venir/);

  bffProject.on('post', '/projects/{projectId}/milestones', ({ body }) => ({ status: 201, body: f.milestone({ id: 'milestone-2', ...body }) }));
  await view.click(button('Ajouter un jalon'));
  await view.fire((props) => props.id === 'milestone-new-title', 'onChange', { target: { value: 'Réception des travaux' } });
  await view.fire((props) => props.id === 'milestone-new-date', 'onChange', { target: { value: '2099-03-01' } });
  await view.fire((props, _text, tag) => tag === 'form' && props['aria-label'] === 'Ajouter le jalon', 'onSubmit', { preventDefault() {}, stopPropagation() {} });
  await view.waitFor(() => view.text().includes('Réception des travaux'));
  assert.deepEqual(bffProject.calls('/projects/{projectId}/milestones', 'post')[0].body, { title: 'Réception des travaux', dueDate: '2099-03-01' });

  bffProject.on('patch', '/projects/{projectId}/milestones/{milestoneId}', ({ body }) => ({ body: f.milestone({ dueDate: '2099-01-15', ...body }) }));
  await view.fire((props, _text, tag) => tag === 'input' && props.type === 'checkbox' && view.hostElements((p, text, t) => t === 'label' && p.htmlFor === props.id && text.includes('Validation du devis')).length === 1, 'onChange', { target: { checked: true } });
  await view.waitFor(() => view.text().includes('Atteint'));
  assert.deepEqual(bffProject.calls('/projects/{projectId}/milestones/{milestoneId}', 'patch')[0].body, { reached: true });

  bffProject.on('delete', '/projects/{projectId}/milestones/{milestoneId}', { status: 204 });
  await view.click(button('Supprimer le jalon Réception des travaux'));
  const confirm = view.find('ConfirmModal').find((item) => item.props.title === 'Supprimer le jalon ?');
  await view.act(() => confirm.props.onConfirm());
  await view.waitFor(() => !view.text().includes('Réception des travaux'));
  assert.equal(bffProject.calls('/projects/{projectId}/milestones/{milestoneId}', 'delete')[0].pathParams.milestoneId, 'milestone-2');
});

test('MAIR-1086: a refused milestone write is shown in the panel', async () => {
  await openProject(f.projectListItem(), { milestones: [f.milestone()] });
  bffProject.on('patch', '/projects/{projectId}/milestones/{milestoneId}', harness.errorReply(403, f.apiError('FORBIDDEN', 'Vous ne gérez pas ce projet.')));
  await view.fire((props, _text, tag) => tag === 'input' && props.type === 'checkbox' && view.hostElements((p, text, t) => t === 'label' && p.htmlFor === props.id && text.includes('Validation du devis')).length === 1, 'onChange', { target: { checked: true } });
  await view.waitFor(() => view.text().includes('Vous ne gérez pas ce projet.'));
  assert.match(view.text(), /Jalon non enregistré/);
});

test('MAIR-1089: the overview reads and shows the latest activity of the project', async () => {
  await openProject(f.projectListItem(), {
    activity: [f.activityItem(), f.activityItem({ kind: 'status_changed', id: 'history-1', taskId: 'task-1', taskTitle: 'Relevé des candélabres', message: null, label: 'Statut modifié', changes: { status: { from: 'todo', to: 'done' } } })],
  });
  await view.waitFor(() => view.text().includes('Alice Martin a commenté le projet'));
  const read = bffProject.calls('/projects/{projectId}/activity', 'get').at(-1);
  assert.equal(read.url.searchParams.get('limit'), '5');
  assert.match(view.text(), /Réunion de chantier fixée\./);
  assert.match(view.text(), /Alice Martin a changé l’état de « Relevé des candélabres »/);
});

test('MAIR-1087: a task created with a start date sends it, a start after the due date is refused before any write', async () => {
  await openProject(f.projectListItem());
  await view.click(button('Nouvelle tâche'));
  await view.fire((props) => props.id === 'task-sheet-title', 'onChange', { target: { value: 'Poser les lanternes' } });
  await view.fire((props) => props.id === 'task-sheet-start-date', 'onChange', { target: { value: '2026-12-20' } });
  await view.fire((props) => props.id === 'task-sheet-due-date', 'onChange', { target: { value: '2026-12-10' } });
  assert.match(view.text(), /Le début doit précéder l’échéance\./);
  await view.fire((props) => props.id === 'task-sheet-start-date', 'onChange', { target: { value: '2026-12-01' } });
  assert.doesNotMatch(view.text(), /Le début doit précéder l’échéance\./);
  assert.equal(bffProject.calls('/projects/{projectId}/tasks', 'post').length, 0);
});

test('MAIR-880: the lab page of the performance report is a page the front accepts (new fields, on-hold column)', () => {
  const lab = require('./fixtures/performance.json').routes['/projects-page'];
  const { parseProjectsPageReceipt } = requireTs('src/lib/project-page-receipt.ts');
  const parsed = parseProjectsPageReceipt(lab, 1);
  assert.equal(parsed.projects[0].title, require('./fixtures/performance.json').readyText);
  assert.ok(parsed.kanban.columns.some((column) => column.status === 'on-hold'));
  const contract = bffProject.contract;
  const operation = contract.match('GET', '/projects-page').operation;
  const schema = (operation.responses['2XX'] ?? operation.responses['200']).content['application/json'].schema;
  assert.deepEqual(contract.validate(schema, lab, '$lab'), []);
});
