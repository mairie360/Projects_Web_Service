const assert = require('node:assert/strict');
const { test, before, after, beforeEach, afterEach } = require('node:test');
const { requireTs } = require('./support/typescript.cjs');
const { installReactRuntime, mount } = require('./support/server-view.cjs');

// MAIR-868 (Figma F7): the « Planning » tab draws the tasks from their start date (MAIR-1087) to their due date and the
// milestones (MAIR-1086) on the lib Gantt; a bar opens the task page.

installReactRuntime();
const React = require('react');
const { createFrontHarness } = require('./support/front-harness.cjs');
const f = require('./support/bff-fixtures.cjs');
const Page = requireTs('src/app/projects-client.tsx').default;
const { planningPeriod, planningRows } = requireTs('src/components/ProjectsWorkspace/components/ProjectPage/components/ProjectPlanningTab/planning-model.ts');

const harness = createFrontHarness();
const { bffProject } = harness;
let view;

before(() => harness.start());
after(() => harness.stop());
beforeEach(() => { harness.reset(); harness.location.search = ''; harness.signIn(f.jwt(f.agents.marie.id)); });
afterEach(() => { view?.unmount(); view = undefined; assert.deepEqual(harness.violations(), []); });

test('MAIR-868: the planning lays out the dated tasks and the milestones, and a bar opens its task page', async () => {
  const project = f.projectListItem();
  const tasks = [
    f.projectTask({ id: 'task-1', title: 'Relevé des candélabres', startDate: '2026-09-10T00:00:00.000Z', dueDate: '2026-10-01T00:00:00.000Z' }),
    f.projectTask({ id: 'task-2', title: 'Pose des lanternes', status: 'done', dueDate: '2026-12-01T00:00:00.000Z' }),
  ];
  bffProject.on('get', '/projects-page', { body: f.projectsPage([project]) });
  bffProject.on('get', '/projects/{projectId}', { body: f.projectDetails({ ...project, milestones: [f.milestone({ title: 'Validation du devis', dueDate: '2026-11-15' })] }, tasks) });
  view = mount(React.createElement(Page));
  await view.waitFor((html) => !html.includes('Chargement des projets'));
  await view.act(() => view.props('KanbanBoard').onProjectOpen(project));
  await view.waitFor(() => view.find('ProjectPlanningTab').length === 1);
  await view.settle();

  const rows = view.props('Gantt').rows;
  assert.deepEqual(rows.map((row) => [row.id, row.start, row.end]), [['task-1', '2026-09-10', '2026-10-01'], ['task-2', '2026-12-01', '2026-12-01']]);
  assert.deepEqual(view.props('Gantt').milestones, [{ id: 'milestone-1', label: 'Validation du devis', date: '2026-11-15', reached: false }]);
  assert.equal(view.props('Gantt').from, '2026-09-01');

  await view.click((props, _text, tag) => tag === 'button' && typeof props['aria-label'] === 'string' && props['aria-label'].startsWith('Relevé des candélabres,'));
  await view.waitFor(() => view.find('TaskPage').length === 1);
  assert.equal(view.props('TaskPage').task.id, 'task-1');
});

test('MAIR-868: nothing dated, nothing to plan', () => {
  assert.equal(planningPeriod(planningRows([f.projectTask({ dueDate: '' })], '2026-11-10'), [], '2026-11-10'), null);
});
