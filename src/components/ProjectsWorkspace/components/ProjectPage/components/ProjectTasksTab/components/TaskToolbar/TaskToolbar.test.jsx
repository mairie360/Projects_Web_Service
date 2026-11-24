import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TaskToolbar } from './TaskToolbar';

const statusAndDue = {
  status: '', due: '', active: false,
  statusOptions: [{ value: 'todo', label: 'À faire' }, { value: 'in-progress', label: 'En cours' }, { value: 'done', label: 'Terminé' }],
  dueOptions: [{ value: 'overdue', label: 'En retard' }, { value: 'this-month', label: 'Ce mois-ci' }, { value: 'later', label: 'Plus tard' }, { value: 'none', label: 'Sans échéance' }],
};
const filterHandlers = () => ({ onStatusChange: vi.fn(), onDueChange: vi.fn(), onReset: vi.fn() });

describe('TaskToolbar (MAIR-859 C7)', () => {
  it('searches, filters by assignee and priority and switches between Tableau and Liste', async () => {
    const user = userEvent.setup();
    const handlers = { onSearchChange: vi.fn(), onAssigneeChange: vi.fn(), onPriorityChange: vi.fn(), onViewChange: vi.fn(), ...filterHandlers() };
    render(<TaskToolbar search="" assignee="" priority="" view="board" {...statusAndDue}
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

  it('MAIR-1178: filters by status and due date, and offers « Réinitialiser les filtres » only while a filter is set', async () => {
    const user = userEvent.setup();
    const handlers = { onSearchChange: vi.fn(), onAssigneeChange: vi.fn(), onPriorityChange: vi.fn(), onViewChange: vi.fn(), ...filterHandlers() };
    const props = { search: '', assignee: '', priority: '', view: 'board', assigneeOptions: [], priorityOptions: [], ...statusAndDue, ...handlers };
    const { rerender } = render(<TaskToolbar {...props} />);
    expect(screen.getByText('Tous les statuts')).toBeTruthy();
    expect(screen.getByText('Toutes les échéances')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Réinitialiser les filtres' })).toBeNull();
    await user.selectOptions(screen.getByRole('combobox', { name: /Statut/ }), 'in-progress');
    expect(handlers.onStatusChange).toHaveBeenCalledWith('in-progress');
    await user.selectOptions(screen.getByRole('combobox', { name: /Échéance/ }), 'overdue');
    expect(handlers.onDueChange).toHaveBeenCalledWith('overdue');

    rerender(<TaskToolbar {...props} status="in-progress" due="overdue" active />);
    await user.click(screen.getByRole('button', { name: 'Réinitialiser les filtres' }));
    expect(handlers.onReset).toHaveBeenCalledTimes(1);
  });
});
