import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TaskAttributionFields } from './TaskAttributionFields';

const members = [{ value: 'user-1', label: 'Admin Mairie' }, { value: 'user-3', label: 'Marie Durand' }];
const priorities = [{ value: 'all', label: 'Toutes' }, { value: 'high', label: 'Haute' }, { value: 'low', label: 'Basse' }];
const statuses = [{ value: 'todo', label: 'À faire' }, { value: 'done', label: 'Terminé' }];
const form = { title: 'Audit', status: 'todo', priority: 'high', assignees: ['user-3'], labels: [], dueDate: '' };

describe('TaskAttributionFields (MAIR-1137 C12)', () => {
  it('offers the agents with their load, the priorities with their help and the starting column as cards', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn(); const onStatusChange = vi.fn();
    render(<TaskAttributionFields form={form} memberOptions={members} loads={new Map([['user-3', 2]])} priorityOptions={priorities} statusValue="todo" statusOptions={statuses} statusLabel="Colonne de départ" onChange={onChange} onStatusChange={onStatusChange} />);
    const people = screen.getByRole('group', { name: /^Assignée à/ });
    expect(within(people).getByText('2 tâches en cours')).toBeTruthy();
    expect(within(people).getByText('Aucune tâche en cours')).toBeTruthy();
    expect(within(screen.getByRole('group', { name: /^Priorité/ })).queryByRole('radio', { name: /^Toutes/ })).toBeNull();
    expect(screen.getByText('Quand le reste est fait.')).toBeTruthy();
    await user.click(within(people).getByRole('radio', { name: /^Admin Mairie/ }));
    expect(onChange).toHaveBeenCalledWith({ assignees: ['user-1'] });
    await user.click(within(screen.getByRole('group', { name: /^Colonne de départ/ })).getByRole('radio', { name: /^Terminé/ }));
    expect(onStatusChange).toHaveBeenCalledWith('done');
  });
});
