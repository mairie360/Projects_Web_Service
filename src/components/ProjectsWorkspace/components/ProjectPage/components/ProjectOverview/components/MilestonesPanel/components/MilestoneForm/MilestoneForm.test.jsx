import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MilestoneForm } from './MilestoneForm';

describe('MilestoneForm (MAIR-1086)', () => {
  it('starts from the milestone it edits and focuses its title', () => {
    render(<MilestoneForm idPrefix="m" initial={{ title: 'Devis', dueDate: '2026-11-15' }} submitLabel="Enregistrer le jalon" onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByLabelText(/Titre du jalon/).value).toBe('Devis');
    expect(document.activeElement?.id).toBe('m-title');
  });

  it('submits the trimmed title and the day, and cancels', async () => {
    const onSubmit = vi.fn(); const onCancel = vi.fn();
    render(<MilestoneForm idPrefix="m" submitLabel="Ajouter le jalon" onSubmit={onSubmit} onCancel={onCancel} />);
    await userEvent.type(screen.getByLabelText(/Titre du jalon/), '  Réception  ');
    await userEvent.type(screen.getByLabelText(/^Date/), '2027-01-02');
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter le jalon' }));
    expect(onSubmit).toHaveBeenCalledWith({ title: 'Réception', dueDate: '2027-01-02' });
    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
