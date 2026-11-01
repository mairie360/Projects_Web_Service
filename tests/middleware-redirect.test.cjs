const assert = require('node:assert/strict');
const { test, beforeEach, afterEach } = require('node:test');
const { NextRequest } = require('next/server');
const { requireTs } = require('./support/typescript.cjs');
const { middleware } = requireTs('src/middleware.ts');
const previous = Object.fromEntries(['LOGIN_FRONT_URL', 'PROJECT_FRONT_URL', 'SETTINGS_FRONT_URL'].map(key => [key, process.env[key]]));
beforeEach(() => { process.env.LOGIN_FRONT_URL = 'https://login.mairie.test/'; process.env.PROJECT_FRONT_URL = 'https://projects.mairie.test'; process.env.SETTINGS_FRONT_URL = 'https://settings.mairie.test/account/'; });
afterEach(() => { for (const [key, value] of Object.entries(previous)) value === undefined ? delete process.env[key] : process.env[key] = value; });
const jwt = exp => 'e30.' + Buffer.from(JSON.stringify({ exp })).toString('base64url') + '.signature';
const current = jwt(Math.floor(Date.now()/1000) + 3600);
const request = (path = '/', token, method = 'GET') => new NextRequest('http://internal:3000' + path, { method, headers: token ? { cookie: 'accessToken=' + token } : {} });
for (const [label, token] of [['missing', undefined], ['opaque', 'opaque'], ['expired', jwt(1)], ['missing-expiry', jwt(undefined)], ['string-expiry', jwt('4102444800')], ['null-expiry', jwt(null)]]) test(`a ${label} document session resumes only at the configured frontend`, () => {
  const response = middleware(request('/?panel=sessions&view=compact', token));
  assert.equal(response.status, 307); assert.equal(response.headers.get('set-cookie'), null); assert.equal(response.headers.get('cache-control'), 'no-store');
  const target = new URL(response.headers.get('location'));
  assert.equal(target.origin, 'https://projects.mairie.test'); assert.equal(target.pathname, '/api/auth/resume');
  assert.equal(target.searchParams.get('next'), '/?panel=sessions&view=compact');
  assert.doesNotMatch(target.href, /internal:3000|opaque|signature/);
});
test('an explicit local frontend origin is used without an implicit localhost fallback', () => {
  process.env.PROJECT_FRONT_URL = ' http://localhost:5004/ ';
  const target = new URL(middleware(request('/?a=1')).headers.get('location'));
  assert.equal(target.origin, 'http://localhost:5004'); assert.equal(target.pathname, '/api/auth/resume'); assert.equal(target.searchParams.get('next'), '/?a=1');
});
test('missing, unrelated-scheme or credential-bearing frontend configuration fails closed', async () => {
  for (const value of [undefined, '', 'not a URL', 'ftp://front.mairie.test/', 'https://user:password@front.mairie.test/']) {
    value === undefined ? delete process.env.PROJECT_FRONT_URL : process.env.PROJECT_FRONT_URL = value;
    const response = middleware(request('/?private=page'));
    assert.equal(response.status, 503, String(value)); assert.equal(response.headers.get('location'), null); assert.equal(response.headers.get('cache-control'), 'no-store'); assert.equal(response.headers.get('set-cookie'), null);
    assert.match(await response.text(), /Connexion temporairement indisponible/);
  }
});
for (const [path, method] of [['/projects-page', 'GET'], ['/', 'POST']]) test(`an expired ${method} ${path} is JSON and cannot replay a write`, async () => {
  const response = middleware(request(path, undefined, method));
  assert.equal(response.status, 401); assert.equal(response.headers.get('location'), null); assert.equal(response.headers.get('set-cookie'), null); assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { error: { message: 'Votre session a expiré. Veuillez vous reconnecter.' } });
});
for (const path of ['/openapi.json', '/swagger.json']) test(`undeclared metadata ${path} is rejected without document navigation`, () => {
  const response = middleware(request(path, current)); assert.equal(response.status, 404); assert.equal(response.headers.get('location'), null);
});
test('a current access token reaches the protected document with a fresh nonce policy', () => {
  const first = middleware(request('/', current)), second = middleware(request('/', current));
  assert.equal(first.status, 200); assert.equal(first.headers.get('location'), null); assert.equal(first.headers.get('set-cookie'), null);
  assert.match(first.headers.get('content-security-policy'), /'nonce-[^']+'/); assert.notEqual(first.headers.get('content-security-policy'), second.headers.get('content-security-policy'));
});
test('authenticated legacy profile bookmarks open the configured Settings destination', () => {
  for (const path of ['/profile', '/profile/security?legacy=1']) {
    const response = middleware(request(path, current));
    assert.equal(response.status, 307); assert.equal(response.headers.get('location'), 'https://settings.mairie.test/account/'); assert.equal(response.headers.get('cache-control'), 'no-store');
  }
});
test('unsafe Settings profile destinations return an uncached unavailable state', async () => {
  for (const value of [undefined, 'javascript:alert(1)', 'https://user:pass@settings.mairie.test/', 'https://settings.mairie.test/profile']) {
    value === undefined ? delete process.env.SETTINGS_FRONT_URL : process.env.SETTINGS_FRONT_URL = value;
    const response = middleware(request('/profile', current));
    assert.equal(response.status, 503); assert.equal(response.headers.get('location'), null); assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.match(await response.text(), /Paramètres indisponibles/);
  }
});
