const assert = require('node:assert/strict');
const { describe, test, before, after, beforeEach, afterEach } = require('node:test');
const { requireTs } = require('./support/typescript.cjs');
const { createFrontHarness } = require('./support/front-harness.cjs');
const fixtures = require('./support/bff-fixtures.cjs');

// Session du shell : dérivée de `access` dans GET /projects-page (contrat publié de BFF_Project, qui résout
// lui-même l'utilisateur), et déconnexion locale via /api/auth/logout, qui n'appelle aucun service.
//
// Sans DOM, React est remplacé par un rendu minimal : useState conserve l'état, useEffect s'exécute une fois.

const reactModule = require.resolve('react');
let hookState;
let hookCleanup;
require.cache[reactModule] = {
  id: reactModule, filename: reactModule, loaded: true,
  exports: {
    useState(initial) {
      hookState ??= { value: typeof initial === 'function' ? initial() : initial };
      return [hookState.value, (next) => { hookState.value = typeof next === 'function' ? next(hookState.value) : next; }];
    },
    useEffect(effect) { hookCleanup = effect(); },
  },
};

const harness = createFrontHarness();
const { bffProject } = harness;
let session;

before(async () => {
  await harness.start();
  session = requireTs('src/lib/auth-session.ts');
});
after(() => harness.stop());
beforeEach(() => {
  harness.reset();
  harness.signIn(fixtures.jwt(fixtures.agents.marie.id));
  hookState = undefined;
  hookCleanup = undefined;
});
afterEach(() => assert.deepEqual(harness.violations(), []));

const settle = async (done) => {
  for (let attempt = 0; attempt < 200 && !done(); attempt += 1) await new Promise((resolve) => setTimeout(resolve, 5));
};

describe('useAuthSession', () => {
  test('charge le rôle via GET /projects-page?limit=1 et n’appelle que BFF_Project', async () => {
    const page = fixtures.projectsPage([]);
    bffProject.on('get', '/projects-page', { body: { ...page, access: { ...page.access, role: 'Admin', scope: 'all' } } });

    session.useAuthSession();
    assert.deepEqual([hookState.value.loading, hookState.value.user.name], [true, 'Chargement…']);
    await settle(() => !hookState.value.loading);

    assert.equal(bffProject.calls('/projects-page', 'get')[0].url.search, '?limit=1');
    assert.deepEqual(hookState.value, {
      user: { name: 'Administrateur', role: 'Admin' },
      role: 'Admin',
      access: { ...page.access, role: 'Admin', scope: 'all' },
      isAdmin: true,
      loading: false,
      error: null,
    });
    assert.deepEqual(harness.browserCalls.map(({ method, path }) => `${method} ${path}`), ['GET /api/bff/projects-page']);
  });

  test('une erreur du BFF signale une session indisponible', async () => {
    bffProject.on('get', '/projects-page', harness.errorReply(502, fixtures.apiError('BAD_GATEWAY', 'Service amont indisponible')));

    session.useAuthSession();
    await settle(() => !hookState.value.loading);

    assert.deepEqual([hookState.value.error, hookState.value.isAdmin, hookState.value.role], ['Les informations de session sont indisponibles.', false, 'Guest']);
  });

  test('un 401 renvoie à Login sans révoquer la session ni afficher d’erreur', async () => {
    bffProject.on('get', '/projects-page', harness.errorReply(401, fixtures.apiError('UNAUTHORIZED', 'Session expirée')));

    session.useAuthSession();
    await settle(() => harness.location.assigned.length > 0);
    await new Promise((resolve) => setTimeout(resolve, 10));

    assert.equal(harness.location.reloads, 0);
    assert.equal(harness.location.assigned.length, 1);
    assert.equal(harness.cookies.has('accessToken'), true);
    assert.deepEqual([hookState.value.loading, hookState.value.error], [true, null]);
  });

  test('le démontage annule le chargement sans erreur affichée', async () => {
    bffProject.on('get', '/projects-page', { body: fixtures.projectsPage([]) });

    session.useAuthSession();
    hookCleanup();
    await new Promise((resolve) => setTimeout(resolve, 50));

    assert.deepEqual([hookState.value.loading, hookState.value.error], [true, null]);
  });
});

describe('authSessionFromAccess', () => {
  test('chaque rôle du contrat a un libellé, et seul Admin ouvre l’administration', () => {
    const base = fixtures.projectsPage([]).access;
    const roles = bffProject.contract.schema('ProjectsPageResponseAccessRole').enum;
    const labels = Object.fromEntries(roles.map((role) => [role, session.authSessionFromAccess({ ...base, role })]).map(([role, value]) => [role, [value.user.name, value.isAdmin]]));

    assert.deepEqual(labels, { Admin: ['Administrateur', true], Maire: ['Maire', false], Responsable: ['Responsable', false], User: ['Agent', false], Guest: ['Invité', false] });
  });

  test('sans réponse du BFF, la session est en chargement et Guest', () => {
    assert.deepEqual(session.authSessionFromAccess(null), { user: { name: 'Chargement…', role: 'Guest' }, role: 'Guest', access: null, isAdmin: false, loading: true, error: null });
    assert.equal(session.authSessionFromAccess(null, { loading: false, error: 'x' }).error, 'x');
  });
});

describe('déconnexion partagée explicite', () => {
  const init = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' };
  test('POST delegates to Login and only its successful receipt expires both cookies', async () => {
    harness.cookies.set('refreshToken', 'logout-refresh');
    harness.bffUser.on('post', '/auth/logout', { body: { message: 'Logged out successfully', session_revoked: true } });
    const response = await fetch('/api/auth/logout', init);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).session_revoked, true);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(harness.cookies.has('accessToken'), false);
    assert.equal(harness.cookies.has('refreshToken'), false);
    assert.match(response.headers.get('set-cookie'), /Domain=\.mairie.test/i);
    assert.deepEqual(harness.ownerCalls.map(x => x.url.pathname), ['/api/auth/logout']);
    assert.deepEqual(harness.bffUser.requests[0].body, { refresh_token: 'logout-refresh' });
    assert.deepEqual(bffProject.requests, []);
  });

  test('a bodyless mutation is refused before reaching Login', async () => {
    const response = await fetch('/api/auth/logout', { method: 'POST' });
    assert.equal(response.status, 415);
    assert.deepEqual(harness.ownerCalls, []);
    assert.equal(harness.cookies.has('accessToken'), true);
  });

  test('logout reports an outage without navigation or erasing local tokens', async () => {
    const { logoutAndReload } = requireTs('src/lib/auth-token.ts');
    harness.storage.setItem('mairie360.auth.jwt', 'stale');
    harness.storage.setItem('unrelated.preference', 'keep');
    harness.replyFromOwner(() => Response.json({ message: 'Unavailable' }, { status: 503 }));
    await assert.rejects(logoutAndReload(), /La déconnexion n’a pas abouti/);
    assert.equal(harness.storage.getItem('mairie360.auth.jwt'), 'stale');
    assert.equal(harness.storage.getItem('unrelated.preference'), 'keep');
    assert.equal(harness.cookies.has('accessToken'), true);
    assert.deepEqual(harness.location.assigned, []);
    assert.equal(harness.location.reloads, 0);
  });

  test('a confirmed logout removes only auth storage and returns to configured Login', async () => {
    const { logoutAndReload } = requireTs('src/lib/auth-token.ts');
    harness.storage.setItem('mairie360.auth.jwt', 'stale');
    harness.storage.setItem('mairie360.projects.jwt', 'legacy');
    harness.storage.setItem('unrelated.preference', 'keep');
    harness.bffUser.on('post', '/auth/logout', { body: { message: 'Logged out successfully', session_revoked: true } });
    await Promise.all([logoutAndReload(), logoutAndReload()]);
    assert.equal(harness.ownerCalls.length, 1);
    assert.equal(harness.storage.getItem('mairie360.auth.jwt'), null);
    assert.equal(harness.storage.getItem('mairie360.projects.jwt'), null);
    assert.equal(harness.storage.getItem('unrelated.preference'), 'keep');
    assert.deepEqual(harness.location.assigned, ['https://login.mairie.test/']);
  });

  test('an unconfirmed server closure is visible and never becomes a successful navigation', async () => {
    const { logoutAndReload } = requireTs('src/lib/auth-token.ts');
    harness.storage.setItem('mairie360.auth.jwt', 'legacy-auth-fixture');
    harness.bffUser.on('post', '/auth/logout', { body: { message: 'Local session closed', session_revoked: false } });
    await assert.rejects(logoutAndReload(), /La déconnexion n’a pas pu être confirmée/);
    assert.equal(harness.storage.getItem('mairie360.auth.jwt'), 'legacy-auth-fixture');
    assert.equal(harness.cookies.has('accessToken'), false);
    assert.deepEqual(harness.location.assigned, []);
  });

  for (const receipt of [{}, { session_revoked: 'yes' }, { session_revoked: true, logout_url: 7 }, { session_revoked: true, logout_url: 'javascript:alert(1)' }, { session_revoked: true, logout_url: 'https://auth.mairie.test/not-logout' }, { session_revoked: true, logout_url: 'http://auth.mairie.test/realms/mairie/protocol/openid-connect/logout' }]) {
    test('a malformed logout receipt cannot report success: ' + JSON.stringify(receipt), async () => {
      harness.replyFromOwner(() => Response.json({ message: 'Logged out successfully', ...receipt }));
      await assert.rejects(requireTs('src/lib/auth-token.ts').logoutAndReload());
      assert.deepEqual(harness.location.assigned, []);
    });
  }
  test('a confirmed revocation follows the actual validated SSO end-session URL', async () => {
    const logoutUrl = 'https://auth.mairie.test/realms/mairie/protocol/openid-connect/logout?client_id=mairie360&post_logout_redirect_uri=https%3A%2F%2Flogin.mairie.test%2F';
    harness.bffUser.on('post', '/auth/logout', { body: { message: 'Logged out successfully', session_revoked: true, logout_url: logoutUrl } });
    await requireTs('src/lib/auth-token.ts').logoutAndReload();
    assert.deepEqual(harness.location.assigned, [logoutUrl]);
    assert.equal(harness.cookies.has('accessToken'), false);
  });

  test('a confirmed receipt with missing Login configuration remains visible instead of reloading', async () => {
    requireTs('src/lib/front-urls.ts').setBrowserFrontUrls({});
    harness.replyFromOwner(() => Response.json({ message: 'Logged out successfully', session_revoked: true }));
    await assert.rejects(requireTs('src/lib/auth-token.ts').logoutAndReload(), /connexion partagée n’est pas configurée/);
    assert.deepEqual(harness.location.assigned, []);
  });

  test('a transport refusal explains retry in French and preserves session and auth storage', async t => {
    harness.storage.setItem('mairie360.auth.jwt', 'local-session');
    t.mock.method(global, 'fetch', async () => { throw new TypeError('Failed to fetch'); });
    await assert.rejects(requireTs('src/lib/auth-token.ts').logoutAndReload(), { message: 'La déconnexion n’a pas abouti. Vérifiez votre connexion et réessayez.' });
    assert.equal(harness.cookies.has('accessToken'), true);
    assert.equal(harness.storage.getItem('mairie360.auth.jwt'), 'local-session');
    assert.deepEqual(harness.location.assigned, []);
  });

  test('an unreadable successful receipt explains uncertainty without navigation', async () => {
    harness.replyFromOwner(() => new Response('<html>Unavailable</html>', { headers: { 'Content-Type': 'text/html' } }));
    await assert.rejects(requireTs('src/lib/auth-token.ts').logoutAndReload(), { message: 'La déconnexion n’a pas pu être confirmée. Veuillez réessayer.' });
    assert.equal(harness.cookies.has('accessToken'), true);
    assert.deepEqual(harness.location.assigned, []);
  });

});
