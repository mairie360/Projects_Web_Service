const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

// BFF Project refuses a project without a group (`groupId` of POST /projects, 400) and one in a
// group the caller may not link (404). The load test and the GDPR journey create projects against
// the real BFF image, so each creation sends a group that init-test.sql seeds for the test user.

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const loadTest = read('load-test.js');
const seed = read('init-test.sql');

// `group-<id>` of the groups init-test.sql gives the test user (user 2), as owner or member.
const seededGroups = () => {
  const groups = [...seed.matchAll(/INSERT INTO groups \(id, owner_id[^)]*\)\s*VALUES\s*\((\d+),\s*(\d+)/gi)]
    .filter(([, , owner]) => owner === '2')
    .map(([, id]) => id);
  const memberships = [...seed.matchAll(/INSERT INTO group_members \(group_id, user_id\)\s*VALUES\s*\((\d+),\s*2\)/gi)]
    .map(([, id]) => id);
  return new Set([...groups, ...memberships].map((id) => `group-${id}`));
};

test('MAIR-683 init-test.sql seeds a group for the test user', () => {
  assert.ok(seededGroups().size >= 1);
});

test('MAIR-683 every project the load test creates is in a seeded group', () => {
  const creations = loadTest.split('http.post(').slice(1).filter((call) => /^\s*`\$\{BASE_URL\}\/projects`/.test(call));
  assert.ok(creations.length >= 1, 'the load test creates projects');
  for (const call of creations) assert.match(call.split('tags:')[0], /\bgroupId:\s*GROUP_ID\b/);
  const groupId = /const GROUP_ID = __ENV\.PERF_GROUP_ID \|\| '([^']+)'/.exec(loadTest)?.[1];
  assert.ok(seededGroups().has(groupId), `${groupId} is not a group of the test user`);
});

test('MAIR-683 every project the GDPR journey creates is in a seeded group', () => {
  const creations = read('gdpr-journey.yaml')
    .split(/^ {2}- name: /m)
    .slice(1)
    .filter((step) => /method:\s*POST/.test(step) && /path:\s*"?\/projects"?\s*$/m.test(step));
  assert.ok(creations.length >= 1, 'the GDPR journey creates projects');
  for (const step of creations) {
    const groupId = /groupId:\s*"?(group-\d+)"?/.exec(step)?.[1];
    assert.ok(seededGroups().has(groupId), `${step.split('\n')[0]}: ${groupId} is not a group of the test user`);
  }
});
