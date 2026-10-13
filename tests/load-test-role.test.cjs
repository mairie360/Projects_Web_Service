const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

// MAIR-553: BFF Project trusts the `role` claim of the token (MAIR-529). The k6 script signs its own
// token, so that role must be one init-test.sql gives the test user and one allowed to create projects,
// or every POST /projects of the load test answers 403.

const root = path.join(__dirname, '..');
const loadTest = fs.readFileSync(path.join(root, 'load-test.js'), 'utf8');
const seed = fs.readFileSync(path.join(root, 'init-test.sql'), 'utf8');

const PROJECT_CREATORS = ['responsable', 'maire', 'admin'];

test('MAIR-553: the k6 token carries a seeded role that may create projects', () => {
  const signed = [...loadTest.matchAll(/\brole:\s*'([^']+)'/g)].map((match) => match[1]);
  assert.equal(signed.length, 1, 'load-test.js must sign exactly one role claim');
  const role = signed[0].toLowerCase();

  const seeded = /WHERE\s+lower\(r\.name\)\s+IN\s*\(([^)]*)\)/i.exec(seed);
  assert.ok(seeded, 'init-test.sql must give the test user its roles by name');
  const seededRoles = [...seeded[1].matchAll(/'([^']+)'/g)].map((match) => match[1].toLowerCase());

  assert.ok(seededRoles.includes(role), `role "${signed[0]}" is not seeded for the test user (${seededRoles.join(', ')})`);
  assert.ok(PROJECT_CREATORS.includes(role), `role "${signed[0]}" cannot create projects`);
});
