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
    assert.deepEqual(harness.browserCalls.map(({ method, path }) => `${method} ${path}`), ['GET /projects-page']);
  });

  test('une erreur du BFF signale une session indisponible', async () => {
    bffProject.on('get', '/projects-page', harness.errorReply(502, fixtures.apiError('BAD_GATEWAY', 'Service amont indisponible')));

    session.useAuthSession();
    await settle(() => !hookState.value.loading);

    assert.deepEqual([hookState.value.error, hookState.value.isAdmin, hookState.value.role], ['Les informations de session sont indisponibles.', false, 'Guest']);
  });

  test('un 401 laisse le client déconnecter et recharger sans afficher d’erreur', async () => {
    bffProject.on('get', '/projects-page', harness.errorReply(401, fixtures.apiError('UNAUTHORIZED', 'Session expirée')));

    session.useAuthSession();
    await settle(() => harness.location.reloads > 0);
    await new Promise((resolve) => setTimeout(resolve, 10));

    assert.equal(harness.location.reloads, 1);
    assert.equal(harness.cookies.has('accessToken'), false);
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

describe('déconnexion locale', () => {
  test('POST /api/auth/logout efface le cookie sans contacter de service', async () => {
    const response = await fetch('/api/auth/logout', { method: 'POST' });

    assert.equal(response.status, 204);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(harness.cookies.has('accessToken'), false);
    assert.deepEqual(bffProject.requests, []);
  });

  test('le cookie est effacé sur COOKIE_DOMAIN', async () => {
    process.env.COOKIE_DOMAIN = ' .mairie360.test ';
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      assert.match(response.headers.get('set-cookie'), /accessToken=;.*Domain=\.mairie360\.test/i);
    } finally {
      delete process.env.COOKIE_DOMAIN;
    }
  });

  test('logoutAndReload vide le stockage et recharge même si la route échoue', async () => {
    const { logoutAndReload } = requireTs('src/lib/auth-token.ts');
    harness.storage.setItem('mairie360.auth.jwt', 'stale');
    const failingFetch = global.fetch;
    global.fetch = async () => { throw new TypeError('hors ligne'); };
    try {
      await assert.rejects(logoutAndReload(), TypeError);
    } finally {
      global.fetch = failingFetch;
    }
    assert.deepEqual([harness.storage.length, harness.location.reloads], [0, 1]);
  });
});
