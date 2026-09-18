const assert = require('node:assert/strict');
const { test, afterEach } = require('node:test');
const { requireTs } = require('./support/typescript.cjs');
const fixtures = require('./support/bff-fixtures.cjs');

// Helpers purs de la page projets (état des formulaires, navigation) : aucun appel réseau.

process.env.PROJECT_FRONT_URL = 'https://projects.example/';
const state = requireTs('src/lib/projectPageState.ts');
const navigation = requireTs('src/lib/navigation.ts');
const { appSidebarItems, getNavigationHref } = requireTs('src/lib/appShell.ts');

afterEach(() => { delete global.window; });

test('valeurs uniques triées en français et options de sélection', () => {
  assert.deepEqual(state.getUniqueValues([' Écoles', 'voirie', 'Voirie', 'ecoles', '', 'voirie ']), ['ecoles', 'Écoles', 'voirie', 'Voirie']);
  assert.deepEqual(state.createSelectOptions(['b', 'a']), [{ label: 'a', value: 'a' }, { label: 'b', value: 'b' }]);
});

test('personnes : identifiant prioritaire et reconstruction depuis une option', () => {
  const options = [{ label: 'Alice Martin', value: '2', avatarUrl: 'https://avatars.example/2.png' }, { label: 'Marie', value: '3', name: 'Marie Durand' }];
  assert.equal(state.getPersonValue({ id: '2', name: 'Alice' }), '2');
  assert.equal(state.getPersonValue({ name: 'Prestataire' }), 'Prestataire');
  assert.deepEqual(state.createPersonFromOptionValue('2', options), { id: '2', name: 'Alice Martin', avatarUrl: 'https://avatars.example/2.png' });
  assert.deepEqual(state.createPersonFromOptionValue('3', options), { id: '3', name: 'Marie Durand', avatarUrl: null });
  assert.deepEqual(state.createPersonFromOptionValue('Externe', options), { name: 'Externe' });
});

test('dates de formulaire et progression', () => {
  assert.equal(state.formatInputDate(new Date(2026, 0, 5)), '2026-01-05');
  assert.equal(state.calculateProjectProgress([]), 0);
  assert.equal(state.calculateProjectProgress([{ completed: true }, { completed: false }, { completed: true }]), 67);
});

test('formulaires vides et formulaire d’édition depuis un projet du BFF', () => {
  assert.deepEqual(state.createProjectFormState(), {
    title: '', description: '', status: 'todo', priority: 'medium', responsible: '', assignees: [], labels: [], dueDate: '',
    progress: 0, totalTasks: 0, completedTasks: 0, taskItems: [],
  });
  assert.equal(state.createProjectFormState('review').status, 'review');

  const project = { ...fixtures.projectListItem({ dueDate: '2026-12-15' }), assignees: [fixtures.people.alice, fixtures.people.marie, fixtures.people.alice] };
  assert.deepEqual(state.createTaskFormState(project), { title: '', status: 'in-progress', priority: 'high', assignees: ['3'], labels: [], dueDate: '2026-12-15' });
  assert.deepEqual(state.createInitialTaskItems(project), []);

  const tasks = [fixtures.projectTask()];
  const form = state.projectToFormState({ ...project, taskItems: tasks });
  assert.deepEqual({ ...form, taskItems: form.taskItems.length }, {
    title: project.title, description: project.description, status: 'in-progress', priority: 'high', responsible: '3',
    assignees: ['2', '3'], labels: ['voirie', 'énergie'], dueDate: '2026-12-15', progress: 50, totalTasks: 2, completedTasks: 1, taskItems: 1,
  });
});

test('navigation : URLs des fronts injectées au build, navigation seulement vers une cible connue', () => {
  assert.equal(getNavigationHref('projects'), 'https://projects.example/');
  assert.equal(navigation.getNavigationHref('profile'), '/profile');
  assert.equal(navigation.getNavigationHref('inconnu'), null);
  assert.ok(appSidebarItems.some((item) => item.id === 'admin' && item.adminOnly));

  const assigned = [];
  global.window = { location: { assign: (href) => assigned.push(href) } };
  navigation.navigateToPage('profile');
  navigation.navigateToPage('inconnu');
  assert.deepEqual(assigned, ['/profile']);
});

test('métadonnées des cartes projet : initiales, dates et numéro affiché', () => {
  const meta = requireTs('src/components/project-card/projectCardMeta.ts');
  assert.deepEqual(Object.keys(meta.statusMeta), ['todo', 'in-progress', 'review', 'done']);
  assert.deepEqual(Object.keys(meta.priorityMeta), ['high', 'medium', 'low']);
  assert.equal(meta.getInitials('marie  anne durand'), 'MA');
  assert.equal(meta.formatProjectDate('2026-12-15'), '15/12/2026');
  assert.equal(meta.formatProjectDate('2026-12-15', false), '15/12');
  assert.equal(meta.getProjectNumber({ id: '42' }), '#42');
  assert.equal(meta.getProjectNumber({ id: 'project-2026-0815' }), '#0815');
  assert.equal(meta.getProjectNumber({ id: 'projet' }), '#1');
});

test('jeton stocké : normalisation, effacement et stockage inaccessible', () => {
  const token = requireTs('src/lib/auth-token.ts');
  assert.equal(token.getStoredAuthorizationHeader(), null);
  token.storeAuthJwtToken('ignoré hors navigateur');
  token.clearStoredAuthJwtToken();

  const values = new Map([['mairie360.projects.jwt', 'legacy']]);
  global.window = { localStorage: { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) } };
  token.storeAuthJwtToken('   ');
  assert.equal(token.getStoredAuthorizationHeader(), 'Bearer legacy');
  assert.equal(token.formatBearerToken('bearer déjà-formaté'), 'bearer déjà-formaté');
  token.clearStoredAuthJwtToken();
  assert.deepEqual([...values], []);

  const denied = () => { throw new Error('SecurityError'); };
  global.window = { localStorage: { getItem: denied, setItem: denied, removeItem: denied } };
  assert.equal(token.getStoredAuthJwtToken(), null);
  assert.doesNotThrow(() => token.storeAuthJwtToken('jeton'));
  assert.doesNotThrow(() => token.clearStoredAuthJwtToken());
});
