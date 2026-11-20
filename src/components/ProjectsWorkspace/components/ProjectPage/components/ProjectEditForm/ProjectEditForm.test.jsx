import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { memberOptions, priorityOptions, project, statusOptions } from '@tests/component/units/project-fixtures';
import { projectToFormState } from '@/lib/projectPageState';
import { ProjectEditForm } from './ProjectEditForm';

describe('ProjectEditForm', () => {
  it('reports changes, cancels and submits', async () => {
    const props = { onChange: vi.fn(), onCancel: vi.fn(), onSubmit: vi.fn(event => event.preventDefault()) };
    render(<ProjectEditForm form={projectToFormState(project())} saving={false} disabled={false} saveDisabled={false} statusOptions={statusOptions} priorityOptions={priorityOptions} responsibleOptions={[{ label: 'Sélectionner un assigné', value: '' }, ...memberOptions]} memberOptions={memberOptions} labelOptions={[]} {...props} />);
    fireEvent.change(document.getElementById('detail-project-title'), { target: { value: 'Nouveau titre' } });
    expect(props.onChange).toHaveBeenCalledWith({ title: 'Nouveau titre' });
    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(props.onCancel).toHaveBeenCalledTimes(1);
    fireEvent.submit(screen.getByRole('form', { name: 'Modifier le projet' }));
    expect(props.onSubmit).toHaveBeenCalledTimes(1);
  });

  it('lays out the F5 5.6 fields with their messages and never offers to remove a group (MAIR-846)', () => {
    const form = { ...projectToFormState(project()), groupId: 'group-1' };
    render(<ProjectEditForm form={form} saving={false} disabled={false} saveDisabled={false} statusOptions={statusOptions} priorityOptions={priorityOptions} responsibleOptions={memberOptions} memberOptions={memberOptions} labelOptions={[]} groupOptions={[{ value: 'group-1', label: 'Voirie' }]} fieldErrors={{ title: 'Le titre est obligatoire.', dueDate: 'La date d’échéance est obligatoire.' }} onChange={vi.fn()} onCancel={vi.fn()} onSubmit={vi.fn()} />);
    expect([...document.querySelectorAll('[id^="detail-project-"]')].map((field) => field.id).filter((id) => !id.includes('-hint') && !id.includes('-error'))).toEqual(expect.arrayContaining(['detail-project-title', 'detail-project-description', 'detail-project-status', 'detail-project-priority', 'detail-project-group', 'detail-project-responsible', 'detail-project-due-date']));
    expect(screen.getByText('Le titre est obligatoire.')).toBeTruthy();
    expect(screen.getByText('La date d’échéance est obligatoire.')).toBeTruthy();
    expect(screen.getByText('Tous les membres du groupe verront le projet. Seuls vos groupes sont proposés.')).toBeTruthy();
    expect(document.getElementById('detail-project-group').querySelector('option[value=""]')).toBeNull();
    expect(screen.getByLabelText('Responsable')).toBeTruthy();
    expect(screen.getByRole('form', { name: 'Modifier le projet' }).noValidate).toBe(true);
  });
});
