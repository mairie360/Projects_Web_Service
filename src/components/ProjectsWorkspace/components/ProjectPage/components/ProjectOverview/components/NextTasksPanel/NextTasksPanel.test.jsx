import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { task } from '@tests/component/units/project-fixtures';
import { NextTasksPanel, nextOpenTasks } from './NextTasksPanel';

const tasks = [
  task({ id: 't-late', title: 'Réception des travaux', dueDate: '2026-12-15' }),
  task({ id: 't-soon', title: 'Lancer l’appel d’offres', dueDate: '2026-11-22' }),
  task({ id: 't-done', title: 'Déjà fait', dueDate: '2026-10-01', status: 'done', completed: true }),
  task({ id: 't-none', title: 'Sans date', dueDate: '' }),
  task({ id: 't-mid', title: 'Consulter les riverains', dueDate: '2026-12-04' }),
];

describe('NextTasksPanel (MAIR-846)', () => {
  it('keeps the three open tasks closest to their due date', () => {
    expect(nextOpenTasks(tasks).map((value) => value.id)).toEqual(['t-soon', 't-mid', 't-late']);
  });

  it('checks a task to complete it and opens the tasks tab', async () => {
    const onComplete = vi.fn(); const onShowAll = vi.fn();
    render(<NextTasksPanel tasks={tasks} onComplete={onComplete} onShowAll={onShowAll} />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Lancer l’appel d’offres' }));
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ id: 't-soon' }));
    await userEvent.click(screen.getByRole('button', { name: 'Toutes les tâches' }));
    expect(onShowAll).toHaveBeenCalledTimes(1);
  });

  it('locks a pending task and shows the empty state without open tasks', () => {
    const { rerender } = render(<NextTasksPanel tasks={tasks} pendingTaskIds={new Set(['t-soon'])} onComplete={vi.fn()} onShowAll={vi.fn()} />);
    expect(screen.getByRole('checkbox', { name: 'Lancer l’appel d’offres' }).disabled).toBe(true);
    rerender(<NextTasksPanel tasks={[tasks[2]]} onComplete={vi.fn()} onShowAll={vi.fn()} />);
    expect(screen.getByText('Aucune tâche ouverte')).toBeTruthy();
  });
});
