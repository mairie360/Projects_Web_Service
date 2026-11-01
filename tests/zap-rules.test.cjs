const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { requireTs } = require('./support/typescript.cjs');

// ZAP rule 10031 flags a URL parameter value found in any HTML attribute. `view`, `status` and
// `priority` only accept the enums of src/lib/project-page-query.ts (`grid` is also a Tailwind class,
// the filter values are selected options), so the root URL is out of scope for 10031 when its query
// holds nothing else (MAIR-567, run 39332768131). The rule stays active everywhere else.
const rules = fs.readFileSync(path.join(__dirname, '..', '.zap', 'rules.tsv'), 'utf8').trim().split('\n').map(line => line.split('\t'));

test('ZAP keeps rule 10031 active and only scopes out root URLs made of enum filters', () => {
  assert.equal(rules.some(([id, action]) => id === '10031' && action === 'IGNORE'), false);
  const scoped = rules.filter(([id, action]) => id === '10031' && action === 'OUTOFSCOPE');
  assert.equal(scoped.length, 1);
  const outOfScope = new RegExp(scoped[0][2]);
  for (const url of ['http://projects-front:5001/?view=grid', 'http://projects-front:5001/?view=kanban', 'http://projects-front:5001/?view=table',
    'http://projects-front:5001/?view=grid&priority=high&status=todo', 'http://projects-front:5001/?view=grid&priority=high',
    'http://projects-front:5001/?status=in-progress', 'http://projects-front:5001/?priority=all&view=table&status=done']) assert.match(url, outOfScope);
  for (const url of ['http://projects-front:5001/?view=grid&q=%3Cscript%3E', 'http://projects-front:5001/?view=grid&status=%3Cscript%3E', 'http://projects-front:5001/?priority=urgent', 'http://projects-front:5001/?status=todo&page=2', 'http://projects-front:5001/?view=grid&', 'http://projects-front:5001/?status=todo#x', 'http://projects-front:5001/?q=grid', 'http://projects-front:5001/?view=%22onmouseover', 'http://projects-front:5001/?view=grid#x', 'http://projects-front:5001/projects-page?view=grid', 'http://projects-front:5001/projects/1?view=grid']) assert.doesNotMatch(url, outOfScope);
});

test('MAIR-567: the 10031 scope lists exactly the enum values the page accepts', () => {
  const { projectUrlSchema } = requireTs('src/lib/project-page-query.ts');
  const outOfScope = rules.find(([id, action]) => id === '10031' && action === 'OUTOFSCOPE')[2];
  const enumValues = model => [...fs.readFileSync(require.resolve(`@mairie360/bff-project-openapi/model/${model}.ts`), 'utf8')
    .matchAll(/^\s+'?[\w-]+'?: '([\w-]+)',$/gm)].map(match => match[1]);
  const expected = { view: ['kanban', 'grid', 'table'], status: ['all', ...enumValues('projectStatus')], priority: ['all', ...enumValues('projectPriority')] };
  for (const [name, values] of Object.entries(expected)) {
    const listed = outOfScope.match(new RegExp(`${name}=\\(([^)]+)\\)`))[1].split('|');
    assert.deepEqual([...listed].sort(), [...values].sort(), `${name} values in .zap/rules.tsv`);
    for (const value of listed) assert.ok(projectUrlSchema[name].accept(value), `${name}=${value} is accepted by the page`);
    assert.equal(projectUrlSchema[name].accept('<script>'), false);
  }
});
