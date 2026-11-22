import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import fixtures from '../../../../../../../../../tests/support/bff-fixtures.cjs';
import { TaskBoard } from './TaskBoard';

const columns = [{ status: 'todo', label: 'À faire' }, { status: 'in-progress', label: 'En cours' }, { status: 'done', label: 'Terminé' }];
const todo = fixtures.projectTask();
const done = fixtures.projectTask({ id: 'task-2', title: 'Plan validé', status: 'done' });
const items = [{ task: todo, column: 'todo', archived: false, moving: false }, { task: done, column: 'done', archived: false, moving: false }];

function board(props = {}) {
  const handlers = { onOpenTask: vi.fn(), onMoveTask: vi.fn(), onDeleteTask: vi.fn(), onQuickAdd: vi.fn(async () => true) };
  render(<TaskBoard columns={columns} items={items} isOverdue={() => false} canMove={() => true} canDelete={() => true} blocked={() => false} {...handlers} {...props} />);
  return handlers;
}

// A DataTransfer for jsdom, which has none.
const transfer = () => { const data = {}; return { setData: (type, value) => { data[type] = value; }, getData: (type) => data[type] ?? '', effectAllowed: '', dropEffect: '' }; };

describe('TaskBoard (MAIR-859)', () => {
  it('shows three columns with their counts, cards and the archived done tasks', () => {
    board({ archivedLabel: '+ 2 tâches terminées' });
    const todoColumn = screen.getByRole('region', { name: 'À faire' });
    expect(within(todoColumn).getByRole('heading', { name: todo.title })).toBeTruthy();
    expect(within(todoColumn).getByLabelText('1 tâche')).toBeTruthy();
    expect(within(screen.getByRole('region', { name: 'En cours' })).getByText('Aucune tâche')).toBeTruthy();
    expect(within(screen.getByRole('region', { name: 'Terminé' })).getByText('+ 2 tâches terminées')).toBeTruthy();
  });

  it('moves a card dropped on another column, and only there', () => {
    const { onMoveTask } = board();
    const card = screen.getByRole('group', { name: todo.title });
    const dataTransfer = transfer();
    fireEvent.dragStart(card, { dataTransfer });
    fireEvent.dragOver(screen.getByRole('region', { name: 'À faire' }), { dataTransfer });
    fireEvent.drop(screen.getByRole('region', { name: 'À faire' }), { dataTransfer });
    expect(onMoveTask).not.toHaveBeenCalled();
    fireEvent.dragStart(card, { dataTransfer });
    fireEvent.dragOver(screen.getByRole('region', { name: 'Terminé' }), { dataTransfer });
    fireEvent.drop(screen.getByRole('region', { name: 'Terminé' }), { dataTransfer });
    expect(onMoveTask).toHaveBeenCalledWith(todo, 'done');
  });

  it('refuses a drag without the right to move the task', () => {
    board({ canMove: () => false });
    expect(screen.getByRole('group', { name: todo.title }).getAttribute('draggable')).toBe('false');
  });

  it('adds a task from the « + » of a column with Entrée and cancels with Échap', async () => {
    const user = userEvent.setup();
    const { onQuickAdd } = board();
    await user.click(screen.getByRole('button', { name: 'Ajouter une tâche dans En cours' }));
    const field = screen.getByLabelText('Titre de la nouvelle tâche dans En cours');
    expect(document.activeElement).toBe(field);
    await user.keyboard('{Enter}');
    expect(screen.getByText('Donnez un titre à la tâche')).toBeTruthy();
    await user.type(field, 'Consulter les riverains{Enter}');
    expect(onQuickAdd).toHaveBeenCalledWith('Consulter les riverains', 'in-progress');
    expect(screen.queryByLabelText('Titre de la nouvelle tâche dans En cours')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Ajouter une tâche dans À faire' }));
    await user.keyboard('Brouillon{Escape}');
    expect(screen.queryByLabelText('Titre de la nouvelle tâche dans À faire')).toBeNull();
    expect(onQuickAdd).toHaveBeenCalledTimes(1);
  });

  it('offers no « + » without the right to create a task', () => {
    board({ onQuickAdd: undefined });
    expect(screen.queryByRole('button', { name: /^Ajouter une tâche dans/ })).toBeNull();
  });
});
