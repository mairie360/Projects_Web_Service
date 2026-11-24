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

test('mair_1197 messaging links with bare numbers open the same project and task as the public ids', () => {
  const expected = { projectId: 'project-38', taskId: 'task-79' };
  for (const search of ['?project=38&task=79', '?project=project-38&task=task-79', '?project=38&task=task-79', '?project=project-38&task=79']) {
    assert.deepEqual(parseProjectDeepLink(search), expected, search);
  }
  assert.deepEqual(parseProjectDeepLink('?project=+38+'), { projectId: 'project-38', taskId: null });
  assert.deepEqual(parseProjectDeepLink('?project=038'), { projectId: 'project-38', taskId: null });
});

test('mair_1197 a bare number that is not a positive id is rejected', () => {
  for (const search of ['?project=0', '?project=00', '?project=38&task=0', '?project=99999999999999999999']) {
    assert.deepEqual(parseProjectDeepLink(search), { error: 'Lien de projet invalide.' }, search);
  }
});
