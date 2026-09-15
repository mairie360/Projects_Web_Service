const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
const { NextRequest } = require('next/server');
const originalLoader = require.extensions['.ts'];
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, filename);
const { middleware } = require('../src/middleware.ts');
const { buildContentSecurityPolicy } = require('../src/lib/content-security-policy.ts');
const nextConfig = require('../next.config.ts').default;
require.extensions['.ts'] = originalLoader;

const b64url = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const jwt = (exp) => `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({ sub: '2', exp })}.signature`;
const pageRequest = (token) => new NextRequest('http://localhost:5001/', token ? { headers: { cookie: `accessToken=${token}` } } : {});

test('authenticated pages get a per-request nonce CSP forwarded to Next.js', () => {
  const token = jwt(Math.floor(Date.now() / 1000) + 3600);
  const first = middleware(pageRequest(token));
  const second = middleware(pageRequest(token));
  const csp = first.headers.get('content-security-policy');
  const nonce = first.headers.get('x-middleware-request-x-nonce');
  assert.ok(nonce);
  assert.match(csp, new RegExp(`script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`));
  assert.match(csp, new RegExp(`style-src 'self' 'nonce-${nonce}';`));
  assert.match(csp, /style-src-attr 'unsafe-inline'/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.equal(first.headers.get('x-middleware-request-content-security-policy'), csp);
  assert.notEqual(second.headers.get('x-middleware-request-x-nonce'), nonce);
});

test('missing or expired sessions are redirected to Login without a CSP', () => {
  for (const token of [undefined, jwt(1)]) {
    const response = middleware(pageRequest(token));
    assert.equal(response.status, 307);
    assert.equal(response.headers.get('content-security-policy'), null);
    assert.match(response.headers.get('set-cookie'), /accessToken=;/);
  }
});

test('development CSP allows eval for hot reload only', () => {
  assert.doesNotMatch(buildContentSecurityPolicy('n'), /unsafe-eval/);
  assert.match(buildContentSecurityPolicy('n', true), /script-src [^;]*'unsafe-eval'/);
});

test('static security headers apply to every route and X-Powered-By is disabled', async () => {
  assert.equal(nextConfig.poweredByHeader, false);
  const [rule] = await nextConfig.headers();
  assert.equal(rule.source, '/:path*');
  assert.deepEqual(rule.headers.map(({ key }) => key).sort(), ['Cross-Origin-Embedder-Policy', 'Cross-Origin-Opener-Policy', 'Cross-Origin-Resource-Policy', 'Permissions-Policy', 'Referrer-Policy', 'X-Content-Type-Options', 'X-Frame-Options']);
});

test('JWT sans exp, opaque ou illisible : seul un payload illisible est traité comme expiré', () => {
  const noExp = `${b64url({ alg: 'HS256' })}.${b64url({ sub: '2' })}.signature`;
  assert.equal(middleware(pageRequest(noExp)).status, 200);
  assert.equal(middleware(pageRequest('opaque-session')).status, 200);
  assert.equal(middleware(pageRequest('a.%%%.c')).status, 307);
});

test('la redirection suit LOGIN_FRONT_URL et efface le cookie sur COOKIE_DOMAIN', () => {
  process.env.LOGIN_FRONT_URL = 'https://login.example/';
  process.env.COOKIE_DOMAIN = ' .mairie360.test ';
  try {
    const response = middleware(pageRequest());
    assert.equal(response.headers.get('location'), 'https://login.example/');
    assert.match(response.headers.get('set-cookie'), /Domain=\.mairie360\.test/i);
  } finally {
    delete process.env.LOGIN_FRONT_URL;
    delete process.env.COOKIE_DOMAIN;
  }
});
