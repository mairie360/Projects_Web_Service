const assert = require('node:assert/strict');
const { test, beforeEach, afterEach } = require('node:test');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { requireTs } = require('./support/typescript.cjs');
const { loadRootLayout } = require('./support/root-layout.cjs');
const fixtures = require('./support/bff-fixtures.cjs');
const bag = {};
const { default: Page } = loadRootLayout(() => requireTs('src/app/page.tsx'), bag);
const originalFetch = global.fetch;
const keys = ['PROJECT_FRONT_URL', 'BFF_PROJECT_BASE_URL', 'LOGIN_FRONT_URL'];
const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
let calls;
beforeEach(() => {
  process.env.PROJECT_FRONT_URL = 'https://projects.mairie.test';
  process.env.BFF_PROJECT_BASE_URL = 'https://project-bff.mairie.test';
  process.env.LOGIN_FRONT_URL = 'https://login.mairie.test';
  for (const key of Object.keys(bag)) delete bag[key];
  bag.accessToken = 'e30.' + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now()/1000) + 600 })).toString('base64url') + '.signature';
  calls = [];
});
afterEach(() => {
  global.fetch = originalFetch;
  for (const [key, value] of Object.entries(previous)) value === undefined ? delete process.env[key] : process.env[key] = value;
});
function transport(body, status = 200) {
  global.fetch = async (url, init) => {
    calls.push({ url: new URL(url), init });
    return Response.json(body, { status, headers: { 'Set-Cookie': 'privateSession=must-not-cross-server-boundary' } });
  };
}
async function initialPage(params = {}) {
  const tree = await Page({ searchParams: Promise.resolve(params) });
  return { tree, html: renderToStaticMarkup(tree) };
}
test('the real server page renders confirmed project data without effects or a browser', async () => {
  const project = fixtures.projectListItem({ title: 'Server confirmed municipal project' });
  transport({ ...fixtures.projectsPage([project]), privateToken: 'must-not-serialize', projects: [{ ...project, refreshToken: 'must-not-serialize' }] });
  const { html, tree } = await initialPage({ view: 'table' });
  assert.match(html, /Server confirmed municipal project/);
  assert.doesNotMatch(JSON.stringify(tree.props), /must-not-serialize|signature|privateSession/);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url.origin, 'https://project-bff.mairie.test');
  assert.equal(calls[0].url.pathname, '/projects-page');
  assert.equal(calls[0].url.searchParams.get('view'), 'table');
  assert.equal(calls[0].init.method, 'GET');
  assert.equal(calls[0].init.cache, 'no-store');
  assert.equal(calls[0].init.headers.get('Authorization'), `Bearer ${bag.accessToken}`);
  assert.equal(calls[0].init.headers.get('Cookie'), null);
});
for (const status of [401, 503]) test(`a server ${status} is explicit and never becomes confirmed project content`, async () => {
  transport({ error: { message: 'Untrusted secret must-not-serialize' } }, status);
  const { html, tree } = await initialPage();
  assert.match(html, /premier chargement des projets est indisponible/);
  assert.doesNotMatch(JSON.stringify(tree.props), /must-not-serialize|signature/);
  assert.equal(calls.length, 1);
});
test('invalid project data is rejected rather than represented as a successful empty page', async () => {
  transport({ ...fixtures.projectsPage([]), projects: 'invalid' });
  const { html } = await initialPage();
  assert.match(html, /premier chargement des projets est indisponible/);
  assert.equal(calls.length, 1);
});
for (const token of [undefined, 'opaque', 'e30.eyJleHAiOjF9.signature']) test(`a missing, opaque or expired access context makes no upstream request: ${token ?? 'missing'}`, async () => {
  bag.accessToken = token;
  transport(fixtures.projectsPage([]));
  const { html } = await initialPage();
  assert.match(html, /premier chargement des projets est indisponible/);
  assert.equal(calls.length, 0);
});
test('invalid public frontend configuration cannot derive an origin or contact the BFF', async () => {
  process.env.PROJECT_FRONT_URL = 'https://user:password@projects.mairie.test';
  transport(fixtures.projectsPage([]));
  const { html } = await initialPage();
  assert.match(html, /premier chargement des projets est indisponible/);
  assert.equal(calls.length, 0);
});

test('the route loading boundary has a persistent status and no animation dependency', () => {
  const Loading = requireTs('src/app/loading.tsx').default;
  const html = renderToStaticMarkup(React.createElement(Loading));
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /role="status"/);
  assert.match(html, /aria-hidden="true"/);
});

test('separate server renders reset the client lifetime with a fresh opaque key', async () => {
  transport(fixtures.projectsPage([]));
  const first = await Page({ searchParams: Promise.resolve({}) });
  const second = await Page({ searchParams: Promise.resolve({}) });
  assert.equal(typeof first.key, 'string');
  assert.notEqual(first.key, second.key);
  assert.doesNotMatch(first.key, /signature|accessToken|refreshToken/);
});

test('a transport failure remains an explicit unavailable receipt without serializing its exception', async () => {
  global.fetch = async () => { throw new Error('transport-private-canary'); };
  const { tree } = await initialPage();
  assert.equal(tree.props.initial.status, 'unavailable');
  assert.doesNotMatch(JSON.stringify(tree.props), /transport-private-canary/);
});

test('a receipt for another project page cannot confirm the requested server page', async () => {
  transport(fixtures.projectsPage());
  const { tree } = await initialPage({ page: '2' });
  assert.equal(tree.props.initial.status, 'unavailable');
  assert.equal(calls[0].url.searchParams.get('page'), '2');
});
