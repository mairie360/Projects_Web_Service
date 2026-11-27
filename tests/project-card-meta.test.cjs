const assert = require('node:assert/strict');
const { test } = require('node:test');
const { requireTs } = require('./support/typescript.cjs');
const { statuses } = require('@mairie360/lib-components/primitives');
const { formatProjectDate, getProjectNumber, projectStatusBadge, projectStatusLabel } = requireTs('src/components/ProjectsWorkspace/project-card-meta.ts');

// MAIR-828: the statuses take the lib colours and French labels, no local colour table any more.
test('each published project status maps to its lib status and label', () => {
  assert.deepEqual(Object.keys(projectStatusBadge).sort(), ['done', 'in-progress', 'on-hold', 'review', 'todo']);
  for (const [status, badge, label] of [
    ['todo', 'todo', 'À faire'], ['in-progress', 'inprogress', 'En cours'],
    ['review', 'review', 'En revue'], ['on-hold', 'paused', 'Suspendu'], ['done', 'done', 'Terminé'],
  ]) {
    assert.equal(projectStatusBadge[status], badge);
    assert.ok(statuses[badge], badge);
    assert.equal(projectStatusLabel(status), label);
  }
});

test('civil due dates keep their day and optionally their year without host timezone conversion', () => {
  assert.equal(formatProjectDate('2026-10-16'), '16/10/2026');
  assert.equal(formatProjectDate('2026-10-16', false), '16/10');
  assert.equal(formatProjectDate('2024-02-29'), '29/02/2024');
  assert.equal(formatProjectDate('2000-02-29'), '29/02/2000');
  assert.equal(formatProjectDate('0001-01-01'), '01/01/0001');
  for (const empty of ['', '   ']) assert.equal(formatProjectDate(empty), 'Sans échéance');
});

test('invalid dates remain unavailable instead of normalizing an impossible due date', () => {
  for (const value of ['2026-02-29', '1900-02-29', '2026-04-31', '2026-00-01', '2026-13-01',
    '2026-01-00', '0000-01-01', '2026-2-01', '16/10/2026', '2026-10-16T00:00:00Z', 'not a date']) {
    assert.equal(formatProjectDate(value), 'Échéance invalide', value);
    assert.equal(formatProjectDate(value, false), 'Échéance invalide', value);
  }
});

test('card reference numbers retain numeric IDs and a bounded suffix for opaque IDs', () => {
  for (const [id, label] of [['42', 'PRJ-42'], ['007', 'PRJ-7'], ['0', 'PRJ-0'],
    ['project-123456', 'PRJ-3456'], ['project-0007', 'PRJ-0007'], ['opaque-project', 'PRJ-1'], ['Infinity', 'PRJ-1']]) {
    assert.equal(getProjectNumber({ id }), label, id);
  }
});
