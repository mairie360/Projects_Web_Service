const assert = require('node:assert/strict');
const path = require('node:path');
const { describe, test, afterEach } = require('node:test');
const ts = require('typescript');
const { NextRequest } = require('next/server');
const { requireTs, root } = require('./support/typescript.cjs');
const { analyseNetworkCalls, sourceFiles, parse, visit } = require('./support/network-calls.cjs');
const { discoverRoutes, matchRoute } = require('./support/front-harness.cjs');
const { OpenApiContract } = requireTs('tests/support/openapi-contract.ts');
const { loadOrvalContract } = requireTs('tests/support/orval-contract.ts');

// Garde statique : tout ce qui, dans `src/`, peut émettre une requête réseau doit passer par un contrat.
// - Navigateur → même origine uniquement : `requestBff` (chemins de contracts/openapi.json, servis par la route
//   catch-all) ou les adaptateurs `/api/*`.
// - Next.js → BFF uniquement via `forwardToBff` : la route catch-all filtre sur contracts/openapi.json et chaque
//   adaptateur `/api/*` cible une opération du contrat BFF User (@mairie360/bff-user-openapi).
// Un nouvel appel qui contourne ces chemins fait échouer ce fichier avant même les tests à mocks.

const bffProjectContract = OpenApiContract.load(path.join(root, 'contracts', 'openapi.json'));
const bffUserContract = loadOrvalContract('@mairie360/bff-user-openapi');
const network = analyseNetworkCalls();
const routes = discoverRoutes();
const CATCH_ALL = 'src/app/[...path]/route.ts';

/** Modules autorisés à appeler `fetch`, et la seule forme d'appel acceptée dans chacun. */
const FETCH_GATEWAYS = {
  'src/lib/bff-proxy.ts': { function: 'forwardToBff', target: 'target' },
  'src/lib/bffProjectClient.ts': { function: 'requestBff', target: 'path' },
  'src/lib/auth-session.ts': { sameOriginApi: true },
};

const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });

describe('inventaire des appels réseau de src/', () => {
  test('aucune primitive réseau hors fetch (XMLHttpRequest, WebSocket, EventSource, sendBeacon, clients HTTP)', () => {
    assert.deepEqual(network.forbidden, []);
  });

  test('fetch n’est appelé que depuis les passerelles contractuelles', () => {
    const outside = network.fetchCalls.filter((call) => !FETCH_GATEWAYS[call.file]).map((call) => call.location);
    assert.deepEqual(outside, []);
    for (const call of network.fetchCalls) {
      const gateway = FETCH_GATEWAYS[call.file];
      if (gateway.sameOriginApi) {
        assert.ok(call.target?.path?.startsWith('/api/') && !call.target.query, `${call.location} doit viser un adaptateur /api/* littéral`);
      } else {
        assert.deepEqual({ function: call.function, target: call.target?.identifier }, { function: gateway.function, target: gateway.target }, call.location);
      }
    }
  });

  test('chaque appel requestBff correspond à une opération de contracts/openapi.json servie par la route catch-all', () => {
    const catchAll = requireTs(CATCH_ALL);
    assert.ok(network.bffCalls.length > 0);
    for (const call of network.bffCalls) {
      assert.ok(call.target && call.method, `${call.location} : chemin ou méthode non analysable statiquement`);
      assert.ok(!call.target.path.startsWith('/api/'), `${call.location} : /api/* est réservé aux adaptateurs de session`);
      const match = bffProjectContract.match(call.method, call.target.path);
      assert.ok(match, `${call.location} : ${call.method} ${call.target.path} absent du contrat BFF_Project`);
      assert.equal(matchRoute(routes, call.target.path)?.file, CATCH_ALL, `${call.location} doit passer par la route catch-all`);
      assert.equal(typeof catchAll[call.method], 'function', `${call.location} : la route catch-all n'exporte pas ${call.method}`);
      if (call.target.query) assert.ok((match.operation.parameters ?? []).some((parameter) => parameter.in === 'query'), `${call.location} : query sur une opération sans paramètre de query`);
    }
  });

  test('les filtres de ProjectsPageQuery sont exactement les paramètres de GET /projects-page', () => {
    let members;
    visit(parse('src/lib/bffProjectClient.ts'), (node) => {
      if (ts.isTypeAliasDeclaration(node) && node.name.text === 'ProjectsPageQuery') members = node.type.members.map((member) => member.name.getText());
    });
    const declared = bffProjectContract.match('GET', '/projects-page').operation.parameters.filter((parameter) => parameter.in === 'query').map((parameter) => parameter.name);
    assert.deepEqual([...members].sort(), [...declared].sort());
  });

  test('chaque fetch same-origin /api/* atteint un adaptateur qui exporte la méthode', () => {
    for (const call of network.fetchCalls.filter((candidate) => candidate.target?.path?.startsWith('/api/'))) {
      const route = matchRoute(routes, call.target.path);
      assert.ok(route && route.file !== CATCH_ALL, `${call.location} : aucun adaptateur pour ${call.target.path}`);
      assert.equal(typeof requireTs(route.file)[call.method], 'function', `${call.location} : ${route.file} n'exporte pas ${call.method}`);
    }
  });

  test('chaque adaptateur /api/* cible une opération du contrat BFF User avec la même méthode', () => {
    const adapters = routes.filter((route) => route.file !== CATCH_ALL);
    assert.deepEqual(adapters.map((route) => route.file).sort(), network.userBffTargets.map((target) => target.file).sort());
    for (const target of network.userBffTargets) {
      assert.ok(target.target && !target.target.query, `${target.location} : cible non littérale`);
      assert.ok(bffUserContract.match(target.method, target.target.path), `${target.location} : ${target.method} ${target.target.path} absent du contrat BFF User`);
      const exported = Object.keys(requireTs(target.file)).filter((name) => /^[A-Z]+$/.test(name));
      assert.deepEqual(exported, [target.method], `${target.file} ne doit exporter que ${target.method}`);
    }
  });

  test('aucune URL de BFF n’est lue par du code navigateur', () => {
    const offenders = [];
    for (const file of sourceFiles().filter((candidate) => !['src/lib/bff-proxy.ts', 'src/lib/user-bff-proxy.ts'].includes(candidate))) {
      visit(parse(file), (node) => {
        if (ts.isPropertyAccessExpression(node) && /BFF|_API_/.test(node.name.text) && node.expression.getText() === 'process.env') offenders.push(`${file}: ${node.getText()}`);
      });
    }
    assert.deepEqual(offenders, []);
  });
});

describe('route catch-all : exactement le contrat BFF_Project', () => {
  test('chaque couple chemin/méthode du contrat est relayé, toute autre méthode est refusée sans réseau', async () => {
    const { proxyBffRequest } = requireTs('src/lib/bff-proxy.ts');
    const forwarded = [];
    global.fetch = async (url, init) => { forwarded.push(`${init.method} ${new URL(url).pathname}`); return new Response(null, { status: 204 }); };
    process.env.BFF_PROJECT_BASE_URL = 'http://bff-project.test';

    for (const [template, operations] of Object.entries(bffProjectContract.document.paths)) {
      const concrete = template.replace(/\{[^}]+\}/g, 'id-1');
      for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
        forwarded.length = 0;
        const request = new NextRequest(`http://projects.test${concrete}`, { method, ...(['GET', 'DELETE'].includes(method) ? {} : { body: '{}' }) });
        const response = await proxyBffRequest(request, { params: Promise.resolve({ path: concrete.split('/').filter(Boolean) }) });
        if (operations[method.toLowerCase()]) {
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
