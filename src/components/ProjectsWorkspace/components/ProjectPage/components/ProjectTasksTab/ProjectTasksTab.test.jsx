import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import fixtures from '../../../../../../../tests/support/bff-fixtures.cjs';
import { ProjectPage } from '../../ProjectPage';

const page = fixtures.projectsPage();
const todo = fixtures.projectTask({ dueDate: '2026-01-01' });
const other = fixtures.projectTask({ id: 'task-2', title: 'Plan des voiries', priority: 'high', assignees: [fixtures.people.alice], responsible: fixtures.people.alice, dueDate: '2099-01-01' });
const props = (overrides = {}) => ({
  initialTab: 'tasks', project: { ...fixtures.projectListItem(), tasks: { total: 4, completed: 2, active: 2, archived: 2 } }, tasks: [todo, other],
  memberOptions: page.options.members, defaultTaskAssigneeId: 'user-3', labelOptions: page.options.labels, statusOptions: page.filters.statuses,
  priorityOptions: page.filters.priorities, onClose: vi.fn(), onUpdateProject: vi.fn(), onAddTask: vi.fn(), onUpdateTask: vi.fn(),
  onUpdateTaskStatus: vi.fn(async () => true), onDeleteTask: vi.fn(async () => undefined), onCloseProject: vi.fn(), ...overrides,
});
const column = (title) => screen.getByRole('heading', { name: title }).closest('[data-task-column]').getAttribute('data-task-column');
const moveTo = async (user, title, label) => {
  await user.click(screen.getByRole('button', { name: `Actions pour ${title}` }));
  await user.click(screen.getByRole('menuitemradio', { name: label }));
};

describe('ProjectTasksTab (MAIR-859)', () => {
  it('shows the board with « En retard » and the archived done tasks, filters, and switches to the list', async () => {
    const user = userEvent.setup();
    render(<ProjectPage {...props()} />);
    expect(column(todo.title)).toBe('todo');
    expect(within(screen.getByRole('heading', { name: todo.title }).closest('article')).getByText('En retard')).toBeTruthy();
    expect(screen.getByText('+ 2 tâches terminées')).toBeTruthy();
    await user.type(screen.getByRole('searchbox', { name: 'Rechercher une tâche' }), 'voiries');
    expect(screen.queryByRole('heading', { name: todo.title })).toBeNull();
    await user.clear(screen.getByRole('searchbox', { name: 'Rechercher une tâche' }));
    await user.selectOptions(screen.getByRole('combobox', { name: /Priorité/ }), 'high');
    expect(screen.queryByRole('heading', { name: todo.title })).toBeNull();
    expect(screen.getByRole('heading', { name: other.title })).toBeTruthy();
    await user.selectOptions(screen.getByRole('combobox', { name: /Priorité/ }), '');
    await user.selectOptions(screen.getByRole('combobox', { name: /Assignée à/ }), fixtures.people.marie.id);
    expect(screen.getByRole('heading', { name: todo.title })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: other.title })).toBeNull();
    await user.click(screen.getByRole('radio', { name: 'Liste' }));
    expect(screen.getByRole('table', { name: 'Tâches du projet' })).toBeTruthy();
  });

  it('moves a card with the project statuses, keeps it in « Terminé » once archived, and rolls back a refusal', async () => {
    const user = userEvent.setup();
    let resolve;
    const onUpdateTaskStatus = vi.fn(() => new Promise((done) => { resolve = done; }));
    const view = render(<ProjectPage {...props({ onUpdateTaskStatus })} />);
    await moveTo(user, todo.title, 'Terminé');
    expect(onUpdateTaskStatus).toHaveBeenCalledWith('project-1', todo.id, 'done', undefined);
    expect(column(todo.title)).toBe('done');
    await act(async () => resolve(true));
    // The BFF archived it: the detail no longer lists it, the board still shows it struck through.
    view.rerender(<ProjectPage {...props({ onUpdateTaskStatus, tasks: [other] })} />);
    expect(column(todo.title)).toBe('done');
    expect(screen.getByText('+ 1 tâche terminée')).toBeTruthy();
    await moveTo(user, other.title, 'En cours');
    expect(column(other.title)).toBe('in-progress');
    await act(async () => resolve(false));
    expect(column(other.title)).toBe('todo');
  });

  it('adds a task from a column with the current agent, or opens the sheet without one', async () => {
    const user = userEvent.setup();
    const onAddTask = vi.fn(async () => undefined);
    const view = render(<ProjectPage {...props({ onAddTask })} />);
    await user.click(screen.getByRole('button', { name: 'Ajouter dans En cours' }));
    await user.type(screen.getByLabelText('Titre de la nouvelle tâche dans En cours'), 'Consulter les riverains{Enter}');
    expect(onAddTask).toHaveBeenCalledTimes(1);
    expect(onAddTask.mock.calls[0][1]).toMatchObject({ title: 'Consulter les riverains', status: 'in-progress' });
    expect(onAddTask.mock.calls[0][1].responsible.id).toBe('user-3');
    view.unmount();
    render(<ProjectPage {...props({ onAddTask, defaultTaskAssigneeId: null })} />);
    await user.click(screen.getByRole('button', { name: 'Ajouter dans À faire' }));
    await user.type(screen.getByLabelText('Titre de la nouvelle tâche dans À faire'), 'Sans agent{Enter}');
    expect(onAddTask).toHaveBeenCalledTimes(1);
    const sheet = screen.getByRole('dialog', { name: 'Nouvelle tâche' });
    expect(within(sheet).getByLabelText(/^Titre/).value).toBe('Sans agent');
  });

  it('MAIR-1137: deletes a task from the « … » of its page after the confirmation and goes back to the board', async () => {
    const user = userEvent.setup();
    const onDeleteTask = vi.fn(async () => undefined);
    render(<ProjectPage {...props({ onDeleteTask })} />);
    await user.click(screen.getByRole('button', { name: `Ouvrir la tâche ${todo.title}` }));
    expect(screen.getByRole('article', { name: todo.title })).toBeTruthy();
    expect(screen.queryByRole('dialog', { name: 'Modifier la tâche' })).toBeNull();
    await user.click(within(screen.getByRole('article', { name: todo.title })).getByRole('button', { name: `Actions pour ${todo.title}` }));
    await user.click(screen.getByRole('menuitem', { name: 'Supprimer la tâche' }));
    await user.click(screen.getByRole('button', { name: 'Supprimer', exact: true }));
    expect(onDeleteTask).toHaveBeenCalledWith('project-1', todo.id, todo.title);
    expect(screen.queryByRole('article', { name: todo.title })).toBeNull();
  });

  it('MAIR-1137: changes the state from « Modifier », with « Enregistrer (n) » and the « Modifié » section', async () => {
    const user = userEvent.setup();
    const onUpdateTask = vi.fn(async () => undefined);
    render(<ProjectPage {...props({ onUpdateTask })} />);
    await user.click(screen.getByRole('button', { name: `Ouvrir la tâche ${todo.title}` }));
    await user.click(within(screen.getByRole('article', { name: todo.title })).getByRole('button', { name: 'Modifier', exact: true }));
    const dialog = within(screen.getByRole('dialog', { name: 'Modifier la tâche' }));
    expect(dialog.getByRole('button', { name: 'Enregistrer (0)' }).disabled).toBe(true);
    await user.click(within(dialog.getByRole('group', { name: /^État/ })).getByRole('radio', { name: /^Terminé/ }));
    expect(dialog.getByRole('region', { name: 'Attribution' }).textContent).toContain('Modifié');
    await user.click(dialog.getByRole('button', { name: 'Enregistrer (1)' }));
    expect(onUpdateTask.mock.calls[0][2]).toMatchObject({ status: 'done' });
  });
});
