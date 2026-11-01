const assert = require('node:assert/strict');
const { test, before, after, beforeEach, afterEach } = require('node:test');
const { requireTs } = require('./support/typescript.cjs');
const { createFrontHarness } = require('./support/front-harness.cjs');
const h = createFrontHarness();
before(() => h.start());
after(() => h.stop());
beforeEach(() => { h.reset(); h.signIn('current-access'); h.cookies.set('refreshToken', 'current-refresh'); });
afterEach(() => assert.deepEqual(h.violations(), []));

test('pending explicit logout retains recovery when a late refusal requests Login navigation', async () => {
  const auth = requireTs('src/lib/auth-token.ts');
  let finish;
  let entered;
  const ready = new Promise(resolve => { entered = resolve; });
  h.replyFromOwner(() => new Promise(resolve => { finish = resolve; entered(); }));
  const pending = auth.logoutAndReload();
  await ready;
  try {
    auth.navigateToLogin();
    assert.deepEqual(h.location.assigned, []);
  } finally {
    finish(Response.json({ message: 'Not confirmed', session_revoked: false }));
    await assert.rejects(pending);
  }
  auth.navigateToLogin();
  assert.deepEqual(h.location.assigned, []);
  assert.equal(h.ownerCalls.length, 1);
});

test('an explicit return after refused logout preserves the validated current Projects address', async () => {
  const auth = requireTs('src/lib/auth-token.ts');
  h.replyFromOwner(() => Response.json({ message: 'Unavailable' }, { status: 503 }));
  await assert.rejects(auth.logoutAndReload());
  auth.returnToLogin();
  assert.equal(h.location.assigned.length, 1);
  assert.equal(new URL(h.location.assigned[0]).searchParams.get('redirect'), h.location.href);
  assert.equal(h.ownerCalls.length, 1);
});

test('a positive revocation flag without the published message cannot report logout success', async () => {
  h.storage.setItem('mairie360.auth.jwt', 'legacy-fixture');
  h.replyFromOwner(() => Response.json({ session_revoked: true }));
  await assert.rejects(requireTs('src/lib/auth-token.ts').logoutAndReload());
  assert.equal(h.storage.getItem('mairie360.auth.jwt'), 'legacy-fixture');
  assert.deepEqual(h.location.assigned, []);
});
