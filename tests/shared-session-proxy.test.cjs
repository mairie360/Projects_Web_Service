const assert = require('node:assert/strict');
const { test, before, after, beforeEach, afterEach } = require('node:test');
const { requireTs } = require('./support/typescript.cjs');
const { createFrontHarness } = require('./support/front-harness.cjs');
const f = require('./support/bff-fixtures.cjs');
const h = createFrontHarness();
let client;
before(async () => { await h.start(); client = requireTs('src/lib/bffProjectClient.ts'); });
after(() => h.stop());
beforeEach(() => { h.reset(); h.signIn('expired-access'); h.cookies.set('refreshToken', 'initial-refresh'); });
afterEach(() => assert.deepEqual(h.violations(), []));
const rotated = () => {
  h.bffUser.on('post', '/auth/refresh', { body: { message: 'JWT refreshed successfully' }, headers: { 'Set-Cookie': ['accessToken=renewed-access; Path=/; HttpOnly; Secure; SameSite=Strict', 'refreshToken=renewed-refresh; Path=/api; HttpOnly; Secure; SameSite=Strict'] } });
};
const business = () => h.bffProject.on('get', '/projects-page', request => request.headers.authorization === 'Bearer renewed-access'
  ? { body: f.projectsPage([]) }
  : h.errorReply(401, f.apiError('UNAUTHORIZED', 'Session expirée')));

test('expired access renews through the Login owner and retries the published read with its cookies', async () => {
  rotated(); business();
  await client.getProjectsPage({ view: 'table', q: 'éclairage' });
  assert.deepEqual(h.browserCalls.map(x => x.path), ['/api/bff/projects-page']);
  assert.deepEqual(h.ownerCalls.map(x => [x.url.pathname, x.init.method]), [['/api/auth/refresh', 'POST']]);
  const renewal = h.bffUser.calls('/auth/refresh', 'post')[0];
  assert.deepEqual(renewal.body, { refresh_token: 'initial-refresh' });
  assert.equal(renewal.headers.authorization, undefined);
  assert.deepEqual(h.bffProject.requests.map(x => x.headers.authorization), ['Bearer expired-access', 'Bearer renewed-access']);
  assert.ok(h.bffProject.requests.every(x => x.url.search === '?view=table&q=%C3%A9clairage'));
  assert.deepEqual([...h.cookies], [['accessToken', 'renewed-access'], ['refreshToken', 'renewed-refresh']]);
  assert.deepEqual(h.location.assigned, []);
});

test('refresh without an access cookie never sends a stale browser bearer', async () => {
  h.cookies.delete('accessToken'); rotated(); business();
  await client.getProjectsPage();
  assert.equal(h.bffProject.requests[0].headers.authorization, undefined);
  assert.equal(h.bffProject.requests[1].headers.authorization, 'Bearer renewed-access');
});

test('simultaneous reads share one User refresh and receive the same rotated pair', async () => {
  rotated(); business();
  await Promise.all([client.getProjectsPage(), client.getProjectsPage(), client.getProjectsPage()]);
  assert.equal(h.bffUser.calls('/auth/refresh', 'post').length, 1);
  assert.equal(h.ownerCalls.length, 3);
  assert.equal(h.bffProject.requests.length, 6);
});

test('a published write retries once with the exact same body after a rejected access token', async () => {
  rotated();
  const body = { title: 'Tâche municipale', description: '', responsibleId: '3', assigneeIds: ['3'], labels: [], dueDate: '2026-12-15', priority: 'medium', status: 'todo' };
  h.bffProject.on('post', '/projects/{projectId}/tasks', request => request.headers.authorization === 'Bearer renewed-access'
    ? { status: 201, body: f.projectTask({ title: body.title }) }
    : h.errorReply(401, f.apiError('UNAUTHORIZED', 'Session expirée')));
  await client.createProjectTask('project-1', body);
  assert.equal(h.bffProject.requests.length, 2);
  assert.deepEqual(h.bffProject.requests.map(x => x.body), [body, body]);
  assert.equal(h.bffUser.calls('/auth/refresh', 'post').length, 1);
});

test('a rejected refresh navigates once with the current validated return and never invokes logout', async () => {
  business();
  h.replyFromOwner(() => Response.json({ message: 'Session expirée' }, { status: 401 }));
  const result = await Promise.allSettled([client.getProjectsPage(), client.getProjectsPage()]);
  assert.ok(result.every(x => x.status === 'rejected' && x.reason.status === 401));
  assert.equal(h.location.assigned.length, 1);
  assert.equal(new URL(h.location.assigned[0]).searchParams.get('returnUrl'), h.location.href);
  assert.ok(h.ownerCalls.every(x => x.url.pathname === '/api/auth/refresh'));
  assert.equal(h.cookies.get('refreshToken'), 'initial-refresh');
});

test('a renewal outage is retryable and preserves the session without navigation', async () => {
  business(); h.replyFromOwner(() => Response.json({ message: 'Indisponible' }, { status: 503 }));
  await assert.rejects(client.getProjectsPage(), { status: 503 });
  assert.deepEqual(h.location.assigned, []);
  assert.equal(h.cookies.get('refreshToken'), 'initial-refresh');
  assert.equal(h.bffProject.requests.length, 1);
});

test('a malformed successful renewal is an error, never a false logout or business replay', async () => {
  business(); h.replyFromOwner(() => Response.json({ message: 'Missing cookies' }));
  await assert.rejects(client.getProjectsPage(), { status: 502 });
  assert.equal(h.bffProject.requests.length, 1);
  assert.deepEqual(h.location.assigned, []);
});

test('a second business 401 stops after one retry and returns to Login', async () => {
  rotated(); h.bffProject.on('get', '/projects-page', h.errorReply(401, f.apiError('UNAUTHORIZED', 'Session expirée')));
  await assert.rejects(client.getProjectsPage(), { status: 401 });
  assert.equal(h.bffProject.requests.length, 2);
  assert.equal(h.bffUser.requests.length, 1);
  assert.equal(h.location.assigned.length, 1);
});

test('foreign-origin mutations and undeclared metadata are refused without network', async () => {
  const { POST } = requireTs('src/app/api/auth/logout/route.ts');
  const { NextRequest } = require('next/server');
  const response = await POST(new NextRequest('http://projects.test/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://foreign.test', 'Sec-Fetch-Site': 'cross-site' }, body: '{}' }));
  assert.equal(response.status, 403);
  for (const path of ['/api/bff/openapi.json', '/api/bff/swagger.json', '/api/bff/auth/refresh']) assert.equal((await fetch(path)).status, 404);
  assert.deepEqual(h.ownerCalls, []); assert.deepEqual(h.bffProject.requests, []);
});

test('Login navigation rejects invalid configuration and never forwards a foreign return origin', () => {
  const { navigateToLogin } = requireTs('src/lib/auth-token.ts');
  const { setBrowserFrontUrls } = requireTs('src/lib/front-urls.ts');
  setBrowserFrontUrls({ LOGIN_FRONT_URL: 'javascript:alert(1)', PROJECT_FRONT_URL: 'https://projects.mairie.test' });
  navigateToLogin(); assert.deepEqual(h.location.assigned, []);
  setBrowserFrontUrls({ LOGIN_FRONT_URL: 'https://login.mairie.test', PROJECT_FRONT_URL: 'https://foreign.mairie.test' });
  navigateToLogin(); assert.deepEqual(h.location.assigned, ['https://login.mairie.test/']);
});

test('missing Login transport cannot trigger a renewal to a caller-selected host', async () => {
  business(); process.env.LOGIN_FRONT_URL = '';
  await assert.rejects(client.getProjectsPage(), { status: 401 });
  assert.deepEqual(h.ownerCalls, []);
});
