const assert = require('node:assert/strict');
const { test, before, after, beforeEach, afterEach } = require('node:test');
const { requireTs } = require('./support/typescript.cjs');
const { installReactRuntime, mount } = require('./support/server-view.cjs');

// MAIR-1178 (ATP F33): the « Tâches » tab filters its tasks by status (« Tous les statuts ») and by due date
// (« Toutes les échéances »), together with the search, assignee and priority; « Réinitialiser les filtres » clears
// them all. The filters are local to the loaded tasks: the page reads the same contract routes and sends nothing else.

installReactRuntime();
const React = require('react');
const { createFrontHarness } = require('./support/front-harness.cjs');
const f = require('./support/bff-fixtures.cjs');
const Page = requireTs('src/app/projects-client.tsx').default;
const { matchesTaskDue, TASK_DUE_OPTIONS, TASK_STATUS_OPTIONS } = requireTs('src/components/ProjectsWorkspace/components/ProjectPage/components/ProjectTasksTab/task-board-model.ts');

const harness = createFrontHarness();
const { bffProject } = harness;
const project = f.projectListItem({ tasks: { total: 3, completed: 1, active: 2, archived: 0 } });
const overdue = f.projectTask({ id: 'task-1', title: 'Relevé des candélabres', dueDate: '2026-01-05T00:00:00.000Z' });
const later = f.projectTask({ id: 'task-2', title: 'Plan des voiries', status: 'review', priority: 'high', dueDate: '2099-03-01T00:00:00.000Z' });
const done = f.projectTask({ id: 'task-3', title: 'Devis des luminaires', status: 'done', dueDate: '2026-02-01T00:00:00.000Z' });
let view;

before(() => harness.start());
after(() => harness.stop());
beforeEach(() => {
  harness.reset();
  harness.location.search = '';
  harness.signIn(f.jwt(f.agents.marie.id));
  bffProject.on('get', '/projects-page', { body: f.projectsPage([project]) });
  bffProject.on('get', '/projects/{projectId}', { body: f.projectDetails(project, [overdue, later, done]) });
});
afterEach(() => {
  view?.unmount();
  view = undefined;
  assert.deepEqual(harness.violations(), []);
});

async function openTasks() {
  view = mount(React.createElement(Page));
  await view.waitFor((html) => !html.includes('Chargement des projets'));
  await view.act(() => view.props('KanbanBoard').onProjectOpen(view.props('KanbanBoard').projects[0]));
  await view.waitFor(() => view.find('ProjectPage').length === 1);
  await view.click((props, text, tag) => tag === 'button' && props.role === 'tab' && text.startsWith('Tâches'));
  await view.waitFor(() => view.find('TaskToolbar').length === 1);
}
const toolbar = () => view.props('TaskToolbar');
const ids = (items) => items.map((item) => item.task.id).sort();
const shown = () => (view.find('TaskBoard').length ? ids(view.props('TaskBoard').items) : []);
const writes = () => bffProject.requests.filter((request) => request.method !== 'GET');

test('MAIR-1178 model: due-date ranges in the instance day and the status options of the board', () => {
  const now = new Date('2026-11-15T12:00:00Z');
  const task = (dueDate, status = 'todo') => ({ dueDate, status, completed: status === 'done' });
  assert.equal(matchesTaskDue(task('2026-11-10'), 'overdue', now), true);
  assert.equal(matchesTaskDue(task('2026-11-10'), 'this-month', now), false);
  assert.equal(matchesTaskDue(task('2026-11-20'), 'this-month', now), true);
  // A done task is never « En retard »: due earlier this month, it is in « Ce mois-ci ».
  assert.equal(matchesTaskDue(task('2026-11-10', 'done'), 'overdue', now), false);
  assert.equal(matchesTaskDue(task('2026-11-10', 'done'), 'this-month', now), true);
  assert.equal(matchesTaskDue(task('2026-12-01'), 'later', now), true);
  assert.equal(matchesTaskDue(task('2026-11-30'), 'later', now), false);
  assert.equal(matchesTaskDue(task(''), 'none', now), true);
  for (const range of ['overdue', 'this-month', 'later']) assert.equal(matchesTaskDue(task(''), range, now), false);
  assert.equal(matchesTaskDue(task('2026-11-20'), 'none', now), false);
  assert.equal(matchesTaskDue(task('2026-11-20'), '', now), true);
  assert.deepEqual(TASK_DUE_OPTIONS.map((option) => option.label), ['En retard', 'Ce mois-ci', 'Plus tard', 'Sans échéance']);
  assert.deepEqual(TASK_STATUS_OPTIONS, [
    { value: 'todo', label: 'À faire' }, { value: 'in-progress', label: 'En cours' }, { value: 'done', label: 'Terminé' },
  ]);
});

test('MAIR-1178: the status and due-date filters render in the toolbar and narrow the board, alone and combined', async () => {
  await openTasks();
  assert.match(view.text(), /Tous les statuts/);
  assert.match(view.text(), /Toutes les échéances/);
  assert.doesNotMatch(view.text(), /Réinitialiser les filtres/);
  assert.deepEqual(shown(), ['task-1', 'task-2', 'task-3']);

  await view.act(() => toolbar().onStatusChange('in-progress'));
  assert.deepEqual(shown(), ['task-2']);
  assert.equal(toolbar().active, true);
  assert.match(view.text(), /Réinitialiser les filtres/);
  await view.act(() => toolbar().onStatusChange(''));

  await view.act(() => toolbar().onDueChange('overdue'));
  assert.deepEqual(shown(), ['task-1']);
  await view.act(() => toolbar().onDueChange('later'));
  await view.act(() => toolbar().onPriorityChange('high'));
  await view.act(() => toolbar().onStatusChange('in-progress'));
  assert.deepEqual(shown(), ['task-2']);
  assert.equal(writes().length, 0);
});

test('MAIR-1178 journey: no task matches, the filtered empty state resets the search and every filter, in both views', async () => {
  await openTasks();
  await view.fire((props) => props['aria-label'] === 'Rechercher une tâche', 'onChange', { target: { value: 'voiries' } });
  await view.act(() => toolbar().onStatusChange('done'));
  await view.act(() => toolbar().onDueChange('none'));
  assert.equal(view.find('TaskFiltersEmptyState').length, 1);
  assert.match(view.text(), /Aucune tâche ne correspond aux filtres/);
  assert.equal(view.find('TaskBoard').length, 0);

  await view.act(() => toolbar().onViewChange('list'));
  assert.equal(view.find('TaskFiltersEmptyState').length, 1);
  assert.equal(view.find('TaskListView').length, 0);

  await view.act(() => view.props('TaskFiltersEmptyState').onReset());
  assert.equal(view.find('TaskFiltersEmptyState').length, 0);
  assert.deepEqual(
    { search: toolbar().search, status: toolbar().status, due: toolbar().due, priority: toolbar().priority, assignee: toolbar().assignee, active: toolbar().active },
    { search: '', status: '', due: '', priority: '', assignee: '', active: false },
  );
  assert.deepEqual(ids(view.props('TaskListView').items), ['task-1', 'task-2', 'task-3']);
  assert.doesNotMatch(view.text(), /Réinitialiser les filtres/);
  // The filters never write to the BFF.
  assert.equal(writes().length, 0);
});
