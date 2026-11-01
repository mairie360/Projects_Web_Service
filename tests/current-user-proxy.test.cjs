const assert = require('node:assert/strict');
const { test, beforeEach, afterEach } = require('node:test');
const { requireTs } = require('./support/typescript.cjs');
const { currentUser } = requireTs('src/lib/current-user-proxy.ts');
const initial = { fetch:global.fetch, env:{...process.env} };
let calls;
const session = id => ({user:{id,first_name:'Agent',last_name:'Municipal',email:'private@example.test',status:'ACTIVE'},groups:[],roles:[]});
const request = (headers={},tokens={accessToken:'access-cookie',refreshToken:'refresh-cookie'}) => ({headers:new Headers(headers),cookies:{get:name=>tokens[name]?{value:tokens[name]}:undefined},signal:new AbortController().signal});
beforeEach(()=>{calls=[];process.env.PROJECT_FRONT_URL='https://projects.mairie.test';process.env.LOGIN_FRONT_URL='https://login.mairie.test';process.env.NODE_ENV='production';global.fetch=async(target,init)=>{calls.push({target,init});return Response.json(session(12),{headers:{'Set-Cookie':'accessToken=rotated; Path=/; HttpOnly; Secure; SameSite=Strict'}});};});
afterEach(()=>{global.fetch=initial.fetch;for(const key of ['NODE_ENV','PROJECT_FRONT_URL','LOGIN_FRONT_URL']){if(initial.env[key]===undefined)delete process.env[key];else process.env[key]=initial.env[key];}});
test('the frontend adapter reads the existing trusted Login /me and exposes only the received ID',async()=>{
 const response=await currentUser(request({origin:'https://projects.mairie.test','sec-fetch-site':'same-origin'}));
 assert.equal(response.status,200);assert.deepEqual(await response.json(),{id:'12'});
 assert.equal(response.headers.get('cache-control'),'no-store');assert.match(response.headers.get('set-cookie'),/accessToken=rotated/);
 assert.equal(calls[0].target.href,'https://login.mairie.test/me');
 assert.deepEqual(calls[0].init.headers,{Accept:'application/json','Sec-Fetch-Site':'same-site',Cookie:'accessToken=access-cookie; refreshToken=refresh-cookie'});
 assert.equal(calls[0].init.redirect,'manual');assert.equal(calls[0].init.cache,'no-store');
});
test('an absent or unsupported optional SDK identity leaves the task manual',async()=>{
 for(const id of [undefined,null,0,-1,1.5,'opaque','01','9007199254740992',{},[]]){
  global.fetch=async()=>Response.json(session(id));const response=await currentUser(request());
  assert.equal(response.status,200);assert.deepEqual(await response.json(),{id:null});
 }
 global.fetch=async()=>Response.json(session('24'));
 assert.deepEqual(await(await currentUser(request())).json(),{id:'24'});
});
test('malformed successful sessions and failed reads do not reveal identities or cookies',async()=>{
 for(const body of [{id:12},{user:{id:12}}, {...session(12),roles:null}, {...session(12),user:{...session(12).user,status:null}}]){
  global.fetch=async()=>Response.json(body);const response=await currentUser(request());assert.equal(response.status,502);assert.deepEqual(await response.json(),{id:null});
 }
 for(const status of [401,403,503,302]){
  global.fetch=async()=>new Response('private',{status,headers:{'Set-Cookie':'accessToken=unverified'}});const response=await currentUser(request());assert.equal(response.status,status===302?502:status);assert.equal(response.headers.has('set-cookie'),false);
 }
 global.fetch=async()=>{throw new Error('private network detail');};assert.equal((await currentUser(request())).status,502);
});
test('untrusted origins, configuration and missing credentials never contact a peer',async()=>{
 for(const headers of [{origin:'https://foreign.test'},{'sec-fetch-site':'cross-site'}]) assert.equal((await currentUser(request(headers))).status,403);
 assert.equal((await currentUser(request({},{}))).status,401);
 for(const url of ['', 'https://user:password@login.test', 'https://login.test/?target=foreign', 'https://login.test/#x','javascript:alert(1)','http://login.test']){
  process.env.LOGIN_FRONT_URL=url;assert.equal((await currentUser(request())).status,503);
 }
 assert.equal(calls.length,0);
});
test('the request lifetime cancels the bounded peer read',async()=>{
 const controller=new AbortController();let peerSignal;
 global.fetch=async(_target,init)=>{peerSignal=init.signal;controller.abort();throw new DOMException('Cancelled','AbortError');};
 const response=await currentUser({...request(),signal:controller.signal});assert.equal(response.status,502);assert.equal(peerSignal.aborted,true);
});
