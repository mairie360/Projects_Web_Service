const assert = require('node:assert/strict');
const path = require('node:path');
const { describe, test, afterEach } = require('node:test');
const ts = require('typescript');
const policy = require('./support/source-policy.cjs');
const { NextRequest } = require('next/server');
const { requireTs, root } = require('./support/typescript.cjs');
const { analyseNetworkCalls, sourceFiles, parse, visit } = require('./support/network-calls.cjs');
const { discoverRoutes, matchRoute } = require('./support/front-harness.cjs');
const { OpenApiContract } = requireTs('tests/support/openapi-contract.ts');

// Browser business calls stay same-origin under /api/bff, which forwards only the
// published Project contract. Renewal and explicit revocation delegate to Login;
// no frontend calls User directly. Dynamic tests exercise the real shared handlers.

const publishedContract = OpenApiContract.load(path.join(root, 'contracts', 'openapi.json'));
const network = analyseNetworkCalls();
const routes = discoverRoutes();
const CATCH_ALL = 'src/app/api/bff/[...path]/route.ts';
const LEGACY_CATCH_ALL = 'src/app/[...path]/route.ts';
const LOCAL_ROUTES = { 'src/app/api/auth/logout/route.ts': ['POST'] };

/** Modules autorisés à appeler `fetch`, et la seule forme d'appel acceptée dans chacun. */
const FETCH_GATEWAYS = {
  'src/lib/bffProjectClient.ts': { function: 'requestBff', path: '/api/bff{path}', method: 'GET' },
  'src/lib/auth-token.ts': { function: 'logoutAndReload', path: '/api/auth/logout', method: 'POST' },
};

const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });

describe('inventaire des appels réseau de src/', () => {
  test('aucune primitive réseau hors fetch (XMLHttpRequest, WebSocket, EventSource, sendBeacon, clients HTTP)', () => {
    assert.deepEqual(network.forbidden, []);
  });

  test('fetch n’est appelé que depuis les passerelles autorisées', () => {
    const outside = network.fetchCalls.filter((call) => !FETCH_GATEWAYS[call.file]).map((call) => call.location);
    assert.deepEqual(outside, []);
    for (const call of network.fetchCalls) {
      const gateway = FETCH_GATEWAYS[call.file];
      const actual = gateway.path
        ? { function: call.function, path: call.target?.path, method: call.method }
        : { function: call.function, target: call.target?.identifier };
      assert.deepEqual(actual, gateway, call.location);
    }
  });

  test('server routes delegate only to the published shared gateway and Login owner', () => {
    assert.deepEqual(network.forwardCalls, []);
    for (const file of [CATCH_ALL, LEGACY_CATCH_ALL]) {
      assert.equal(requireTs(file).GET, requireTs('src/lib/bff-proxy.ts').proxyBffRequest);
    }
    const calls = [];
    const imports = [];
    for (const file of ['src/lib/bff-proxy.ts', ...Object.keys(LOCAL_ROUTES)]) {
      visit(parse(file), node => {
        if (ts.isImportDeclaration(node)) imports.push([file, node.moduleSpecifier.text]);
        if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && /^(proxyPublishedBffRequest|createSessionLogoutProxy)$/.test(node.expression.text)) calls.push([file, node.expression.text]);
      });
    }
    assert.deepEqual(calls, [['src/lib/bff-proxy.ts', 'proxyPublishedBffRequest'], ['src/app/api/auth/logout/route.ts', 'createSessionLogoutProxy']]);
    assert.equal(imports.filter(([, specifier]) => specifier === '@mairie360/lib-components/next').length, 2);
    assert.deepEqual(routes.map(route => route.file).sort(), [CATCH_ALL, LEGACY_CATCH_ALL, ...Object.keys(LOCAL_ROUTES)].sort());
    for (const [file, methods] of Object.entries(LOCAL_ROUTES)) assert.deepEqual(Object.keys(requireTs(file)).filter(name => /^[A-Z]+$/.test(name)), methods);
  });

  test('chaque appel requestBff correspond à une opération du contrat publié servie par la route catch-all', () => {
    const catchAll = requireTs(CATCH_ALL);
    assert.ok(network.bffCalls.length > 0);
    for (const call of network.bffCalls) {
      assert.ok(call.target && call.method, `${call.location} : chemin ou méthode non analysable statiquement`);
      const match = publishedContract.match(call.method, call.target.path);
      assert.ok(match, `${call.location} : ${call.method} ${call.target.path} absent du contrat publié`);
      assert.equal(matchRoute(routes, '/api/bff' + call.target.path)?.file, CATCH_ALL, `${call.location} doit passer par la route catch-all`);
      assert.equal(typeof catchAll[call.method], 'function', `${call.location} : la route catch-all n'exporte pas ${call.method}`);
      if (call.target.query) assert.ok((match.operation.parameters ?? []).some((parameter) => parameter.in === 'query'), `${call.location} : query sur une opération sans paramètre de query`);
    }
  });

  test('les filtres de ProjectsPageQuery sont exactement les paramètres publiés de GET /projects-page', () => {
    let members;
    visit(parse('src/lib/bffProjectClient.ts'), (node) => {
      if (ts.isTypeAliasDeclaration(node) && node.name.text === 'ProjectsPageQuery') members = node.type.members.map((member) => policy.propertyName(member.name));
    });
    const declared = publishedContract.match('GET', '/projects-page').operation.parameters.filter((parameter) => parameter.in === 'query').map((parameter) => parameter.name);
    assert.deepEqual([...members].sort(), [...declared].sort());
  });

  test('aucune URL de service n’est lue hors du proxy', () => {
    const offenders = [];
    for (const file of sourceFiles().filter((candidate) => candidate !== 'src/lib/bff-proxy.ts')) {
      visit(parse(file), (node) => {
        if (ts.isPropertyAccessExpression(node) && /BFF|_API_/.test(node.name.text) && ts.isPropertyAccessExpression(node.expression) && ts.isIdentifier(node.expression.expression) && node.expression.expression.text === 'process' && node.expression.name.text === 'env') offenders.push(`${file}: ${node.getText()}`);
      });
    }
    assert.deepEqual(offenders, []);
  });
});

describe('route catch-all : exactement le contrat BFF_Project', () => {
  test('chaque couple chemin/méthode publié est relayé, toute autre méthode est refusée sans réseau', async () => {
    const { proxyBffRequest } = requireTs('src/lib/bff-proxy.ts');
    const forwarded = [];
    global.fetch = async (url, init) => { forwarded.push(`${init.method} ${new URL(url).pathname}`); return new Response(null, { status: 204 }); };
    process.env.BFF_PROJECT_BASE_URL = 'http://bff-project.test';

    for (const [template, methods] of Object.entries(publishedContract.document.paths)) {
      const concrete = template.replace(/\{[^}]+\}/g, 'id-1');
      for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
        forwarded.length = 0;
        const request = new NextRequest(`http://projects.test${concrete}`, { method, ...(['GET', 'DELETE'].includes(method) ? {} : { body: '{}' }) });
        const response = await proxyBffRequest(request, { params: Promise.resolve({ path: concrete.split('/').filter(Boolean) }) });
        if (methods[method.toLowerCase()]) {
          assert.deepEqual([response.status, forwarded], [204, [`${method} ${concrete}`]], `${method} ${template}`);
        } else {
          assert.deepEqual([response.status, forwarded], [405, []], `${method} ${template}`);
        }
      }
    }
    delete process.env.BFF_PROJECT_BASE_URL;
  });
});

describe('périmètre du coverage', () => {
  test('tous les modules non UI de src/ sont chargés, donc comptés dans le seuil de 60 %', () => {
    // Les .tsx (pages et composants React) ne sont pas testables sans DOM et restent hors périmètre.
    const modules = sourceFiles().filter((file) => file.endsWith('.ts'));
    for (const file of modules) assert.doesNotThrow(() => requireTs(file), file);
    assert.ok(modules.includes('src/middleware.ts') && modules.includes('src/lib/bffProjectClient.ts'));
  });
});
