import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import fixtures from '../../../../../../../../../tests/support/bff-fixtures.cjs';
import { TaskSheet } from './TaskSheet';

const page = fixtures.projectsPage();
const form = { title: 'Audit', status: 'todo', priority: 'medium', assignees: ['user-3'], labels: [], dueDate: '2026-10-01' };
const collaboration = { taskId: null, collaboration: null, loading: false, saving: false, error: '', message: '', open: vi.fn(), submit: vi.fn(), refresh: vi.fn(), setMessage: vi.fn(), reset: vi.fn() };
const sheet = (props = {}) => render(<TaskSheet open task={null} form={form} saving={false} disabled={false} submitDisabled={false} statusValue="todo"
  statusOptions={page.filters.statuses.filter((option) => option.value !== 'all')} priorityOptions={page.filters.priorities} memberOptions={page.options.members}
  labelOptions={page.options.labels} collaboration={collaboration} onStatusChange={vi.fn()} onChange={vi.fn()} onClose={vi.fn()} onSubmit={vi.fn()} {...props} />);

describe('TaskSheet (MAIR-859 C4, C5)', () => {
  it('is a Drawer « Nouvelle tâche » focused on its required title, without description nor start date', () => {
    sheet({ titleError: 'Donnez un titre à la tâche' });
    expect(screen.getByRole('dialog', { name: 'Nouvelle tâche' })).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByLabelText(/^Titre/));
    expect(screen.getByText('Donnez un titre à la tâche')).toBeTruthy();
    for (const label of ['État', 'Priorité', 'Échéance']) expect(screen.getByLabelText(label, { exact: true })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Options : Assignée à' })).toBeTruthy();
    expect(screen.queryByLabelText(/Description|Début/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Ajouter la tâche' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Supprimer la tâche' })).toBeNull();
  });

  it('edits a task: save, deletion and its follow-up', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    const task = fixtures.projectTask();
    sheet({ task, onDelete });
    expect(screen.getByRole('dialog', { name: 'Modifier la tâche' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Enregistrer la tâche' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Supprimer la tâche' }));
    expect(onDelete).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Suivi et commentaires' }));
    expect(collaboration.open).toHaveBeenCalledWith(task.id);
  });

  it('is read-only without the right to edit the task', () => {
    sheet({ task: fixtures.projectTask({ permissions: { canView: true, canEdit: false, canDelete: false, canUpdateStatus: false, canComment: false } }) });
    expect(screen.getByLabelText(/^Titre/).matches(':disabled')).toBe(true);
    expect(screen.queryByRole('button', { name: 'Enregistrer la tâche' })).toBeNull();
  });
});
