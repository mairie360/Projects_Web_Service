const assert = require('node:assert/strict');
const path = require('node:path');
const { test, before, after, beforeEach, afterEach } = require('node:test');
const { requireTs } = require('./support/typescript.cjs');
const { installReactRuntime, mount } = require('./support/server-view.cjs');

// MAIR-514: the published BFF_Project contract refuses `<` and `>` in every text (`^[^<>]*$`) and bounds a task
// comment to 2 000 characters. The inputs carry those rules as HTML constraints and a BFF 400 is explained per
// refused field.

installReactRuntime();
const React = require('react');
const { createFrontHarness } = require('./support/front-harness.cjs');
const fixtures = require('./support/bff-fixtures.cjs');
const Page = requireTs('src/app/page.tsx').default;
const { BffProjectError } = requireTs('src/lib/bffProjectClient.ts');
const constraints = requireTs('src/lib/text-constraints.ts');
const contract = require(path.join(__dirname, '..', 'contracts', 'openapi.json'));
const harness = createFrontHarness();
let view;
before(() => harness.start());
after(() => harness.stop());
beforeEach(() => { harness.reset(); harness.signIn(fixtures.jwt(fixtures.agents.marie.id)); });
afterEach(() => { view?.unmount(); view = undefined; assert.deepEqual(harness.violations(), []); });

const schemas = contract.components.schemas;
const htmlPattern = (pattern) => new RegExp(`^(?:${pattern})$`, 'v');

test('the HTML pattern and the comment length mirror the published contract', () => {
  for (const [schema, field] of [['CreateProjectBody', 'title'], ['CreateProjectBody', 'description'], ['CreateTaskBody', 'title'], ['TaskCommentBody', 'message']]) {
    const property = schemas[schema].properties[field];
    const browser = htmlPattern(constraints.NO_MARKUP_PATTERN);
    const published = new RegExp(property.pattern);
    for (const sample of ['', 'Réunion de chantier', 'a < b', '<b>x</b>', 'fin >', 'émoji 🚧']) {
      assert.equal(browser.test(sample), published.test(sample), `${schema}.${field} ${JSON.stringify(sample)}`);
    }
  }
  assert.equal(constraints.COMMENT_MAX_LENGTH, schemas.TaskCommentBody.properties.message.maxLength);
});

test('reportMarkupValidity flags < and > on a textarea and clears the flag otherwise', () => {
  const calls = [];
  const target = { value: 'Compte <rendu>', setCustomValidity: (message) => calls.push(message) };
  constraints.reportMarkupValidity(target);
  target.value = 'Compte rendu';
  constraints.reportMarkupValidity(target);
  constraints.reportMarkupValidity({ value: '<' });
  assert.deepEqual(calls, [constraints.NO_MARKUP_HINT, '']);
});

test('a BFF 400 is explained per refused field, other errors keep their message', () => {
  const refused = new BffProjectError('Validation failed', 400, 'BAD_REQUEST', [
    { path: 'body.title', message: 'Must not contain < or >' },
    { path: 'body.taskItems.0.title', message: 'Must not contain < or >' },
    { path: 'body.message', message: 'String must contain at most 2000 character(s)' },
    { path: 'body.description', message: 'String must contain at least 1 character(s)' },
    { path: 'body.responsibleId', message: 'Invalid' },
    { path: 'body', message: 'Unrecognized key' },
    { message: 'Context only' },
    'junk',
  ]);
  assert.equal(constraints.describeBffProjectError(refused, 'fallback'),
    'Vérifiez les champs signalés : Titre : ne doit pas contenir les caractères < ou > ; Tâches › Titre : ne doit pas contenir les caractères < ou > ; Commentaire : 2000 caractères maximum ; Description : ne doit pas être vide ; Responsable : Invalid ; Unrecognized key ; Context only.');
  // Details that only repeat the message point at fields: the specific BFF message stays.
  assert.equal(constraints.describeBffProjectError(new BffProjectError('Titre requis', 400, 'BAD_REQUEST', [{ path: 'title', message: 'Titre requis' }]), 'fallback'), 'Titre requis');
  assert.equal(constraints.describeBffProjectError(new BffProjectError('Validation failed', 400, 'BAD_REQUEST', []), 'fallback'), 'Validation failed');
  assert.equal(constraints.describeBffProjectError(new BffProjectError('Interdit', 403, 'FORBIDDEN', [{ path: 'body.title', message: 'x' }]), 'fallback'), 'Interdit');
  assert.equal(constraints.describeBffProjectError(new Error('  '), 'fallback'), 'fallback');
  assert.equal(constraints.describeBffProjectError('boom', 'fallback'), 'fallback');
});

async function openCreateForm() {
  harness.bffProject.on('get', '/projects-page', { body: fixtures.projectsPage() });
  view = mount(React.createElement(Page));
  await view.waitFor((html) => !html.includes('Chargement des projets'));
  await view.click('Nouveau projet');
}

test('the project form inputs carry the contract constraints with a French hint', async () => {
  await openCreateForm();
  const title = view.hostElements((props) => props.id === 'project-title')[0].props;
  assert.equal(title.pattern, constraints.NO_MARKUP_PATTERN);
  assert.equal(title.title, 'Les caractères < et > ne sont pas autorisés.');
  const description = view.hostElements((props) => props.id === 'project-description')[0];
  assert.equal(description.props.title, constraints.NO_MARKUP_HINT);
  assert.equal(description.props.pattern, undefined, 'a textarea has no pattern attribute');
  const taskTitle = view.hostElements((props, _text, tag) => tag === 'input' && props['aria-label'] === 'Nouvelle tâche')[0].props;
  assert.equal(taskTitle.pattern, constraints.NO_MARKUP_PATTERN);
  assert.equal(taskTitle.title, constraints.NO_MARKUP_HINT);
  assert.match(view.html, /<input id="project-title"[^>]*pattern="\[\^&lt;&gt;\]\*"[^>]*title="Les caractères &lt; et &gt; ne sont pas autorisés\."/);

  // The description textarea reports the rule through the constraint validation API when the browser offers it.
  const validity = [];
  await view.fire((props) => props.id === 'project-description', 'onChange', { target: { value: 'Compte <rendu>', setCustomValidity: (message) => validity.push(message) } });
  assert.deepEqual(validity, [constraints.NO_MARKUP_HINT]);
  assert.equal(view.props('CreateProjectModal').form.description, 'Compte <rendu>');
});

test('a refused creation lists the fields the BFF rejected', async () => {
  await openCreateForm();
  await view.act(() => view.props('CreateProjectModal').onChange({
    title: 'Projet de recette', description: 'Description valide', dueDate: '2026-11-17', responsible: fixtures.people.marie.id,
    assignees: [fixtures.people.marie.id], labels: [], priority: 'high', status: 'review',
    taskItems: [], totalTasks: 0, completedTasks: 0, progress: 0,
  }));
  harness.bffProject.on('post', '/projects', harness.errorReply(400, fixtures.apiError('BAD_REQUEST', 'Validation failed', [
    { path: 'body.title', message: 'Must not contain < or >' },
    { path: 'body.description', message: 'Must not contain < or >' },
  ])));
  await view.act(() => view.props('CreateProjectModal').onSubmit({ preventDefault() {} }));
  const html = await view.waitFor((current) => current.includes('role="alert"'));
  assert.match(html, /role="alert"[^>]*>Vérifiez les champs signalés : Titre : ne doit pas contenir les caractères &lt; ou &gt; ; Description : ne doit pas contenir les caractères &lt; ou &gt;\.</);
  assert.equal(view.find('CreateProjectModal').length, 1, 'the draft stays open for correction');
  assert.deepEqual(harness.bffProject.requests.filter((request) => request.method === 'POST').map((request) => request.template), ['/projects']);
});
