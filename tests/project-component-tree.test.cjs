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
    [`${workspace}/ProjectsWorkspace.tsx`]: ['WorkspaceHeader', 'ProjectFiltersBar', 'WorkspaceLoading', 'LogoutErrorNotice', 'VerificationNotice', 'PageReadError', 'ProjectPagination', 'KanbanBoard', 'GridView', 'TableView', 'CreateProjectModal', 'ProjectDetailModal', 'ProjectTemplateManager', 'TaskCreationNotice'],
    [`${workspace}/components/CreateProjectModal/CreateProjectModal.tsx`]: ['CreateProjectFeedback', 'CreateProjectFooter', 'ProjectMainFields', 'ProjectSideFields', 'ProjectTemplatePicker'],
    [`${workspace}/components/ProjectDetailModal/ProjectDetailModal.tsx`]: ['DetailHeader', 'DetailRefreshAlert', 'DetailTaskList', 'ProjectEditForm', 'ProjectLifecycle', 'ProjectSummary', 'ProjectWorkflow', 'TaskFormPanel'],
    [`${workspace}/components/ProjectDetailModal/components/DetailTaskList/DetailTaskList.tsx`]: ['TaskFilters', 'TaskRow', 'TaskDeleteConfirm', 'TaskFollowUp'],
    [`${workspace}/components/ProjectCard/ProjectCard.tsx`]: ['ProjectActionsMenu', 'TaskComposer', 'ProjectLabels', 'AvatarStack', 'RecentTasks'],
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
  const detail = `${workspace}/components/ProjectDetailModal`;
  for (const hook of ['use-project-edit', 'use-detail-task-form', 'use-task-collaboration', 'use-task-filters', 'use-linked-task-scroll', 'use-dialog-focus']) {
    assert.ok(fs.existsSync(path.join(root, detail, `${hook}.ts`)), `${hook}.ts exists`);
    assert.ok(read(`${detail}/ProjectDetailModal.tsx`).includes(`'./${hook}'`), `ProjectDetailModal uses ${hook}`);
  }
  assert.ok(read(`${workspace}/components/ProjectCard/components/TaskComposer/TaskComposer.tsx`).includes("'./use-task-composer'"));
  assert.ok(read(`${workspace}/components/ProjectTasksEditor/ProjectTasksEditor.tsx`).includes("'./use-task-drafts'"));
  for (const file of ['ProjectsWorkspace.tsx', 'components/ProjectDetailModal/ProjectDetailModal.tsx', 'components/CreateProjectModal/CreateProjectModal.tsx', 'components/ProjectCard/components/TaskComposer/TaskComposer.tsx', 'components/ProjectTasksEditor/ProjectTasksEditor.tsx']) {
    assert.ok(read(`${workspace}/${file}`).split('\n').length <= 400, `${file} stays under 400 lines`);
  }
});

test('MAIR-608 the page feedback is the lib Alert, never a standalone lib Toast', () => {
  const page = read(`${workspace}/ProjectsWorkspace.tsx`);
  assert.match(page, /import \{ Alert, Skeleton \} from '@mairie360\/lib-components\/primitives'/);
  assert.doesNotMatch(page, /<Toast\b/);
});
