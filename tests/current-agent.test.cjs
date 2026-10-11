const assert = require('node:assert/strict');
const { test, afterEach } = require('node:test');
const { requireTs } = require('./support/typescript.cjs');
const fixtures = require('./support/bff-fixtures.cjs');
const { createDetailTaskFormState, selectableCurrentAgent, loginCurrentAgentSource } = requireTs('src/lib/current-agent.ts');
const { createTaskFormState } = requireTs('src/lib/projectPageState.ts');
test('detail-task defaults use a verified selectable agent, preserving the separate Kanban defaults', () => {
  const project = fixtures.projectListItem(); const members = [{ value:'agent-1',label:'Agent' },{ value:'3',label:'Responsable' }];
  assert.deepEqual(createDetailTaskFormState(project,'agent-1',members).assignees,['agent-1']);
  for (const id of [null,undefined,'missing']) assert.deepEqual(createDetailTaskFormState(project,id,members).assignees,[]);
  assert.deepEqual(createTaskFormState(project).assignees,['3']);
});

const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });
test('the User ID maps only to one received Project member, never a raw ID or owner fallback', () => {
  const members = [{value:'user-1',label:'Agent'}, {value:'1',label:'Different namespace'}];
  assert.equal(selectableCurrentAgent({id:'1',namespace:'user'},members),'user-1');
  assert.equal(selectableCurrentAgent({id:'1'},members),'1');
  for (const id of ['0','01','-1','Infinity','9007199254740992','other','']) assert.equal(selectableCurrentAgent({id,namespace:'user'},members),null);
  assert.equal(selectableCurrentAgent({id:'1',namespace:'user'},[{value:'1',label:'Raw'}]),null);
  assert.equal(selectableCurrentAgent({id:'1',namespace:'user'},[...members,members[0]]),null);
  assert.equal(selectableCurrentAgent(null,members),null);
});
test('the optional browser lookup requests only its frontend adapter and never turns a refusal into an identity', async () => {
  const signal = new AbortController().signal; let received;
  global.fetch = async (...args) => { received = args; return Response.json({id:'12'}); };
  assert.deepEqual(await loginCurrentAgentSource.read(signal),{id:'12',namespace:'user'});
  assert.equal(received[0],'/api/auth/current-user');
  assert.deepEqual(received[1],{credentials:'same-origin',cache:'no-store',redirect:'manual',signal});
  for (const response of [new Response(null,{status:401}),new Response(null,{status:302}),Response.json({id:null}),Response.json({id:12})]) {
    global.fetch = async () => response;
    assert.equal(await loginCurrentAgentSource.read(signal),null);
  }
});
test('a browser lookup completed after cancellation cannot supply an agent', async () => {
  const controller = new AbortController();
  global.fetch = async () => { controller.abort(); return Response.json({id:'12'}); };
  await assert.rejects(loginCurrentAgentSource.read(controller.signal),{name:'AbortError'});
});
