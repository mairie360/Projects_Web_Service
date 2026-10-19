const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

// ZAP rule 10031 flags a URL parameter value found in any HTML attribute. `?view=` only accepts
// kanban / grid / table, and `grid` is also a Tailwind class present on every page, so that URL alone
// is out of scope for 10031. The rule stays active everywhere else, including any other parameter.
const rules = fs.readFileSync(path.join(__dirname, '..', '.zap', 'rules.tsv'), 'utf8').trim().split('\n').map(line => line.split('\t'));

test('ZAP keeps rule 10031 active and only scopes out the bare view URL', () => {
  assert.equal(rules.some(([id, action]) => id === '10031' && action === 'IGNORE'), false);
  const scoped = rules.filter(([id, action]) => id === '10031' && action === 'OUTOFSCOPE');
  assert.equal(scoped.length, 1);
  const outOfScope = new RegExp(scoped[0][2]);
  for (const url of ['http://projects-front:5001/?view=grid', 'http://projects-front:5001/?view=kanban', 'http://projects-front:5001/?view=table']) assert.match(url, outOfScope);
  for (const url of ['http://projects-front:5001/?view=grid&q=%3Cscript%3E', 'http://projects-front:5001/?q=grid', 'http://projects-front:5001/?view=%22onmouseover', 'http://projects-front:5001/?view=grid#x']) assert.doesNotMatch(url, outOfScope);
});
