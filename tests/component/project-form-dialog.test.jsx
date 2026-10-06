import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { CreateProjectModal } from '@/components/project/CreateProjectModal';
import { ProjectActionsMenu } from '@/components/project-card/ProjectActionsMenu';
import { createProjectFormState } from '@/lib/projectPageState';

function FormHarness({ mode, onSubmit, fromMenu = false }) {
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState(createProjectFormState);
  return <>
    {fromMenu
      ? <ProjectActionsMenu project={{ title: 'Projet clavier', permissions: { canEdit: true } }} onEdit={() => setOpen(true)} />
      : <button onClick={() => setOpen(true)}>Ouvrir le formulaire</button>}
    {open && <CreateProjectModal mode={mode} form={form} error=""
      memberOptions={[{ value: '2', name: 'Alice Martin', label: 'Alice Martin' }]}
      labelOptions={[]} statusOptions={[{ value: 'todo', label: 'À faire' }]}
      priorityOptions={[{ value: 'medium', label: 'Moyenne' }]}
      onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
      onClose={() => setOpen(false)} onSubmit={onSubmit} />}
    <button>Après le formulaire</button>
  </>;
}

describe('project form dialogs', () => {
  it('keeps an uncertain creation draft and nested task while keyboard catalogue recovery cannot repeat creation', async () => {
    const user = userEvent.setup();
    const onVerify = vi.fn(), onSubmit = vi.fn(), onClose = vi.fn();
    const props = {
      mode: 'create', form: { ...createProjectFormState(), title: 'Création incertaine conservée' }, error: '',
      verificationRequired: true, verificationMessage: 'Identité du nouveau projet non vérifiable.',
      verificationLabel: 'Actualiser le catalogue', verificationPendingLabel: 'Actualisation du catalogue…',
      memberOptions: [], labelOptions: [], statusOptions: [{ value: 'todo', label: 'À faire' }],
      priorityOptions: [{ value: 'medium', label: 'Moyenne' }], onVerify, onChange: vi.fn(), onSubmit, onClose,
    };
    const { rerender } = render(<CreateProjectModal {...props} />);
    const dialog = screen.getByRole('dialog'), form = within(dialog);
    expect(document.activeElement).toBe(form.getByRole('alert'));
    const nested = form.getByPlaceholderText('Ajouter une tâche...');
    await user.type(nested, 'Tâche locale non envoyée');
    expect(form.getByRole('button', { name: 'Créer le projet', exact: true }).disabled).toBe(true);
    expect(form.getByRole('button', { name: 'Créer le projet', exact: true }).className).toContain('!bg-[#a5bca9]');
    const verify = form.getByRole('button', { name: 'Actualiser le catalogue', exact: true });
    verify.focus(); await user.keyboard('{Enter}');
    expect(onVerify).toHaveBeenCalledOnce(); expect(onSubmit).not.toHaveBeenCalled();
    rerender(<CreateProjectModal {...props} verificationPending />);
    expect(form.getByRole('button', { name: 'Actualisation du catalogue…', exact: true }).disabled).toBe(true);
    expect(nested.value).toBe('Tâche locale non envoyée');
    rerender(<CreateProjectModal {...props} verificationError="Lecture du catalogue refusée" />);
    expect(form.getByRole('alert').textContent).toContain('Lecture du catalogue refusée');
    expect(form.getByRole('button', { name: 'Créer le projet', exact: true }).disabled).toBe(true);
    expect(form.getByRole('textbox', { name: 'Titre*', exact: true }).value).toBe('Création incertaine conservée');
    expect(nested.value).toBe('Tâche locale non envoyée');
    const results = await axe(dialog);
    expect(results.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([]);
    await user.keyboard('{Escape}'); expect(onClose).toHaveBeenCalledOnce();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('captures activity in the unsent nested task before it changes the project draft', async () => {
    const user = userEvent.setup();
    const onInteract = vi.fn();
    const onChange = vi.fn();
    render(<CreateProjectModal mode="create" form={createProjectFormState()} error=""
      memberOptions={[]} labelOptions={[]}
      statusOptions={[{ value: 'todo', label: 'À faire' }, { value: 'review', label: 'En revue' }]}
      priorityOptions={[{ value: 'medium', label: 'Moyenne' }]}
      onChange={onChange} onClose={vi.fn()} onSubmit={vi.fn()} onInteract={onInteract} />);
    const title = screen.getByPlaceholderText('Ajouter une tâche...');
    await user.type(title, 'Brouillon local de tâche');
    expect(title.value).toBe('Brouillon local de tâche');
    expect(onInteract).toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
    onInteract.mockClear();
    await user.selectOptions(document.getElementById('project-form-task-status'), 'review');
    expect(onInteract).toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it.each(['create', 'edit'])('contains keyboard focus and protects every nested field during a pending %s write', async (mode) => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onClose = vi.fn();
    const form = { ...createProjectFormState(), title: 'Brouillon visible', description: 'À conserver', dueDate: '2026-11-17' };
    const props = { mode, form, error: '', memberOptions: [], labelOptions: [],
      statusOptions: [{ value: 'todo', label: 'À faire' }], priorityOptions: [{ value: 'medium', label: 'Moyenne' }],
      onChange, onClose, onSubmit: vi.fn() };
    const { rerender } = render(<CreateProjectModal {...props} pending />);
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-busy')).toBe('true');
    expect(document.activeElement).toBe(dialog);
    expect(within(dialog).getByRole('status').id).toBe(dialog.getAttribute('aria-describedby'));
    for (const element of dialog.querySelectorAll('input, textarea, select, button')) expect(element.matches(':disabled')).toBe(true);
    await user.tab();
    expect(document.activeElement).toBe(dialog);
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(dialog);
    await user.keyboard('{Escape}');
    await user.click(within(dialog).getByRole('button', { name: 'Annuler' }));
    await user.type(within(dialog).getByRole('textbox', { name: /Titre/ }), 'modification');
    expect(onClose).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
    const results = await axe(dialog);
    expect(results.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([]);
    rerender(<CreateProjectModal {...props} pending={false} error="Écriture refusée" />);
    expect(dialog.getAttribute('aria-busy')).toBe('false');
    expect(within(dialog).getByRole('alert').id).toBe(dialog.getAttribute('aria-describedby'));
    expect(within(dialog).getByRole('textbox', { name: /Titre/ }).value).toBe('Brouillon visible');
    expect(within(dialog).getByRole('textbox', { name: /Titre/ }).matches(':disabled')).toBe(false);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('returns to the still-present card actions trigger after editing from a dismissed menu', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<FormHarness mode="edit" onSubmit={onSubmit} fromMenu />);
    const opener = screen.getByRole('button', { name: 'Actions pour Projet clavier' });
    await user.click(opener);
    await user.click(screen.getByRole('menuitem', { name: 'Modifier' }));
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('dialog', { name: 'Modifier le projet' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it.each([['create', 'Nouveau projet'], ['edit', 'Modifier le projet']])(
    'names and contains focus in the %s form, closes without saving and restores the opener', async (mode, name) => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<FormHarness mode={mode} onSubmit={onSubmit} />);
      const opener = screen.getByRole('button', { name: 'Ouvrir le formulaire' });
      await user.click(opener);
      const dialog = screen.getByRole('dialog', { name });
      expect(dialog.getAttribute('aria-modal')).toBe('true');
      expect(document.activeElement).toBe(dialog);
      const first = within(dialog).getByRole('button', { name: mode === 'create' ? 'Fermer la création de projet' : 'Fermer la modification de projet' });
      const last = within(dialog).getByRole('button', { name: mode === 'create' ? 'Créer le projet' : 'Enregistrer', exact: true });
      await user.tab({ shift: true });
      expect(document.activeElement).toBe(last);
      await user.tab();
      expect(document.activeElement).toBe(first);
      await user.tab({ shift: true });
      expect(document.activeElement).toBe(last);
      const results = await axe(dialog);
      expect(results.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([]);
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(document.activeElement).toBe(opener);
      expect(onSubmit).not.toHaveBeenCalled();
      await user.click(opener);
      await user.click(screen.getByRole('button', { name: mode === 'create' ? 'Fermer la création de projet' : 'Fermer la modification de projet' }));
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(document.activeElement).toBe(opener);
    }
  );

  it('Escape first closes a nested assignee list and returns focus to its trigger without losing the selected value', async () => {
    const user = userEvent.setup();
    render(<FormHarness mode="create" onSubmit={vi.fn()} />);
    const opener = screen.getByRole('button', { name: 'Ouvrir le formulaire' });
    await user.click(opener);
    const dialog = screen.getByRole('dialog', { name: 'Nouveau projet' });
    const trigger = within(dialog).getAllByRole('button', { name: 'Assignés', exact: true })[0];
    await user.click(trigger);
    await user.click(within(screen.getByRole('listbox', { name: 'Assignés' })).getByRole('option', { name: 'Alice Martin' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(screen.getByRole('dialog')).toBe(dialog);
    expect(document.activeElement).toBe(trigger);
    expect(within(dialog).getByRole('button', { name: 'Retirer Alice Martin' })).toBeTruthy();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
});
