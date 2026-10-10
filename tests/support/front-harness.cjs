const fs = require('node:fs');
const path = require('node:path');
const { NextRequest } = require('next/server');
const { requireTs, root } = require('./typescript.cjs');
const { createSessionRefreshHandler, createSessionLogoutHandler, forgetUserSession } = require('@mairie360/lib-components/next');
const { ContractMockServer } = requireTs('tests/support/contract-mock-server.ts');
const { OpenApiContract } = requireTs('tests/support/openapi-contract.ts');

// Browser fetch routes to the actual App Router handlers, including the more
// specific /api/bff catch-all. Business traffic reaches only the published Project
// mock. The configured Login origin runs the actual published owner handlers;
// their User transport uses an exact selected published session contract. All
// other origins, routes and contract mismatches remain violations.

const ORIGIN = 'https://projects.mairie.test';
const APP_DIR = path.join(root, 'src', 'app');

function discoverRoutes(dir = APP_DIR, segments = []) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = /^\(.+\)$/.test(entry.name) ? segments : [...segments, entry.name];
      return discoverRoutes(full, nested);
    }
    return entry.name === 'route.ts' ? [{ file: path.relative(root, full), segments }] : [];
  }).sort((a, b) => rank(a) - rank(b) || b.segments.length - a.segments.length);
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
  const bffUser = new ContractMockServer('BFF_USER_SESSION', OpenApiContract.load(path.join(root, 'tests/fixtures/user-session-openapi.json')));
  const mocks = [bffProject, bffUser];
  const LOGIN_ORIGIN = 'https://login.mairie.test';
  const ownerConfig = { userBffUrl: () => bffUser.url, cookieOptions: () => ({ secure: true, domain: '.mairie.test' }), allowedOrigins: () => [ORIGIN, LOGIN_ORIGIN] };
  const ownerRoutes = { '/api/auth/refresh': createSessionRefreshHandler(ownerConfig), '/api/auth/logout': createSessionLogoutHandler(ownerConfig) };
  const ownerCalls = [];
  let ownerOverride;

  const routes = discoverRoutes();
  const originalFetch = global.fetch;
  const upstreams = new Set();
  const exercised = new Set();
  const cookies = new Map();
  const browserCalls = [];
  const forbidden = [];
  const storage = memoryStorage();
  let location = { href: ORIGIN + '/?view=table&q=voirie', reloads: 0, assigned: [], reload() { this.reloads += 1; }, assign(href) { this.assigned.push(href); } };

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
    headers.set('Origin', ORIGIN);
    headers.set('Sec-Fetch-Site', 'same-origin');
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
    if (url.origin === LOGIN_ORIGIN) {
      const handler = ownerRoutes[url.pathname];
      if (!handler || init.method !== 'POST') {
        forbidden.push(`appel Login hors protocole : ${init.method} ${url.pathname}`);
        throw new TypeError('Opération Login refusée');
      }
      ownerCalls.push({ url, init });
      return ownerOverride ? ownerOverride(url, init) : handler(new NextRequest(url, init));
    }
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
    ownerCalls,
    replyFromOwner(handler) { ownerOverride = handler; },
    browserCalls,
    cookies,
    storage,
    get location() { return location; },
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
      for (const call of ownerCalls) {
        const value = new NextRequest(call.url, call.init).cookies.get('refreshToken')?.value;
        if (value) forgetUserSession(bffUser.url, value);
      }
      ownerCalls.length = 0;
      ownerOverride = undefined;
      cookies.clear();
      storage.clear();
      browserCalls.length = 0;
      forbidden.length = 0;
      location = { ...location, href: ORIGIN + '/?view=table&q=voirie', reloads: 0, assigned: [] };
      if (global.window) global.window.location = location;
      location.assigned.length = 0;
      // Le proxy relit son URL à chaque requête : les variables de repli sont neutralisées.
      for (const name of ['PROJECT_BFF_URL', 'NEXT_PUBLIC_BFF_PROJECT_BASE_URL']) delete process.env[name];
      process.env.BFF_PROJECT_BASE_URL = bffProject.url;
      process.env.LOGIN_FRONT_URL = LOGIN_ORIGIN;
      process.env.PROJECT_FRONT_URL = ORIGIN;
      requireTs('src/lib/front-urls.ts').setBrowserFrontUrls({ LOGIN_FRONT_URL: LOGIN_ORIGIN, PROJECT_FRONT_URL: ORIGIN });
    },
    /** Autorise le proxy à joindre une URL supplémentaire (ex. port fermé pour simuler un BFF injoignable). */
    allowUpstream(url) { upstreams.add(new URL(url).origin); },
    signIn(token) { cookies.set('accessToken', token); },
    /**
     * Réponse d'erreur du BFF. Orval ne type que les succès : l'erreur est marquée hors contrat, mais son
     * corps est validé contre le schéma ApiError publié dans le paquet.
     */
    errorReply(status, body) {
      bffProject.contract.validate(bffProject.contract.schema('ApiError'), body, '$error')
        .forEach((error) => forbidden.push(`[BFF_PROJECT] réponse d'erreur ${status} non conforme à ApiError : ${error}`));
      return { status, body, outOfContract: true };
    },
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
