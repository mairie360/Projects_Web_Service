import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { memberOptions, priorityOptions, statusOptions } from '@tests/component/units/project-fixtures';
import { createProjectFormState } from '@/lib/projectPageState';
import { CreateProjectModal } from './CreateProjectModal';

describe('CreateProjectModal', () => {
  it('opens as a dialog and closes from its header', async () => {
    const onClose = vi.fn();
    render(<CreateProjectModal mode="create" form={createProjectFormState()} error="" memberOptions={memberOptions} labelOptions={[]} statusOptions={statusOptions} priorityOptions={priorityOptions} onChange={vi.fn()} onClose={onClose} onSubmit={vi.fn()} />);
    expect(screen.getByRole('dialog', { name: 'Nouveau projet' })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Fermer la création de projet' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('CreateProjectModal V2 (MAIR-836)', () => {
  const groups = [{ value: 'group-1', label: 'Voirie' }, { value: 'group-2', label: 'Bâtiments' }];
  const open = (form = createProjectFormState(), extra = {}) => {
    const onSubmit = vi.fn((event) => event.preventDefault()), onChange = vi.fn(), onClose = vi.fn();
    const view = render(<CreateProjectModal mode="create" form={form} error="" memberOptions={memberOptions} labelOptions={[]} groupOptions={groups} statusOptions={statusOptions} priorityOptions={priorityOptions} onChange={onChange} onClose={onClose} onSubmit={onSubmit} {...extra} />);
    return { ...view, onSubmit, onChange, onClose };
  };

  it('shows the messages under Titre, Groupe and Échéance, focuses Titre and sends nothing', async () => {
    const { onSubmit } = open();
    await userEvent.click(screen.getByRole('button', { name: 'Créer le projet' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Le titre est obligatoire.')).toBeTruthy();
    expect(screen.getByText('Le groupe est obligatoire.')).toBeTruthy();
    expect(screen.getByText('La date d’échéance est obligatoire.')).toBeTruthy();
    expect(document.activeElement.id).toBe('project-title');
  });

  it('focuses the first field in error in the dialog order and clears a corrected message', async () => {
    const form = { ...createProjectFormState(), title: 'Rénovation du gymnase', groupId: 'group-1', responsible: 'user-1' };
    const { onChange } = open(form);
    await userEvent.click(screen.getByRole('button', { name: 'Créer le projet' }));
    expect(document.activeElement.id).toBe('project-due-date');
    expect(screen.queryByText('Le titre est obligatoire.')).toBeNull();
    fireEvent.change(document.getElementById('project-due-date'), { target: { value: '2027-06-30' } });
    expect(onChange).toHaveBeenCalled();
    expect(screen.queryByText('La date d’échéance est obligatoire.')).toBeNull();
  });

  it('submits a complete form and its fields come in the F3 order', async () => {
    const form = { ...createProjectFormState(), title: 'Rénovation du gymnase', groupId: 'group-1', dueDate: '2027-06-30', responsible: 'user-1' };
    const { onSubmit } = open(form);
    const order = [...document.querySelectorAll('[id^="project-"]')].map((field) => field.id)
      .filter((id) => ['project-title', 'project-description', 'project-status', 'project-priority', 'project-group', 'project-responsible', 'project-due-date', 'project-assignees', 'project-labels'].includes(id));
    expect([...new Set(order)]).toEqual(['project-title', 'project-description', 'project-status', 'project-priority', 'project-group', 'project-responsible', 'project-due-date', 'project-assignees', 'project-labels']);
    await userEvent.click(screen.getByRole('button', { name: 'Créer le projet' }));
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('closes on Échap or « Annuler » without submitting', async () => {
    const { onClose, onSubmit } = open();
    await userEvent.keyboard('{Escape}');
    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('does not require a group to edit a project created before groups', async () => {
    const form = { ...createProjectFormState(), title: 'Ancien projet', dueDate: '2027-01-01', responsible: 'user-1' };
    const { onSubmit } = open(form, { mode: 'edit', groupOptions: [] });
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(onSubmit).toHaveBeenCalledOnce();
  });
});
