import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { memberOptions, priorityOptions, statusOptions, task } from '@tests/component/units/project-fixtures';
import { TaskFormPanel } from './TaskFormPanel';

const form = { title: '', status: 'todo', priority: 'medium', assignees: [], labels: [], dueDate: '2026-11-03' };

describe('TaskFormPanel', () => {
  it('reports the title and status, submits and cancels an edit', async () => {
    const props = { onStatusChange: vi.fn(), onChange: vi.fn(), onCancelEdit: vi.fn(), onSubmit: vi.fn(event => event.preventDefault()) };
    const { rerender } = render(<TaskFormPanel form={form} editing={false} saving={false} disabled={false} submitDisabled={false} statusValue="todo" statusOptions={statusOptions} priorityOptions={priorityOptions} memberOptions={memberOptions} labelOptions={[]} {...props}><p>notice</p></TaskFormPanel>);
    fireEvent.change(screen.getByLabelText('Titre de la tâche'), { target: { value: 'Relevé' } });
    fireEvent.change(document.getElementById('detail-task-status'), { target: { value: 'done' } });
    expect(props.onChange).toHaveBeenCalledWith({ title: 'Relevé' });
    expect(props.onStatusChange).toHaveBeenCalledWith('done');
    expect(screen.getByText('notice')).toBeTruthy();
    fireEvent.submit(screen.getByRole('button', { name: 'Ajouter la tâche' }).closest('form'));
    expect(props.onSubmit).toHaveBeenCalledTimes(1);
    rerender(<TaskFormPanel form={form} editing saving={false} disabled={false} submitDisabled={false} statusValue="todo" statusOptions={statusOptions} priorityOptions={priorityOptions} memberOptions={memberOptions} labelOptions={[]} {...props} />);
    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(props.onCancelEdit).toHaveBeenCalledTimes(1);
  });
});
