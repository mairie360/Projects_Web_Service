const assert=require('node:assert/strict');
const {test,before,after,beforeEach,afterEach}=require('node:test');
const {requireTs}=require('./support/typescript.cjs');
const {createFrontHarness}=require('./support/front-harness.cjs');
const {loginCurrentAgentSource,selectableCurrentAgent}=requireTs('src/lib/current-agent.ts');
const h=createFrontHarness();
before(()=>h.start());after(()=>h.stop());
beforeEach(()=>{h.reset();h.signIn('received-access');});
afterEach(()=>assert.deepEqual(h.violations(),[]));
test('the production source traverses the real frontend adapter and existing Login gateway using the published User session',async()=>{
 h.bffUser.on('get','/me',{body:{user:{id:12,first_name:'Agent',last_name:'Municipal',email:'agent@example.test',status:'ACTIVE'},groups:[],roles:[]}});
 const agent=await loginCurrentAgentSource.read(new AbortController().signal);
 assert.deepEqual(agent,{id:'12',namespace:'user'});
 assert.equal(selectableCurrentAgent(agent,[{value:'user-12',label:'Agent reçu'}]),'user-12');
 assert.deepEqual(h.browserCalls.map(call=>call.path),['/api/auth/current-user']);
 assert.deepEqual(h.sessionReadCalls.map(call=>call.url.pathname),['/me']);
 assert.equal(h.bffUser.calls('/me','get')[0].headers.authorization,'Bearer received-access');
 assert.equal(h.bffProject.requests.length,0);
 assert.deepEqual(h.ownerCalls,[]);
});
test('the same real chain preserves manual assignment when the published optional ID is absent',async()=>{
 assert.equal(await loginCurrentAgentSource.read(new AbortController().signal),null);
 assert.equal(h.bffUser.calls('/me','get').length,1);
 assert.deepEqual(h.ownerCalls,[]);
});
