const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

// MAIR-608: the large project components are composed of sub-components, one folder per area.
test('MAIR-608 the project components are split into one folder per area', () => {
  const tree = {
    'src/components/project/ProjectDetailModal.tsx': ['DetailHeader', 'DetailRefreshAlert', 'TaskFormPanel', 'TaskFilters', 'TaskRow', 'TaskDeleteConfirm', 'TaskFollowUp', 'ProjectEditForm', 'ProjectSummary', 'ProjectLifecycle'].map(name => `project-detail/${name}`),
    'src/components/project/ProjectsWorkspace.tsx': ['workspace/WorkspaceHeader', 'workspace/ProjectFiltersBar', 'workspace/WorkspaceNotices'],
    'src/components/project/CreateProjectModal.tsx': ['create-project/CreateProjectFeedback', 'create-project/ProjectMainFields', 'create-project/ProjectSideFields', 'create-project/CreateProjectFooter'],
    'src/components/project/ProjectViews.tsx': ['views/ViewControls', 'views/GridView', 'views/TableView', 'views/ProjectsEmptyState'],
  };
  for (const [file, parts] of Object.entries(tree)) {
    const source = read(file);
    for (const part of parts) {
      assert.ok(source.includes(`'./${part}'`), `${file} composes ${part}`);
      assert.ok(fs.existsSync(path.join(root, 'src/components/project', `${part}.tsx`)), `${part}.tsx exists`);
    }
  }
});

test('MAIR-608 the page feedback is the lib Alert, never a standalone lib Toast', () => {
  const workspace = read('src/components/project/ProjectsWorkspace.tsx');
  assert.match(workspace, /import \{ Alert, Skeleton \} from '@mairie360\/lib-components\/primitives'/);
  assert.doesNotMatch(workspace, /<Toast\b/);
});
