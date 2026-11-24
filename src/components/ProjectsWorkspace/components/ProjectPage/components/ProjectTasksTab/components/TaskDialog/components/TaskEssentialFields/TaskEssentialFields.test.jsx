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

  it('MAIR-1198 offers an optional « Description » of 5000 characters at most, line breaks kept', () => {
    const onChange = vi.fn();
    render(<TaskEssentialFields form={{ ...form, description: 'Avant' }} projectDueDate="2026-12-15" labelOptions={[]} onChange={onChange} />);
    const field = screen.getByLabelText(/^Description/);
    expect(field.tagName).toBe('TEXTAREA');
    expect(field.value).toBe('Avant');
    expect(field.getAttribute('maxlength')).toBe('5000');
    expect(field.required).toBe(false);
    expect(field.getAttribute('placeholder')).toBe('Précisions, livrables attendus…');
    fireEvent.change(field, { target: { value: 'Ligne 1\nLigne 2' } });
    expect(onChange).toHaveBeenCalledWith({ description: 'Ligne 1\nLigne 2' });
    fireEvent.change(field, { target: { value: '<b>' } });
    expect(field.validationMessage).toBe('Les caractères < et > ne sont pas autorisés.');
  });
});
