const assert = require('node:assert/strict');
const { test, afterEach } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
const { NextRequest } = require('next/server');
const originalLoader = require.extensions['.ts'];
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true, resolveJsonModule: true } }).outputText, filename);
const { proxyBffRequest } = require('../src/lib/bff-proxy.ts');
require.extensions['.ts'] = originalLoader;
const originalFetch = global.fetch;
const bffUrlVariables = ['BFF_PROJECT_BASE_URL', 'PROJECT_BFF_URL', 'NEXT_PUBLIC_BFF_PROJECT_BASE_URL'];
const originalBffUrls = Object.fromEntries(bffUrlVariables.map((name) => [name, process.env[name]]));
afterEach(() => {
  global.fetch = originalFetch;
  for (const [name, value] of Object.entries(originalBffUrls)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

test('proxy preserves query, authorization, data, and upstream status', async () => {
  process.env.BFF_PROJECT_BASE_URL = 'http://bff.example';
  let called;
  global.fetch = async (url, init) => { called = { url: String(url), init }; return Response.json({ id: '42', value: null }, { status: 201 }); };
  const request = new NextRequest('http://localhost/health?q=a%26b', { headers: { cookie: 'accessToken=test-session', Authorization: 'Bearer explicit-session' } });
  const response = await proxyBffRequest(request, { params: Promise.resolve({ path: ['health'] }) });
  assert.equal(response.status, 201); assert.deepEqual(await response.json(), { id: '42', value: null });
  assert.equal(new URL(called.url).search, '?q=a%26b'); assert.equal(called.init.headers.get('Authorization'), 'Bearer test-session');
  assert.equal(called.init.headers.get('cookie'), null); assert.equal(called.init.redirect, 'manual');
});
test('proxy preserves the exact published JSON write body and 204 response', async () => {
  process.env.BFF_PROJECT_BASE_URL = 'http://bff.example';
  const body = '{ "title": "Projet municipal", "participants": [], "labels": [] }';
  let init;
  global.fetch = async (_url, options) => { init = options; return new Response(null, { status: 204 }); };
  const request = new NextRequest('http://localhost/api/bff/projects', { method: 'POST', headers: { 'Content-Type': 'application/json', cookie: 'accessToken=test-session' }, body });
  const response = await proxyBffRequest(request, { params: Promise.resolve({ path: ['projects'] }) });
  assert.equal(response.status, 204); assert.equal(await response.text(), '');
  assert.equal(Buffer.from(init.body).toString(), body);
  assert.equal(init.headers.get('Authorization'), 'Bearer test-session');
  assert.equal(init.headers.get('Content-Type'), 'application/json');
});
test('contract rejects unknown routes and methods before contacting the BFF', async () => {
  global.fetch = async () => { throw new Error('must not be called'); };
  const missing = await proxyBffRequest(new NextRequest('http://localhost/unknown'), { params: Promise.resolve({ path: ['unknown'] }) });
  assert.equal(missing.status, 404);
  const wrongMethod = await proxyBffRequest(new NextRequest('http://localhost/health', { method: 'DELETE' }), { params: Promise.resolve({ path: ['health'] }) });
  assert.equal(wrongMethod.status, 405); assert.match(wrongMethod.headers.get('Allow'), /GET/);
});
test('BFF errors are preserved and ordinary BFF cookies cannot mutate the shared session', async () => {
  global.fetch = async () => Response.json({ message: 'Denied' }, { status: 403, headers: { 'Set-Cookie': 'accessToken=; Max-Age=0; Path=/; HttpOnly' } });
  process.env.BFF_PROJECT_BASE_URL = 'http://bff.example';
  const result = await proxyBffRequest(new NextRequest('http://localhost/api/bff/projects-page'), { params: Promise.resolve({ path: ['projects-page'] }) });
  assert.equal(result.status, 403); assert.deepEqual(await result.json(), { message: 'Denied' }); assert.equal(result.headers.get('Set-Cookie'), null);
});
test('unavailable BFF produces a controlled error', async () => {
  global.fetch = async () => { throw new Error('connection refused'); };
  process.env.BFF_PROJECT_BASE_URL = 'http://bff.example';
  const result = await proxyBffRequest(new NextRequest('http://localhost/health'), { params: Promise.resolve({ path: ['health'] }) });
  assert.equal(result.status, 502); assert.equal(result.headers.get('Cache-Control'), 'no-store');
});

for (const [name, value] of [
  ['missing', undefined],
  ['empty', ''],
  ['malformed', 'not-a-url'],
  ['unsupported protocol', 'file:///tmp/bff'],
  ['embedded credentials', 'http://user:password@example.test'],
]) {
  test(`${name} BFF URL returns an uncached 503 without an upstream call`, async () => {
    for (const variable of bffUrlVariables) delete process.env[variable];
    if (value !== undefined) process.env.BFF_PROJECT_BASE_URL = value;
    global.fetch = async () => { throw new Error('must not be called'); };

    const response = await proxyBffRequest(new NextRequest('http://localhost/health'), { params: Promise.resolve({ path: ['health'] }) });

    assert.equal(response.status, 503);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.deepEqual(await response.json(), { error: { message: 'Le service n’est pas configuré.' } });
  });
}
