import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TaskRecap } from './TaskRecap';

describe('TaskRecap (MAIR-1137 C12)', () => {
  it('sums the task up and offers « Créer une autre tâche ensuite »', async () => {
    const onContinueChange = vi.fn();
    const form = { title: 'Audit', status: 'todo', priority: 'high', assignees: ['user-1'], labels: ['voirie'], dueDate: '2026-11-17' };
    render(<TaskRecap form={form} memberOptions={[{ value: 'user-1', label: 'Admin Mairie' }]} priorityOptions={[{ value: 'high', label: 'Haute' }]} statusValue="todo" statusOptions={[{ value: 'todo', label: 'À faire' }]} continueAfter={false} onContinueChange={onContinueChange} />);
    for (const text of ['Audit', 'Admin Mairie', 'Haute', 'À faire', 'voirie']) expect(screen.getByText(text)).toBeTruthy();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Créer une autre tâche ensuite' }));
    expect(onContinueChange).toHaveBeenCalledWith(true);
  });

  it('MAIR-1198 shows the description, or « Non renseignée » without one', () => {
    const form = { title: 'Audit', status: 'todo', priority: 'high', assignees: [], labels: [], dueDate: '' };
    const props = { memberOptions: [], priorityOptions: [], statusValue: 'todo', statusOptions: [], continueAfter: false, onContinueChange: vi.fn() };
    const { rerender } = render(<TaskRecap form={{ ...form, description: '' }} {...props} />);
    expect(screen.getByText('Non renseignée')).toBeTruthy();
    rerender(<TaskRecap form={{ ...form, description: 'Trois devis' }} {...props} />);
    expect(screen.getByText('Trois devis')).toBeTruthy();
    expect(screen.queryByText('Non renseignée')).toBeNull();
  });
});
