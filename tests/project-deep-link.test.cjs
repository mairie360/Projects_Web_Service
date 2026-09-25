const assert = require('node:assert/strict');
const { test } = require('node:test');
const { requireTs } = require('./support/typescript.cjs');

const { parseProjectDeepLink } = requireTs('src/lib/projectDeepLink.ts');

test('project and task deep links decode the identifiers without losing other query values', () => {
  assert.deepEqual(parseProjectDeepLink('?source=dashboard&project=project%2F42&task=task+%26+2'), {
    projectId: 'project/42', taskId: 'task & 2',
  });
  assert.deepEqual(parseProjectDeepLink('?project=project-1'), { projectId: 'project-1', taskId: null });
  assert.equal(parseProjectDeepLink('?source=dashboard'), null);
});

test('ambiguous or incomplete deep links are rejected', () => {
  for (const search of ['?task=task-1', '?project=', '?project=p&task=', '?project=p&project=q', '?project=p&task=a&task=b']) {
    assert.deepEqual(parseProjectDeepLink(search), { error: 'Lien de projet invalide.' });
  }
});
