import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TaskToolbar } from './TaskToolbar';

describe('TaskToolbar (MAIR-859 C7)', () => {
  it('searches, filters by assignee and priority and switches between Tableau and Liste', async () => {
    const user = userEvent.setup();
    const handlers = { onSearchChange: vi.fn(), onAssigneeChange: vi.fn(), onPriorityChange: vi.fn(), onViewChange: vi.fn() };
    render(<TaskToolbar search="" assignee="" priority="" view="board"
      assigneeOptions={[{ value: 'user-3', label: 'Marie Durand' }]}
      priorityOptions={[{ value: 'all', label: 'Toutes' }, { value: 'high', label: 'Haute' }]} {...handlers} />);
    await user.type(screen.getByRole('searchbox', { name: 'Rechercher une tâche' }), 'a');
    expect(handlers.onSearchChange).toHaveBeenCalledWith('a');
    expect(screen.getByText('Tous les assignés')).toBeTruthy();
    await user.selectOptions(screen.getByRole('combobox', { name: /Assignée à/ }), 'user-3');
    expect(handlers.onAssigneeChange).toHaveBeenCalledWith('user-3');
    await user.selectOptions(screen.getByRole('combobox', { name: /Priorité/ }), 'high');
    expect(handlers.onPriorityChange).toHaveBeenCalledWith('high');
    expect(screen.queryByRole('option', { name: 'Toutes' })).toBeNull();
    await user.click(screen.getByRole('radio', { name: 'Liste' }));
    expect(handlers.onViewChange).toHaveBeenCalledWith('list');
  });
});
