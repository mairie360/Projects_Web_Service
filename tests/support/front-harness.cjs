const fs = require('node:fs');
const path = require('node:path');
const { NextRequest } = require('next/server');
const { requireTs, root } = require('./typescript.cjs');
const { ContractMockServer } = requireTs('tests/support/contract-mock-server.ts');
const { OpenApiContract } = requireTs('tests/support/openapi-contract.ts');
const { loadOrvalContract } = requireTs('tests/support/orval-contract.ts');

// Harnais « navigateur → Next.js → BFF » sans DOM ni serveur Next :
// - le `fetch` du navigateur (chemins same-origin) est routé vers les vrais fichiers `src/app/**/route.ts`,
//   découverts comme le fait l'App Router (segments statiques avant la route catch-all) ;
// - le `fetch` serveur du proxy n'a le droit de joindre que les mocks déclarés : BFF_Project, piloté par
//   contracts/openapi.json, et BFF User, piloté par le paquet @mairie360/bff-user-openapi installé ;
// - tout autre appel réseau est refusé et relevé comme violation, tout comme les écarts de contrat
//   détectés par les mocks, les paramètres de query non déclarés et le cookie transmis à un BFF.

const ORIGIN = 'http://projects.test';
const APP_DIR = path.join(root, 'src', 'app');

function discoverRoutes(dir = APP_DIR, segments = []) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = /^\(.+\)$/.test(entry.name) ? segments : [...segments, entry.name];
      return discoverRoutes(full, nested);
    }
    return entry.name === 'route.ts' ? [{ file: path.relative(root, full), segments }] : [];
  }).sort((a, b) => rank(a) - rank(b));
}
const rank = (route) => route.segments.filter((segment) => segment.startsWith('[')).length * 10 + (route.segments.some((segment) => segment.startsWith('[...')) ? 100 : 0);

function matchRoute(routes, pathname) {
  const parts = pathname.split('/').filter(Boolean).map(decodeURIComponent);
  return routes.map((route) => {
    const params = {};
    for (const [index, segment] of route.segments.entries()) {
      const catchAll = /^\[\.\.\.(.+)\]$/.exec(segment);
      if (catchAll) return parts.length > index ? { ...route, params: { ...params, [catchAll[1]]: parts.slice(index) } } : undefined;
      if (parts[index] === undefined) return undefined;
      const dynamic = /^\[(.+)\]$/.exec(segment);
      if (dynamic) params[dynamic[1]] = parts[index];
      else if (segment !== parts[index]) return undefined;
    }
    return parts.length === route.segments.length ? { ...route, params } : undefined;
  }).find(Boolean);
}

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => { values.set(key, String(value)); },
    removeItem: (key) => { values.delete(key); },
    clear: () => { values.clear(); },
    get length() { return values.size; },
  };
}

function abortable(promise, signal) {
  if (!signal) return promise;
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(signal.reason);
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then((value) => { signal.removeEventListener('abort', onAbort); resolve(value); }, reject);
  });
}

function createFrontHarness() {
  const bffProject = new ContractMockServer('BFF_PROJECT', OpenApiContract.load(path.join(root, 'contracts', 'openapi.json')));
  const bffUser = new ContractMockServer('BFF_USER', loadOrvalContract('@mairie360/bff-user-openapi'));
  const mocks = [bffProject, bffUser];
  const routes = discoverRoutes();
  const originalFetch = global.fetch;
  const upstreams = new Set();
  const exercised = new Set();
  const cookies = new Map();
  const browserCalls = [];
  const forbidden = [];
  const storage = memoryStorage();
  const location = { reloads: 0, assigned: [], reload() { this.reloads += 1; }, assign(href) { this.assigned.push(href); } };

  function applySetCookie(response) {
    for (const header of response.headers.getSetCookie()) {
      const [pair, ...attributes] = header.split(';');
      const [name, ...value] = pair.split('=');
      const expired = attributes.some((attribute) => /^\s*max-age=0\s*$/i.test(attribute));
      if (expired || value.join('=') === '') cookies.delete(name.trim());
      else cookies.set(name.trim(), value.join('='));
    }
  }

  async function browserFetch(target, init) {
    const { signal } = init;
    if (signal?.aborted) throw signal.reason;
    const method = (init.method ?? 'GET').toUpperCase();
    const url = new URL(target, ORIGIN);
    const headers = new Headers(init.headers);
    if (cookies.size) headers.set('cookie', [...cookies].map(([name, value]) => `${name}=${value}`).join('; '));
    browserCalls.push({ method, path: url.pathname, search: url.search });

    const route = matchRoute(routes, url.pathname);
    const handler = route && requireTs(route.file)[method];
    const pending = !route
      ? Promise.resolve(new Response('Page introuvable', { status: 404 }))
      : !handler
        ? Promise.resolve(new Response(null, { status: 405 }))
        : Promise.resolve(handler(new NextRequest(url, { method, headers, body: init.body }), { params: Promise.resolve(route.params) }));
    const response = await abortable(pending, signal);
    applySetCookie(response);
    return response;
  }

  async function harnessFetch(input, init = {}) {
    if (typeof input === 'string' && input.startsWith('/') && !input.startsWith('//')) return browserFetch(input, init);
    const url = new URL(input instanceof Request ? input.url : String(input), ORIGIN);
    if (upstreams.has(url.origin)) return originalFetch(input, init);
    forbidden.push(`appel réseau hors contrat : ${(init.method ?? 'GET').toUpperCase()} ${url.href}`);
    throw new TypeError(`Appel réseau refusé par le harnais de test : ${url.href}`);
  }

  function recordExercised() {
    for (const request of bffProject.requests) exercised.add(`${request.method} ${request.template}`);
  }

  return {
    bffProject,
    bffUser,
    browserCalls,
    cookies,
    storage,
    location,
    async start() {
      await Promise.all(mocks.map((mock) => mock.start()));
      mocks.forEach((mock) => upstreams.add(new URL(mock.url).origin));
      global.fetch = harnessFetch;
      global.window = { localStorage: storage, location };
      this.reset();
    },
    async stop() {
      global.fetch = originalFetch;
      delete global.window;
      await Promise.all(mocks.map((mock) => mock.stop()));
    },
    reset() {
      recordExercised();
      mocks.forEach((mock) => mock.reset());
      cookies.clear();
      storage.clear();
      browserCalls.length = 0;
      forbidden.length = 0;
      location.reloads = 0;
      location.assigned.length = 0;
      // Les deux proxys relisent leur URL à chaque requête : les variables de repli sont neutralisées.
      for (const name of ['PROJECT_BFF_URL', 'NEXT_PUBLIC_BFF_PROJECT_BASE_URL', 'BFF_USER_API_URL']) delete process.env[name];
      process.env.BFF_PROJECT_BASE_URL = bffProject.url;
      process.env.USER_BFF_URL = bffUser.url;
    },
    /** Autorise le proxy à joindre une URL supplémentaire (ex. port fermé pour simuler un BFF injoignable). */
    allowUpstream(url) { upstreams.add(new URL(url).origin); },
    signIn(token) { cookies.set('accessToken', token); },
    violations() {
      return [
        ...forbidden,
        ...mocks.flatMap((mock) => mock.violations),
        ...mocks.flatMap((mock) => mock.requests
          .filter((request) => request.undeclaredQuery.length > 0)
          .map((request) => `[${mock.service}] query non déclarée ${request.undeclaredQuery.join(', ')} sur ${request.method} ${request.template}`)),
        ...mocks.flatMap((mock) => mock.requests
          .filter((request) => request.headers.cookie !== undefined)
          .map((request) => `[${mock.service}] cookie transmis au BFF sur ${request.method} ${request.template}`)),
      ];
    },
    /** Opérations de BFF_Project effectivement appelées depuis le démarrage du harnais. */
    exercisedOperations() {
      recordExercised();
      return [...exercised].sort();
    },
  };
}

module.exports = { createFrontHarness, discoverRoutes, matchRoute, ORIGIN };
