const assert = require('node:assert/strict');
const { test, beforeEach, afterEach } = require('node:test');
const { requireTs } = require('./support/typescript.cjs');
const auth = requireTs('src/lib/auth-token.ts');
const { setBrowserFrontUrls } = requireTs('src/lib/front-urls.ts');
const originalFetch = global.fetch;
let values, navigations, originalWindow, originalDocument;
beforeEach(() => {
  originalWindow = global.window; originalDocument = global.document;
  values = new Map([['mairie360.auth.jwt', 'obsolete'], ['mairie360.projects.jwt', 'obsolete-project'], ['unrelated.preference', 'keep'], ['unrelated.draft', 'unsent']]);
  navigations = [];
  const current = new URL('https://tool.test.example/?view=retained');
  global.window = {
    location: { href: current.href, origin: current.origin, pathname: current.pathname, search: current.search, assign: target => navigations.push(target) },
    localStorage: { removeItem: key => values.delete(key), clear: () => assert.fail('Origin-wide storage must be preserved') },
  };
  global.document = {};
  Object.defineProperty(global.document, 'cookie', { get: () => 'owner-session=preserved', set: () => assert.fail('Only Login owns cookie expiry') });
  setBrowserFrontUrls({ LOGIN_FRONT_URL: 'https://login.test.example/', PROJECT_FRONT_URL: 'https://tool.test.example/' });
  global.fetch = () => assert.fail('A Login handoff must not revoke a server session');
});
afterEach(() => {
  global.fetch = originalFetch; setBrowserFrontUrls({});
  if (originalWindow === undefined) delete global.window; else global.window = originalWindow;
  if (originalDocument === undefined) delete global.document; else global.document = originalDocument;
});
test('accepted session-expiry Login handoff removes only known obsolete local keys', () => {
  auth.navigateToLogin();
  assert.equal(navigations.length, 1);
  assert.equal(new URL(navigations[0]).searchParams.get('redirect'), window.location.href);
  assert.deepEqual([...values], [['unrelated.preference', 'keep'], ['unrelated.draft', 'unsent']]);
  assert.equal(document.cookie, 'owner-session=preserved');
});
test('unavailable local storage cannot stop an accepted Login handoff', () => {
  Object.defineProperty(window, 'localStorage', { get: () => { throw new Error('Storage unavailable'); } });
  assert.doesNotThrow(() => auth.navigateToLogin());
  assert.equal(navigations.length, 1);
  assert.equal(document.cookie, 'owner-session=preserved');
});
test('invalid Login configuration does not clean local keys or navigate', () => {
  setBrowserFrontUrls({ LOGIN_FRONT_URL: 'javascript:alert(1)', PROJECT_FRONT_URL: 'https://tool.test.example/' });
  auth.navigateToLogin();
  assert.deepEqual(navigations, []);
  assert.equal(values.get('mairie360.auth.jwt'), 'obsolete');
  assert.equal(values.get('unrelated.draft'), 'unsent');
});
test('pending or refused logout keeps local keys until the explicit return choice', async () => {
  let reply; global.fetch = () => new Promise(resolve => { reply = resolve; });
  const pending = auth.logoutAndReload();
  auth.navigateToLogin();
  const beforeReceipt = [...navigations];
  const beforeKeys = [...values];
  reply(Response.json({ message: 'Unavailable' }, { status: 503 }));
  await assert.rejects(pending, /déconnexion/);
  assert.deepEqual(beforeReceipt, []);
  assert.equal(new Map(beforeKeys).get('mairie360.auth.jwt'), 'obsolete');
  assert.equal(values.get('unrelated.draft'), 'unsent');
  auth.navigateToLogin();
  assert.deepEqual(navigations, []);
  auth.returnToLogin();
  assert.equal(navigations.length, 1);
  assert.deepEqual([...values], [['unrelated.preference', 'keep'], ['unrelated.draft', 'unsent']]);
  assert.equal(document.cookie, 'owner-session=preserved');
});
