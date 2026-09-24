const assert = require('node:assert/strict');
const { afterEach, test } = require('node:test');
const { NextRequest } = require('next/server');
const { requireTs } = require('./support/typescript.cjs');

const { middleware } = requireTs('src/middleware.ts');
const previous = {
  LOGIN_FRONT_URL: process.env.LOGIN_FRONT_URL,
  PROJECT_FRONT_URL: process.env.PROJECT_FRONT_URL,
};

afterEach(() => {
  for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

test('an unauthenticated visit returns to the public Projects URL, not the ingress host', () => {
  process.env.LOGIN_FRONT_URL = 'https://login.mairie.test/';
  process.env.PROJECT_FRONT_URL = 'https://projects.mairie.test/';

  const response = middleware(new NextRequest('http://internal:3000/projects/42?view=board'));
  const login = new URL(response.headers.get('location'));

  assert.equal(response.status, 307);
  assert.equal(login.origin, 'https://login.mairie.test');
  assert.equal(login.searchParams.get('redirect'), 'https://projects.mairie.test/projects/42?view=board');
  assert.doesNotMatch(login.href, /internal:3000/);
});
