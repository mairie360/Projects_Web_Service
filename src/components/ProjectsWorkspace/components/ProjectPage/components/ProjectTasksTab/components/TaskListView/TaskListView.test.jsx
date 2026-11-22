import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import fixtures from '../../../../../../../../../tests/support/bff-fixtures.cjs';
import { TaskListView } from './TaskListView';

const todo = fixtures.projectTask({ dueDate: '2026-10-01' });
const done = fixtures.projectTask({ id: 'task-2', title: 'Plan validé', status: 'done', dueDate: '' });
const items = [{ task: todo, column: 'todo', archived: false, moving: false }, { task: done, column: 'done', archived: false, moving: false }];

describe('TaskListView (MAIR-859 C6)', () => {
  it('lists the tasks with state, priority, assignee and due date', () => {
    render(<TaskListView items={items} isOverdue={(task) => task.id === 'task-1'} canMove={() => true} onOpenTask={vi.fn()} onMoveTask={vi.fn()} emptyTitle="Aucune tâche" />);
    const table = screen.getByRole('table', { name: 'Tâches du projet' });
    const [, first, second] = within(table).getAllByRole('row');
    expect(within(first).getByText('À faire')).toBeTruthy();
    expect(within(first).getByText('En retard')).toBeTruthy();
    expect(within(first).getByText('Marie Durand')).toBeTruthy();
    expect(within(second).getByText('Sans échéance')).toBeTruthy();
    expect(within(second).getByRole('checkbox', { name: 'Marquer Plan validé comme non terminée' }).checked).toBe(true);
  });

  it('completes or reopens with the checkbox and opens the sheet from the title', async () => {
    const user = userEvent.setup();
    const onMoveTask = vi.fn(); const onOpenTask = vi.fn();
    render(<TaskListView items={items} isOverdue={() => false} canMove={() => true} onOpenTask={onOpenTask} onMoveTask={onMoveTask} emptyTitle="Aucune tâche" />);
    await user.click(screen.getByRole('checkbox', { name: `Marquer ${todo.title} comme terminée` }));
    expect(onMoveTask).toHaveBeenCalledWith(todo, 'done');
    await user.click(screen.getByRole('checkbox', { name: 'Marquer Plan validé comme non terminée' }));
    expect(onMoveTask).toHaveBeenCalledWith(done, 'todo');
    expect(onOpenTask).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: `Ouvrir la tâche ${todo.title}` }));
    expect(onOpenTask).toHaveBeenCalledWith(todo);
  });

  it('disables the checkbox without the right and shows the empty state', () => {
    const { rerender } = render(<TaskListView items={items} isOverdue={() => false} canMove={() => false} onOpenTask={vi.fn()} onMoveTask={vi.fn()} emptyTitle="Aucune tâche" />);
    expect(screen.getAllByRole('checkbox').every((box) => box.disabled)).toBe(true);
    rerender(<TaskListView items={[]} isOverdue={() => false} canMove={() => true} onOpenTask={vi.fn()} onMoveTask={vi.fn()} emptyTitle="Aucune tâche ne correspond aux filtres" />);
    expect(screen.getByText('Aucune tâche ne correspond aux filtres')).toBeTruthy();
  });
});
