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
});
