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
    const element = (value) => <CreateProjectModal mode="create" form={value} error="" memberOptions={memberOptions} labelOptions={[]} groupOptions={groups} statusOptions={statusOptions} priorityOptions={priorityOptions} onChange={onChange} onClose={onClose} onSubmit={onSubmit} {...extra} />;
    const view = render(element(form));
    return { ...view, onSubmit, onChange, onClose, update: (value) => view.rerender(element(value)) };
  };

  it('shows the messages under Titre, Groupe and Échéance, focuses Titre and sends nothing', async () => {
    const { onSubmit } = open();
    await userEvent.click(screen.getByRole('button', { name: 'Suivant' }));
    expect(screen.getByText('Étape 1 sur 4 · L’essentiel')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Le titre est obligatoire.')).toBeTruthy();
    expect(screen.getByText('Le groupe est obligatoire.')).toBeTruthy();
    expect(screen.getByText('La date d’échéance est obligatoire.')).toBeTruthy();
    expect(document.activeElement.id).toBe('project-title');
  });

  it('focuses the first field in error in the dialog order and clears a corrected message', async () => {
    const form = { ...createProjectFormState(), title: 'Rénovation du gymnase', groupId: 'group-1', responsible: 'user-1' };
    const { onChange } = open(form);
    await userEvent.click(screen.getByRole('button', { name: 'Suivant' }));
    expect(document.activeElement.id).toBe('project-due-date');
    expect(screen.queryByText('Le titre est obligatoire.')).toBeNull();
    fireEvent.change(document.getElementById('project-due-date'), { target: { value: '2027-06-30' } });
    expect(onChange).toHaveBeenCalled();
    expect(screen.queryByText('La date d’échéance est obligatoire.')).toBeNull();
  });

  it('MAIR-1136: submits a complete form after its four steps, the fields in the C16 order', async () => {
    const form = { ...createProjectFormState(), title: 'Rénovation du gymnase', groupId: 'group-1', dueDate: '2027-06-30', responsible: 'user-1' };
    const { onSubmit } = open(form);
    const order = [...document.querySelectorAll('[id^="project-"]')].map((field) => field.id)
      .filter((id) => ['project-title', 'project-description', 'project-status', 'project-priority', 'project-group', 'project-responsible', 'project-due-date', 'project-assignees', 'project-labels'].includes(id));
    expect([...new Set(order)]).toEqual(['project-title', 'project-description', 'project-group', 'project-due-date', 'project-responsible', 'project-priority', 'project-status', 'project-assignees', 'project-labels']);
    expect(screen.queryByRole('button', { name: 'Créer le projet' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Suivant' }));
    expect(screen.getByText('Étape 2 sur 4 · Organisation')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Suivant' }));
    expect(screen.getByText('Étape 3 sur 4 · Tâches')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Suivant' }));
    expect(screen.getByRole('region', { name: 'L’essentiel' })).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Créer le projet' }));
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('MAIR-1136: Entrée moves to the next step, the recap is reached once « L’essentiel » is valid', async () => {
    const form = { ...createProjectFormState(), title: 'Rénovation du gymnase', groupId: 'group-1', dueDate: '2027-06-30' };
    const { onSubmit } = open(form);
    expect(screen.queryByRole('button', { name: 'Passer au récapitulatif' })).toBeTruthy();
    await userEvent.type(document.getElementById('project-title'), '{Enter}');
    expect(screen.getByText('Étape 2 sur 4 · Organisation')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Précédent' }));
    expect(screen.getByText('Étape 1 sur 4 · L’essentiel')).toBeTruthy();
    // The recap holds the whole form: a missing Responsable sends the agent back to « Organisation ».
    await userEvent.click(screen.getByRole('button', { name: 'Passer au récapitulatif' }));
    expect(screen.getByText('Étape 2 sur 4 · Organisation')).toBeTruthy();
    expect(screen.getByText('Choisissez un responsable ou un membre de l’équipe.')).toBeTruthy();
    expect(document.activeElement.id).toBe('project-responsible');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('MAIR-1136: the step dashes go back freely and forward only past valid steps', async () => {
    open();
    await userEvent.click(screen.getByRole('button', { name: 'Étape 4 sur 4 : Récapitulatif' }));
    expect(screen.getByText('Étape 1 sur 4 · L’essentiel')).toBeTruthy();
    expect(screen.getByText('Le titre est obligatoire.')).toBeTruthy();
  });

  it('MAIR-1136: the recap « Modifier » goes back to its step', async () => {
    const form = { ...createProjectFormState(), title: 'Rénovation du gymnase', groupId: 'group-1', dueDate: '2027-06-30', responsible: 'user-1' };
    open(form);
    await userEvent.click(screen.getByRole('button', { name: 'Passer au récapitulatif' }));
    expect(screen.getByText('Étape 4 sur 4 · Récapitulatif')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Modifier L’essentiel' }));
    expect(screen.getByText('Étape 1 sur 4 · L’essentiel')).toBeTruthy();
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
    const { onSubmit, update } = open(form, { mode: 'edit', groupOptions: [] });
    expect(screen.queryByText('Étape 1 sur 4 · L’essentiel')).toBeNull();
    expect(screen.getByRole('button', { name: 'Enregistrer (0)' }).disabled).toBe(true);
    // The parent writes the changes back into `form`.
    update({ ...form, title: 'Ancien projet rénové' });
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer (1)' }));
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(screen.getByText('Modifié')).toBeTruthy();
  });
});
