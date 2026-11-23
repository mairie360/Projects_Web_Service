import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MilestonesPanel, milestoneState } from './MilestonesPanel';

const milestone = (overrides = {}) => ({ id: 'milestone-1', title: 'Validation du devis', dueDate: '2026-11-15', reached: false, ...overrides });
const props = (overrides = {}) => ({
  milestones: [milestone()], total: 1, canManage: true,
  onAdd: vi.fn(async () => true), onUpdate: vi.fn(async () => true), onRemove: vi.fn(async () => true), ...overrides,
});

describe('MilestonesPanel (MAIR-1086)', () => {
  it('reads a milestone as reached, late or to come in the instance day', () => {
    expect(milestoneState(milestone({ reached: true }), '2026-12-01').label).toBe('Atteint');
    expect(milestoneState(milestone(), '2026-12-01')).toEqual({ label: 'En retard', tone: 'danger' });
    expect(milestoneState(milestone(), '2026-11-15').label).toBe('À venir');
  });

  it('shows the milestones without any action for a reader', () => {
    render(<MilestonesPanel {...props({ canManage: false, total: 3 })} />);
    expect(screen.getByText('Validation du devis')).toBeTruthy();
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Ajouter un jalon' })).toBeNull();
    expect(screen.getByText('2 autres jalons, plus lointains.')).toBeTruthy();
  });

  it('says there is no milestone yet', () => {
    render(<MilestonesPanel {...props({ milestones: [], total: 0, canManage: false })} />);
    expect(screen.getByText('Aucun jalon')).toBeTruthy();
  });

  it('adds a milestone after checking its title and date', async () => {
    const value = props({ milestones: [], total: 0 });
    render(<MilestonesPanel {...value} />);
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter un jalon' }));
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter le jalon' }));
    expect(screen.getByText('Donnez un titre au jalon.')).toBeTruthy();
    expect(screen.getByText('Choisissez la date du jalon.')).toBeTruthy();
    expect(value.onAdd).not.toHaveBeenCalled();
    await userEvent.type(screen.getByLabelText(/Titre du jalon/), 'Réception des travaux');
    await userEvent.type(screen.getByLabelText(/^Date/), '2027-03-01');
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter le jalon' }));
    expect(value.onAdd).toHaveBeenCalledWith({ title: 'Réception des travaux', dueDate: '2027-03-01' });
    expect(screen.queryByRole('form', { name: 'Ajouter le jalon' })).toBeNull();
  });

  it('cancels the form with Échap', async () => {
    render(<MilestonesPanel {...props()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter un jalon' }));
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('form', { name: 'Ajouter le jalon' })).toBeNull();
  });

  it('refuses markup in the title', async () => {
    const value = props();
    render(<MilestonesPanel {...value} />);
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter un jalon' }));
    await userEvent.type(screen.getByLabelText(/Titre du jalon/), 'a<b');
    await userEvent.type(screen.getByLabelText(/^Date/), '2027-03-01');
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter le jalon' }));
    expect(screen.getByText('Le titre ne doit pas contenir les caractères < ou >.')).toBeTruthy();
    expect(value.onAdd).not.toHaveBeenCalled();
  });

  it('marks a milestone reached, edits and deletes it after confirmation', async () => {
    const value = props();
    render(<MilestonesPanel {...value} />);
    await userEvent.click(screen.getByRole('checkbox', { name: /Validation du devis/ }));
    expect(value.onUpdate).toHaveBeenCalledWith('milestone-1', { reached: true });

    await userEvent.click(screen.getByRole('button', { name: 'Modifier le jalon Validation du devis' }));
    const title = screen.getByLabelText(/Titre du jalon/);
    await userEvent.clear(title);
    await userEvent.type(title, 'Devis signé');
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer le jalon' }));
    expect(value.onUpdate).toHaveBeenLastCalledWith('milestone-1', { title: 'Devis signé', dueDate: '2026-11-15' });

    await userEvent.click(screen.getByRole('button', { name: 'Supprimer le jalon Validation du devis' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Supprimer' }));
    expect(value.onRemove).toHaveBeenCalledWith('milestone-1');
  });

  it('shows the refusal of the service', () => {
    render(<MilestonesPanel {...props({ error: 'Vous ne pouvez pas modifier ce projet.' })} />);
    expect(screen.getByText('Vous ne pouvez pas modifier ce projet.')).toBeTruthy();
  });
});
