export const person = (name) => ({ id: name.toLowerCase().replace(/\s/g, '-'), name });
export const task = (overrides = {}) => ({
  id: 'task-1', title: 'Relevé des candélabres', status: 'todo', statusId: 's-todo', responsible: person('Alice Martin'),
  assignees: [person('Alice Martin')], priority: 'medium', labels: ['Voirie'], dueDate: '2026-11-03', completed: false,
  createdAt: '2026-10-01T08:00:00Z', ...overrides,
});
export const project = (overrides = {}) => ({
  id: 'project-1', title: 'Rénovation de l’éclairage public', description: 'Remplacer les lampes par des LED.', status: 'in-progress',
  responsible: person('Marie Durand'), assignees: [person('Marie Durand'), person('Alice Martin')], progress: 40,
  dueDate: '2026-12-15', priority: 'high', labels: ['Énergie'], tasks: { total: 5, completed: 2, active: 3, archived: 0 }, ...overrides,
});
export const statusOptions = [{ label: 'À faire', value: 'todo' }, { label: 'En cours', value: 'in-progress' }, { label: 'Terminé', value: 'done' }];
export const priorityOptions = [{ label: 'Moyenne', value: 'medium' }, { label: 'Haute', value: 'high' }];
export const memberOptions = [{ label: 'Alice Martin', value: 'user-2' }, { label: 'Marie Durand', value: 'user-3' }];
