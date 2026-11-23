import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import fixtures from '../../../../../../../../../../../tests/support/bff-fixtures.cjs';
import { TaskCard } from './TaskCard';

const columns = [{ status: 'todo', label: 'À faire' }, { status: 'in-progress', label: 'En cours' }, { status: 'done', label: 'Terminé' }];

describe('TaskCard (MAIR-859)', () => {
  it('shows the title, priority, « En retard », assignee and due date, and opens the task', async () => {
    const onOpen = vi.fn();
    render(<TaskCard task={fixtures.projectTask({ dueDate: '2026-10-01' })} column="todo" columns={columns} overdue onOpen={onOpen} />);
    expect(screen.getByText('En retard')).toBeTruthy();
    expect(screen.getByText('Moyenne')).toBeTruthy();
    expect(screen.getByText('01/10/2026')).toBeTruthy();
    expect(screen.getByTitle('Marie Durand')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Ouvrir la tâche Relevé des candélabres' }));
    expect(onOpen).toHaveBeenCalled();
  });

  it('strikes a done task through and shows an archived one without actions', () => {
    const { rerender } = render(<TaskCard task={fixtures.projectTask({ status: 'done' })} column="done" columns={columns} overdue={false} onOpen={vi.fn()} />);
    expect(screen.getByRole('button', { name: /^Ouvrir la tâche/ }).className).toContain('line-through');
    rerender(<TaskCard task={fixtures.projectTask({ status: 'done' })} column="done" columns={columns} overdue={false} archived onOpen={vi.fn()} />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByRole('heading').className).toContain('line-through');
  });

  it('shows a pending write and its refusal', () => {
    render(<TaskCard task={fixtures.projectTask()} column="todo" columns={columns} overdue={false} pending writeError="Refusé" onOpen={vi.fn()} />);
    expect(screen.getByRole('article').getAttribute('aria-busy')).toBe('true');
    expect(screen.getByRole('status').textContent).toBe('Enregistrement…');
    expect(screen.getByRole('alert').textContent).toBe('Refusé');
  });
});
