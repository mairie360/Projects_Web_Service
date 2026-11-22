const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const workspace = 'src/components/ProjectsWorkspace';

// MAIR-608: the page is a component tree. Each composite reaches its direct sub-components
// through their folder (`./components/<Name>`), never a sub-sub-component.
test('MAIR-608 the workspace, the dialogs and the card compose their direct sub-components through their folders', () => {
  const tree = {
    [`${workspace}/ProjectsWorkspace.tsx`]: ['WorkspaceHeader', 'ProjectFiltersBar', 'WorkspaceLoading', 'LogoutErrorNotice', 'VerificationNotice', 'PageReadError', 'ProjectPagination', 'KanbanBoard', 'GridView', 'TableView', 'CreateProjectModal', 'ProjectPage', 'ProjectTemplateManager', 'TaskCreationNotice', 'ProjectsEmptyState', 'FeedbackToast'],
    [`${workspace}/components/CreateProjectModal/CreateProjectModal.tsx`]: ['CreateProjectFeedback', 'CreateProjectFooter', 'ProjectMainFields', 'ProjectSideFields', 'ProjectTemplatePicker'],
    // MAIR-846: the project page — header, metrics, tabs (overview, tasks) and the edit modal.
    [`${workspace}/components/ProjectPage/ProjectPage.tsx`]: ['ProjectPageHeader', 'ProjectMetrics', 'ProjectOverview', 'DetailRefreshAlert', 'ProjectTasksTab', 'ProjectEditForm', 'ProjectWorkflow'],
    [`${workspace}/components/ProjectPage/components/ProjectPageHeader/ProjectPageHeader.tsx`]: ['ProjectStatusMenu', 'ProjectMoreMenu'],
    [`${workspace}/components/ProjectPage/components/ProjectOverview/ProjectOverview.tsx`]: ['NextTasksPanel', 'ProjectLifecycle', 'ProjectSummary'],
    // MAIR-859: the « Tâches » tab — toolbar, board (cards, quick add), list, task sheet (Drawer) and deletion confirmation.
    [`${workspace}/components/ProjectPage/components/ProjectTasksTab/ProjectTasksTab.tsx`]: ['TaskToolbar', 'TaskBoard', 'TaskListView', 'TaskSheet', 'TaskDeleteConfirm'],
    [`${workspace}/components/ProjectPage/components/ProjectTasksTab/components/TaskBoard/TaskBoard.tsx`]: ['TaskCard', 'QuickAddTask'],
    [`${workspace}/components/ProjectPage/components/ProjectTasksTab/components/TaskBoard/components/TaskCard/TaskCard.tsx`]: ['TaskCardMenu'],
    [`${workspace}/components/ProjectPage/components/ProjectTasksTab/components/TaskSheet/TaskSheet.tsx`]: ['TaskFollowUp'],
    [`${workspace}/components/ProjectCard/ProjectCard.tsx`]: ['ProjectActionsMenu'],
    [`${workspace}/components/ProjectTasksEditor/ProjectTasksEditor.tsx`]: ['TaskDraftForm', 'DraftTaskRow'],
  };
  for (const [file, parts] of Object.entries(tree)) {
    const source = read(file);
    for (const part of parts) {
      assert.ok(source.includes(`'./components/${part}'`), `${file} composes ${part}`);
      assert.ok(fs.existsSync(path.join(root, path.dirname(file), 'components', part, 'index.ts')), `${part} has its folder and index`);
    }
    assert.doesNotMatch(source, /from '\.\/components\/[^'/]+\/[^']+'/, `${file} imports nothing deeper than a sub-component folder`);
  }
});

test('MAIR-608 the large dialogs keep their state in hooks beside them', () => {
  const detail = `${workspace}/components/ProjectPage`;
  for (const hook of ['use-project-edit', 'use-detail-task-form', 'use-task-collaboration', 'use-task-filters', 'use-linked-task-scroll']) {
    assert.ok(fs.existsSync(path.join(root, detail, `${hook}.ts`)), `${hook}.ts exists`);
    assert.ok(read(`${detail}/ProjectPage.tsx`).includes(`'./${hook}'`), `ProjectPage uses ${hook}`);
  }
  assert.ok(read(`${workspace}/components/ProjectTasksEditor/ProjectTasksEditor.tsx`).includes("'./use-task-drafts'"));
  for (const file of ['ProjectsWorkspace.tsx', 'components/ProjectPage/ProjectPage.tsx', 'components/CreateProjectModal/CreateProjectModal.tsx', 'components/ProjectTasksEditor/ProjectTasksEditor.tsx']) {
    assert.ok(read(`${workspace}/${file}`).split('\n').length <= 400, `${file} stays under 400 lines`);
  }
});

test('MAIR-608 / MAIR-829 the page feedback is the lib Alert, confirmations go through the lib ToastProvider', () => {
  const page = read(`${workspace}/ProjectsWorkspace.tsx`);
  assert.match(page, /import \{ Alert, ConfirmModal, Skeleton, ToastProvider \} from '@mairie360\/lib-components\/primitives'/);
  // A standalone Toast is not announced: toasts only come from useToast under the provider's live regions.
  assert.doesNotMatch(page, /<Toast\b/);
  assert.match(page, /<ToastProvider regionLabel=/);
});

// MAIR-829: the card no longer adds tasks nor lists recent ones (they live in the project sheet).
test('MAIR-829 the project card has no task composer nor recent tasks', () => {
  for (const removed of ['TaskComposer', 'RecentTasks']) {
    assert.equal(fs.existsSync(path.join(root, workspace, 'components/ProjectCard/components', removed)), false, `${removed} is gone`);
  }
  assert.doesNotMatch(read(`${workspace}/components/ProjectCard/ProjectCard.tsx`), /TaskComposer|RecentTasks|onAddTask/);
});

// MAIR-828: the page uses the lib-components 2 primitives, never a local copy of one.
test('MAIR-828 no local copy of a lib-components primitive comes back', () => {
  const components = `${workspace}/components`;
  for (const copy of ['StatusPill', 'PriorityPill', 'PriorityLabel', 'ProgressMeter', 'PersonAvatar', 'FieldLabel', 'FormField',
    'TextAreaField', 'SelectField', 'MultiSelectField', 'ProjectCard/components/AvatarStack', 'ProjectCard/components/ProjectLabels',
    'ProjectCard/components/TaskComposer/components/CompactMultiSelect', 'ProjectFiltersBar/components', 'WorkspaceHeader/components']) {
    assert.equal(fs.existsSync(path.join(root, components, copy)), false, `${copy} is a lib-components primitive`);
  }
  assert.equal(fs.existsSync(path.join(root, workspace, 'field-style.ts')), false);
  const types = read('src/types/project.tsx');
  assert.doesNotMatch(types, /statusConfig|priorityConfig|labelColors/, 'no local colour table for statuses, priorities or labels');
  const lib = (file) => read(file).match(/from '@mairie360\/lib-components\/primitives'/) !== null;
  for (const file of [`${components}/TableView/TableView.tsx`, `${components}/ProjectPagination/ProjectPagination.tsx`,
    `${components}/WorkspaceHeader/WorkspaceHeader.tsx`, `${components}/ProjectFiltersBar/ProjectFiltersBar.tsx`,
    `${components}/ProjectCard/components/ProjectActionsMenu/ProjectActionsMenu.tsx`, `${components}/VerificationNotice/VerificationNotice.tsx`,
    `${components}/ProjectPage/components/ProjectTasksTab/components/TaskDeleteConfirm/TaskDeleteConfirm.tsx`,
    `${components}/ProjectPage/components/ProjectTasksTab/components/TaskSheet/TaskSheet.tsx`, `${components}/ProjectPage/components/ProjectTasksTab/components/TaskListView/TaskListView.tsx`]) {
    assert.ok(lib(file), `${file} composes lib-components primitives`);
  }
  assert.match(read(`${components}/TableView/TableView.tsx`), /<DataTable\b/);
  // MAIR-859: the task sheet is the lib Drawer, the task list the lib DataTable; the superseded parts are gone.
  assert.match(read(`${components}/ProjectPage/components/ProjectTasksTab/components/TaskSheet/TaskSheet.tsx`), /<Drawer\b/);
  assert.match(read(`${components}/ProjectPage/components/ProjectTasksTab/components/TaskListView/TaskListView.tsx`), /<DataTable\b/);
  for (const removed of ['TaskFormPanel', 'DetailTaskList', 'ProjectWorkflow/components/TaskStatusKanban']) {
    assert.equal(fs.existsSync(path.join(root, components, 'ProjectPage/components', removed)), false, `${removed} is superseded`);
  }
  assert.match(read(`${components}/ProjectPagination/ProjectPagination.tsx`), /<Pagination\b/);
  assert.match(read(`${workspace}/ProjectsWorkspace.tsx`), /<ConfirmModal\b/);
});
