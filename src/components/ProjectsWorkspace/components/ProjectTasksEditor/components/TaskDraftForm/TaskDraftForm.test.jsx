import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { memberOptions, priorityOptions, statusOptions } from '@tests/component/units/project-fixtures';
import { TaskDraftForm } from './TaskDraftForm';

const form = { title: '', status: 'todo', priority: 'medium', assignees: [], labels: [] };

describe('TaskDraftForm', () => {
  it('reports the title, saves and cancels an edit', async () => {
    const props = { onChange: vi.fn(), onSave: vi.fn(), onCancel: vi.fn() };
    const { rerender } = render(<TaskDraftForm form={form} dueDate="2026-11-03" editing={false} error="" responsible="user-3" memberOptions={memberOptions} labelOptions={[]} statusOptions={statusOptions} priorityOptions={priorityOptions} {...props} />);
    fireEvent.change(screen.getByLabelText('Nouvelle tâche'), { target: { value: 'Relevé' } });
    expect(props.onChange).toHaveBeenCalledWith({ title: 'Relevé' });
    expect(screen.getByText(/le responsable du projet sera assigné/)).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter la tâche' }));
    expect(props.onSave).toHaveBeenCalledTimes(1);
    rerender(<TaskDraftForm form={form} dueDate="2026-11-03" editing error="Le titre de la tâche est obligatoire." responsible="" memberOptions={memberOptions} labelOptions={[]} statusOptions={statusOptions} priorityOptions={priorityOptions} {...props} />);
    expect(screen.getByRole('alert').textContent).toBe('Le titre de la tâche est obligatoire.');
    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(props.onCancel).toHaveBeenCalledTimes(1);
  });
});
