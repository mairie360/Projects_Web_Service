import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TaskEssentialFields } from './TaskEssentialFields';

const form = { title: '', status: 'todo', priority: 'medium', assignees: [], labels: [], dueDate: '' };

describe('TaskEssentialFields (MAIR-1137 C12)', () => {
  it('reports the title and warns about a due date after the project', () => {
    const onChange = vi.fn();
    const { rerender } = render(<TaskEssentialFields form={form} projectDueDate="2026-12-15" labelOptions={[]} titleError="Donnez un titre à la tâche" onChange={onChange} />);
    expect(screen.getByText('Donnez un titre à la tâche')).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/^Titre/), { target: { value: 'Audit' } });
    expect(onChange).toHaveBeenCalledWith({ title: 'Audit' });
    expect(screen.queryByText('Après la fin du projet')).toBeNull();
    rerender(<TaskEssentialFields form={{ ...form, dueDate: '2027-01-10' }} projectDueDate="2026-12-15" labelOptions={[]} onChange={onChange} />);
    expect(screen.getByText('Après la fin du projet')).toBeTruthy();
  });
});
