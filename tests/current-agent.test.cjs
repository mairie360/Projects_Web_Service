const assert = require('node:assert/strict');
const { test } = require('node:test');
const { requireTs } = require('./support/typescript.cjs');
const fixtures = require('./support/bff-fixtures.cjs');
const { createDetailTaskFormState } = requireTs('src/lib/current-agent.ts');
const { createTaskFormState } = requireTs('src/lib/projectPageState.ts');
test('detail-task defaults use a verified selectable agent, preserving the separate Kanban defaults', () => {
  const project = fixtures.projectListItem(); const members = [{ value:'agent-1',label:'Agent' },{ value:'3',label:'Responsable' }];
  assert.deepEqual(createDetailTaskFormState(project,'agent-1',members).assignees,['agent-1']);
  for (const id of [null,undefined,'missing']) assert.deepEqual(createDetailTaskFormState(project,id,members).assignees,[]);
  assert.deepEqual(createTaskFormState(project).assignees,['3']);
});
