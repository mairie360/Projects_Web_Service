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

  it('sorts by due date first, then by the clicked header: 1st click ascending, 2nd descending, empty values last (MAIR-1138)', async () => {
    const user = userEvent.setup();
    const low = fixtures.projectTask({ id: 'task-3', title: 'Audit', priority: 'low', status: 'in-progress', dueDate: '2026-09-01', assignees: [], responsible: { name: '' } });
    const high = fixtures.projectTask({ id: 'task-4', title: 'Budget', priority: 'high', dueDate: '2026-12-01' });
    const rows = [
      { task: todo, column: 'todo', archived: false, moving: false },
      { task: done, column: 'done', archived: false, moving: false },
      { task: low, column: 'in-progress', archived: false, moving: false },
      { task: high, column: 'todo', archived: false, moving: false },
    ];
    render(<TaskListView items={rows} isOverdue={() => false} canMove={() => true} onOpenTask={vi.fn()} onMoveTask={vi.fn()} emptyTitle="Aucune tâche" />);
    const titles = () => screen.getAllByRole('button', { name: /^Ouvrir la tâche/ }).map((button) => button.textContent);
    const header = (name) => screen.getByRole('columnheader', { name: new RegExp(name) });
    expect(header('Échéance').getAttribute('aria-sort')).toBe('ascending');
    expect(titles()).toEqual(['Audit', todo.title, 'Budget', 'Plan validé']);
    await user.click(within(header('Échéance')).getByRole('button'));
    expect(header('Échéance').getAttribute('aria-sort')).toBe('descending');
    expect(titles()).toEqual(['Budget', todo.title, 'Audit', 'Plan validé']);
    await user.click(within(header('Priorité')).getByRole('button'));
    expect(header('Priorité').getAttribute('aria-sort')).toBe('ascending');
    expect(header('Échéance').getAttribute('aria-sort')).toBe('none');
    expect(titles()).toEqual(['Budget', todo.title, 'Plan validé', 'Audit']);
    await user.click(within(header('Priorité')).getByRole('button'));
    expect(titles()).toEqual(['Audit', todo.title, 'Plan validé', 'Budget']);
    await user.click(within(header('État')).getByRole('button'));
    expect(titles()).toEqual([todo.title, 'Budget', 'Audit', 'Plan validé']);
    await user.click(within(header('Assignée à')).getByRole('button'));
    expect(titles().at(-1)).toBe('Audit');
    await user.click(within(header('Assignée à')).getByRole('button'));
    expect(titles().at(-1)).toBe('Audit');
  });
});
