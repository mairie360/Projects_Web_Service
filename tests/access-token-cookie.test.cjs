const assert = require('node:assert/strict');
const { test, beforeEach, afterEach } = require('node:test');
const { NextResponse } = require('next/server');
const { requireTs } = require('./support/typescript.cjs');
const { ACCESS_TOKEN_COOKIE, clearAccessTokenCookie } = requireTs('src/lib/access-token-cookie.ts');
const originalDomain = process.env.COOKIE_DOMAIN;
beforeEach(() => { delete process.env.COOKIE_DOMAIN; });
afterEach(() => { originalDomain === undefined ? delete process.env.COOKIE_DOMAIN : process.env.COOKIE_DOMAIN = originalDomain; });

test('the server expiry helper clears the access cookie without requiring a browser or reading storage', async () => {
  assert.equal(typeof window, 'undefined');
  const response = NextResponse.json({ message: 'Existing response' }, { status: 202 });
  response.cookies.set('accessToken', 'legacy-access-value', { path: '/' });
  response.cookies.set('refreshToken', 'retained-refresh-value', { path: '/api' });
  response.cookies.set('mairie360_appearance', 'retained-preference', { path: '/' });
  assert.equal(clearAccessTokenCookie(response), response);
  assert.equal(ACCESS_TOKEN_COOKIE, 'accessToken');
  const expiry = response.cookies.get('accessToken');
  assert.equal(expiry.value, '');
  assert.equal(expiry.path, '/');
  assert.equal(expiry.maxAge, 0);
  assert.equal(expiry.expires.valueOf(), 0);
  assert.equal(expiry.domain, undefined);
  assert.equal(response.cookies.get('refreshToken').value, 'retained-refresh-value');
  assert.equal(response.cookies.get('mairie360_appearance').value, 'retained-preference');
  assert.doesNotMatch(response.headers.get('set-cookie'), /legacy-access-value/);
  assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), { message: 'Existing response' });
});

test('a configured shared cookie domain is trimmed and targets the existing cross-front cookie', () => {
  process.env.COOKIE_DOMAIN = '  .mairie.test  ';
  const response = clearAccessTokenCookie(new NextResponse(null));
  const expiry = response.cookies.get('accessToken');
  assert.equal(expiry.domain, '.mairie.test');
  assert.match(response.headers.get('set-cookie'), /Domain=\.mairie\.test/);
  assert.match(response.headers.get('set-cookie'), /Max-Age=0/);
});

test('an empty domain expires only the host cookie and repeated cleanup stays idempotent', () => {
  process.env.COOKIE_DOMAIN = '   ';
  const response = new NextResponse(null);
  clearAccessTokenCookie(response);
  const first = response.headers.get('set-cookie');
  clearAccessTokenCookie(response);
  assert.equal(response.headers.get('set-cookie'), first);
  assert.doesNotMatch(first, /Domain=/i);
  assert.equal(response.cookies.getAll().length, 1);
});
