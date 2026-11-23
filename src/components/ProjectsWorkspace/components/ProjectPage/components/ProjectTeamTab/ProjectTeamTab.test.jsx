import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { memberLoad, ProjectTeamTab } from './ProjectTeamTab';

const members = [
  { id: 'user-3', name: 'Marie Durand', avatarUrl: null, role: 'manager', load: { tasksOpen: 1, tasksTotal: 4 } },
  { id: 'user-2', name: 'Alice Martin', avatarUrl: null, role: 'contributor', load: { tasksOpen: 0, tasksTotal: 0 } },
];
const memberOptions = [{ label: 'Marie Durand', value: 'user-3', name: 'Marie Durand' }, { label: 'Alice Martin', value: 'user-2', name: 'Alice Martin' }, { label: 'Admin Mairie', value: 'user-1', name: 'Admin Mairie' }];
const props = (overrides = {}) => ({
  members, ownerId: 'user-3', canManage: true, memberOptions, pendingId: null,
  onAdd: vi.fn(async () => true), onChangeRole: vi.fn(async () => true), onRemove: vi.fn(async () => true), ...overrides,
});

describe('ProjectTeamTab (MAIR-874, MAIR-1088)', () => {
  it('counts the tasks a member finished', () => {
    expect(memberLoad(members[0])).toEqual({ done: 3, total: 4, percent: 75, label: '3 tâches terminées sur 4' });
    expect(memberLoad(members[1]).label).toBe('Aucune tâche');
    expect(memberLoad({ load: { tasksOpen: 0, tasksTotal: 1 } }).label).toBe('1 tâche terminée sur 1');
  });

  it('lists the members, their role and load, without any action for a reader', () => {
    render(<ProjectTeamTab {...props({ canManage: false })} />);
    const list = screen.getByRole('list', { name: 'Membres du projet' });
    expect(within(list).getByText('Responsable du projet')).toBeTruthy();
    expect(within(list).getByText('Contributeur')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Retirer/ })).toBeNull();
    expect(screen.queryByRole('form', { name: 'Ajouter un membre' })).toBeNull();
  });

  it('keeps the owner and lets a manager change a role, remove a member and add an agent', async () => {
    const value = props();
    render(<ProjectTeamTab {...value} />);
    expect(screen.queryByRole('button', { name: 'Retirer Marie Durand de l’équipe' })).toBeNull();
    expect(screen.queryByLabelText('Rôle de Marie Durand')).toBeNull();

    await userEvent.selectOptions(screen.getByLabelText('Rôle de Alice Martin'), 'reader');
    expect(value.onChangeRole).toHaveBeenCalledWith('user-2', 'reader');

    await userEvent.click(screen.getByRole('button', { name: 'Retirer Alice Martin de l’équipe' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Retirer' }));
    expect(value.onRemove).toHaveBeenCalledWith('user-2');

    const form = screen.getByRole('form', { name: 'Ajouter un membre' });
    expect(within(form).getAllByRole('option').map((option) => option.textContent)).toContain('Admin Mairie');
    expect(within(form).getAllByRole('option').map((option) => option.textContent)).not.toContain('Alice Martin');
    await userEvent.click(within(form).getByRole('button', { name: 'Ajouter' }));
    expect(screen.getByText('Choisissez l’agent à ajouter.')).toBeTruthy();
    await userEvent.selectOptions(within(form).getByLabelText(/^Agent/), 'user-1');
    await userEvent.selectOptions(within(form).getByLabelText(/^Rôle/), 'manager');
    await userEvent.click(within(form).getByRole('button', { name: 'Ajouter' }));
    expect(value.onAdd).toHaveBeenCalledWith('user-1', 'manager', 'Admin Mairie');
  });

  it('shows the notice, the refusal and the empty team', () => {
    const { rerender } = render(<ProjectTeamTab {...props({ notice: 'Alice Martin a rejoint l’équipe.', error: 'Le responsable du projet reste.' })} />);
    expect(screen.getByRole('status').textContent).toBe('Alice Martin a rejoint l’équipe.');
    expect(screen.getByText('Le responsable du projet reste.')).toBeTruthy();
    rerender(<ProjectTeamTab {...props({ members: [], canManage: false })} />);
    expect(screen.getByText('Aucun membre')).toBeTruthy();
  });
});
