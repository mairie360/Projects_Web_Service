import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { changedTaskFields, TaskDialog } from './TaskDialog';

const members = [{ value: 'user-1', label: 'Admin Mairie' }, { value: 'user-3', label: 'Marie Durand' }];
const priorities = [{ value: 'high', label: 'Haute' }, { value: 'medium', label: 'Moyenne' }];
const statuses = [{ value: 'todo', label: 'À faire' }, { value: 'done', label: 'Terminé' }];
const empty = { title: '', status: 'todo', priority: 'medium', assignees: [], labels: [], dueDate: '' };
const base = { open: true, saving: false, disabled: false, submitDisabled: false, projectDueDate: '2026-12-15', statusValue: 'todo', statusOptions: statuses, priorityOptions: priorities, memberOptions: members, labelOptions: [], loads: new Map(), onStatusChange: vi.fn(), onClose: vi.fn() };

describe('TaskDialog (MAIR-1137)', () => {
  it('C12: creates in three steps, refuses an empty title and an absent agent, then « Ajouter et continuer »', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async (event) => { event.preventDefault(); return true; });
    const onChange = vi.fn();
    const { rerender } = render(<TaskDialog {...base} task={null} form={empty} onChange={onChange} onSubmit={onSubmit} />);
    const dialog = within(screen.getByRole('dialog', { name: 'Nouvelle tâche' }));
    await user.click(dialog.getByRole('button', { name: 'Suivant' }));
    expect(dialog.getByText('Donnez un titre à la tâche')).toBeTruthy();
    rerender(<TaskDialog {...base} task={null} form={{ ...empty, title: 'Audit' }} onChange={onChange} onSubmit={onSubmit} />);
    await user.click(dialog.getByRole('button', { name: 'Suivant' }));
    await user.click(dialog.getByRole('button', { name: 'Suivant' }));
    expect(dialog.getByText('Choisissez au moins un agent assigné à cette tâche.')).toBeTruthy();
    rerender(<TaskDialog {...base} task={null} form={{ ...empty, title: 'Audit', assignees: ['user-1'] }} onChange={onChange} onSubmit={onSubmit} />);
    await user.click(dialog.getByRole('button', { name: 'Suivant' }));
    expect(onSubmit).not.toHaveBeenCalled();
    await user.click(dialog.getByRole('checkbox', { name: 'Créer une autre tâche ensuite' }));
    await user.click(dialog.getByRole('button', { name: 'Ajouter et continuer' }));
    expect(onSubmit.mock.calls[0][1]).toEqual({ continueAfter: true });
    // A chain of tasks starts again at « L’essentiel ».
    expect(dialog.getByRole('button', { name: 'Suivant' })).toBeTruthy();
  });

  it('C13: edits on one page with « Modifié », « Enregistrer (n) » and « Supprimer »', async () => {
    const user = userEvent.setup();
    const task = { id: 'task-1', title: 'Audit', status: 'todo', priority: 'medium', responsible: { id: 'user-1', name: 'Admin Mairie' }, assignees: [], labels: [], dueDate: '2026-11-17', permissions: {} };
    const form = { title: 'Audit', status: 'todo', priority: 'medium', assignees: ['user-1'], labels: [], dueDate: '2026-11-17' };
    const onDelete = vi.fn();
    const { rerender } = render(<TaskDialog {...base} task={task} form={form} onChange={vi.fn()} onSubmit={vi.fn()} onDelete={onDelete} />);
    const dialog = within(screen.getByRole('dialog', { name: 'Modifier la tâche' }));
    expect(dialog.queryByRole('button', { name: 'Suivant' })).toBeNull();
    expect(dialog.getByRole('button', { name: 'Enregistrer (0)' }).disabled).toBe(true);
    rerender(<TaskDialog {...base} task={task} form={{ ...form, priority: 'high' }} onChange={vi.fn()} onSubmit={vi.fn()} onDelete={onDelete} />);
    expect(dialog.getByRole('region', { name: 'Attribution' }).textContent).toContain('Modifié');
    expect(dialog.getByRole('region', { name: 'L’essentiel' }).textContent).not.toContain('Modifié');
    expect(dialog.getByRole('button', { name: 'Enregistrer (1)' }).disabled).toBe(false);
    await user.click(dialog.getByRole('button', { name: 'Supprimer' }));
    expect(onDelete).toHaveBeenCalledTimes(1);
    fireEvent.change(dialog.getByLabelText(/^Titre/), { target: { value: 'x' } });
  });

  it('counts the changed fields', () => {
    const initial = { title: 'A', status: 'todo', statusId: 's-1', priority: 'low', assignees: ['u'], labels: [], dueDate: '' };
    expect(changedTaskFields(initial, initial)).toEqual([]);
    expect(changedTaskFields({ ...initial, title: 'B', status: 'done', labels: ['x'] }, initial)).toEqual(['title', 'labels', 'status']);
  });
});
