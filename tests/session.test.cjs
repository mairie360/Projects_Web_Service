const assert = require('node:assert/strict');
const { describe, test, before, after, beforeEach, afterEach } = require('node:test');
const { requireTs } = require('./support/typescript.cjs');
const { createFrontHarness } = require('./support/front-harness.cjs');
const { unreachableUrl } = requireTs('tests/support/contract-mock-server.ts');
const fixtures = require('./support/bff-fixtures.cjs');

// Adaptateurs de session same-origin (src/app/api/**/route.ts) et hook useAuthSession, testés contre un
// vrai serveur HTTP simulant BFF User à partir du paquet @mairie360/bff-user-openapi installé. Orval ne type
// que les succès : les erreurs simulées de BFF User sont donc marquées `outOfContract`.
//
// Sans DOM, React est remplacé par un rendu minimal : useState conserve l'état, useEffect s'exécute une fois.

const reactModule = require.resolve('react');
let hookState;
let hookCleanup;
require.cache[reactModule] = {
  id: reactModule, filename: reactModule, loaded: true,
  exports: {
    useState(initial) {
      hookState ??= { value: initial };
      return [hookState.value, (next) => { hookState.value = typeof next === 'function' ? next(hookState.value) : next; }];
    },
    useEffect(effect) { hookCleanup = effect(); },
  },
};

const harness = createFrontHarness();
const { bffUser, bffProject } = harness;
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
afterEach(() => {
  assert.deepEqual(harness.violations(), []);
  assert.deepEqual(bffProject.requests, []);
});

async function renderSession() {
  session.useAuthSession();
  for (let attempt = 0; attempt < 200 && hookState.value.loading; attempt += 1) await new Promise((resolve) => setTimeout(resolve, 5));
  return hookState.value;
}

describe('adaptateurs /api/* vers BFF User', () => {
  test('/api/user/me et /api/auth/me appellent GET /me avec le cookie converti en Bearer', async () => {
    bffUser.on('get', '/me', { body: fixtures.sessionResponse() });

    for (const path of ['/api/user/me', '/api/auth/me']) {
      const response = await fetch(path, { cache: 'no-store' });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.deepEqual(await response.json(), fixtures.sessionResponse());
    }

    assert.deepEqual(bffUser.calls('/me', 'get').map((call) => call.headers.authorization), Array(2).fill(`Bearer ${fixtures.jwt(fixtures.agents.marie.id)}`));
  });

  test('/api/auth/session appelle GET /session/me', async () => {
    bffUser.on('get', '/session/me', { body: fixtures.sessionResponse(fixtures.agents.alice) });

    const response = await fetch('/api/auth/session');

    assert.equal((await response.json()).user.first_name, 'Alice');
    assert.equal(bffUser.calls('/session/me', 'get').length, 1);
  });

  test('/api/auth/logout appelle POST /auth/logout et relaie l’effacement du cookie', async () => {
    bffUser.on('post', '/auth/logout', { body: { message: 'Déconnecté' }, headers: { 'Set-Cookie': 'accessToken=; Max-Age=0; Path=/; HttpOnly' } });

    const response = await fetch('/api/auth/logout', { method: 'POST' });

    assert.equal(response.status, 200);
    assert.match(response.headers.get('set-cookie'), /Max-Age=0/);
    assert.equal(harness.cookies.has('accessToken'), false);
  });

  test('les adaptateurs n’exposent que les méthodes déclarées', async () => {
    const responses = await Promise.all([fetch('/api/user/me', { method: 'POST' }), fetch('/api/auth/logout')]);

    assert.deepEqual(responses.map((response) => response.status), [405, 405]);
    assert.deepEqual(bffUser.requests, []);
  });

  test('un 401 de BFF User est relayé tel quel', async () => {
    bffUser.on('get', '/me', { status: 401, body: { error: { message: 'Session invalide' } }, outOfContract: true });

    const response = await fetch('/api/user/me');

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: { message: 'Session invalide' } });
  });

  test('BFF_USER_API_URL sert de repli, et un BFF User injoignable donne un 502 contrôlé', async () => {
    const closed = await unreachableUrl();
    harness.allowUpstream(closed);
    delete process.env.USER_BFF_URL;
    process.env.BFF_USER_API_URL = closed;

    const response = await fetch('/api/user/me');

    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), { error: { message: 'Le service est indisponible.' } });
  });
});

describe('useAuthSession', () => {
  test('construit l’utilisateur depuis SessionResponse (nom, groupes, rôle explicite)', async () => {
    bffUser.on('get', '/me', {
      body: {
        ...fixtures.sessionResponse(fixtures.agents.admin, { phone: ' 01 02 03 04 05 ', role: 'ROLE_ADMINISTRATEUR' }),
        groups: [{ id: 1, name: ' Service urbanisme ', owner_id: 1 }, { id: 2, name: 'Élus', owner_id: 1 }],
        roles: ['Utilisateur'],
      },
    });

    const state = await renderSession();

    assert.deepEqual(state, {
      user: {
        name: 'Admin Mairie', email: 'admin@mairie.test', phone: '01 02 03 04 05', status: 'active',
        service: 'Service urbanisme, Élus', position: undefined, address: undefined, city: undefined, lastConnection: undefined, role: 'Admin',
      },
      groups: ['Service urbanisme', 'Élus'],
      roles: ['Admin'],
      role: 'Admin',
      isAdmin: true,
      loading: false,
      error: null,
    });
    assert.equal(bffUser.calls('/me', 'get').length, 1);
  });

  test('sans rôle utilisateur, les rôles de la session sont triés et le nom retombe sur l’email', async () => {
    bffUser.on('get', '/me', {
      body: { ...fixtures.sessionResponse(fixtures.agents.alice, { first_name: ' ', last_name: '', role: '' }), groups: [], roles: [{ id: 9, name: 'Invité' }, 'Maire', { id: 3, name: 'manager' }] },
    });

    const state = await renderSession();

    assert.deepEqual([state.user.name, state.user.service, state.user.phone], ['alice@mairie.test', undefined, undefined]);
    assert.deepEqual([state.roles, state.role, state.isAdmin], [['Responsable', 'Maire', 'Guest'], 'Responsable', false]);
  });

  test('une session sans rôle connu est Guest', async () => {
    bffUser.on('get', '/me', { body: { ...fixtures.sessionResponse(fixtures.agents.alice, { role: 'Stagiaire' }), roles: [] } });

    const state = await renderSession();

    assert.deepEqual([state.roles, state.role], [['Guest'], 'Guest']);
  });

  test('un corps partiel reste exploitable (hors contrat : champs requis absents)', async () => {
    bffUser.on('get', '/me', { body: { user: { name: 'Agent', roles: [{ name: 'user' }], groups: ['Accueil', { name: 7 }] } }, outOfContract: true });

    const state = await renderSession();

    assert.deepEqual([state.user.name, state.user.email, state.groups, state.role], ['Agent', undefined, ['Accueil'], 'User']);
  });

  test('un statut en erreur autre que 401 signale un profil indisponible', async () => {
    bffUser.on('get', '/me', { status: 502, body: { error: { message: 'Core API indisponible' } }, outOfContract: true });

    const state = await renderSession();

    assert.deepEqual([state.loading, state.error, state.user.name], [false, 'Les informations du profil sont indisponibles.', 'Chargement…']);
  });

  test('une réponse illisible signale un service utilisateur indisponible', async () => {
    bffUser.on('get', '/me', { raw: 'not json', contentType: 'text/plain', outOfContract: true });

    const state = await renderSession();

    assert.deepEqual([state.loading, state.error], [false, 'Le service utilisateur est indisponible.']);
  });

  test('un 401 déconnecte via POST /auth/logout puis recharge la page', async () => {
    harness.storage.setItem('mairie360.auth.jwt', 'stale');
    bffUser.on('get', '/me', { status: 401, body: { error: { message: 'Session expirée' } }, outOfContract: true });
    bffUser.on('post', '/auth/logout', { body: { message: 'Déconnecté' } });

    session.useAuthSession();
    for (let attempt = 0; attempt < 200 && harness.location.reloads === 0; attempt += 1) await new Promise((resolve) => setTimeout(resolve, 5));

    assert.equal(harness.location.reloads, 1);
    assert.equal(harness.storage.length, 0);
    assert.equal(bffUser.calls('/auth/logout', 'post').length, 1);
    assert.equal(hookState.value.loading, true);
  });

  test('le démontage annule le chargement sans erreur affichée', async () => {
    bffUser.on('get', '/me', { body: fixtures.sessionResponse() });

    session.useAuthSession();
    hookCleanup();
    await new Promise((resolve) => setTimeout(resolve, 50));

    assert.deepEqual([hookState.value.loading, hookState.value.error], [true, null]);
  });

  test('normalizeAppRole ignore les valeurs non textuelles et inconnues', () => {
    assert.equal(session.normalizeAppRole(42), null);
    assert.equal(session.normalizeAppRole('Chef'), null);
    assert.equal(session.normalizeAppRole(' Role-Mayor '), 'Maire');
    assert.deepEqual(session.resolveAppRoles(['user', { name: 'ADMIN' }]), ['Admin', 'User']);
  });
});
