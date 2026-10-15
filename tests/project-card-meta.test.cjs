const assert = require('node:assert/strict');
const { test } = require('node:test');
const { requireTs } = require('./support/typescript.cjs');
const { AlertCircle, CheckCircle2, Clock3, Eye } = require('lucide-react');
const { getInitials, formatProjectDate, getProjectNumber, statusMeta, priorityMeta, labelStyles } = requireTs('src/components/project-card/projectCardMeta.ts');

// These are the public card labels and icon choices used by the legacy project DTO.
test('each published project status has its distinct readable label and icon', () => {
  assert.deepEqual(Object.keys(statusMeta).sort(), ['done', 'in-progress', 'review', 'todo']);
  for (const [status, label, icon] of [
    ['todo', 'À faire', AlertCircle], ['in-progress', 'En cours', Clock3],
    ['review', 'En révision', Eye], ['done', 'Terminé', CheckCircle2],
  ]) {
    assert.equal(statusMeta[status].label, label);
    assert.equal(statusMeta[status].icon, icon);
    assert.ok(statusMeta[status].className.trim());
    assert.ok(statusMeta[status].iconClassName.trim());
  }
  assert.deepEqual(Object.values(priorityMeta).map(meta => meta.label), ['Haute', 'Moyenne', 'Basse']);
  assert.ok(Object.values(priorityMeta).every(meta => meta.text && meta.dot && meta.pill));
  assert.equal(new Set(labelStyles).size, labelStyles.length);
});

test('initials tolerate empty names and repeated spaces while preserving French characters', () => {
  for (const [name, initials] of [
    ['', ''], ['   ', ''], ['Alice', 'A'], [' Alice   Martin ', 'AM'],
    ['Élodie Çelik', 'ÉÇ'], ['Jean Pierre Dupont', 'JP'], ['Anne-Marie Le Gall', 'AL'],
  ]) assert.equal(getInitials(name), initials, JSON.stringify(name));
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
  for (const [id, label] of [['42', '#42'], ['007', '#7'], ['0', '#0'],
    ['project-123456', '#3456'], ['project-0007', '#0007'], ['opaque-project', '#1'], ['Infinity', '#1']]) {
    assert.equal(getProjectNumber({ id }), label, id);
  }
});
