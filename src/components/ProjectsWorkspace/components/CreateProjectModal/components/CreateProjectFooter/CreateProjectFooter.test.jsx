import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CreateProjectFooter, submitLabel } from './CreateProjectFooter';

describe('CreateProjectFooter', () => {
  it('labels the submit for each state and closes', async () => {
    const onClose = vi.fn();
    const { rerender } = render(<CreateProjectFooter editing={false} pending={false} creationConfirmed={false} submitBlocked={false} onClose={onClose} />);
    expect(screen.getByRole('button', { name: 'Créer le projet' }).disabled).toBe(false);
    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    rerender(<CreateProjectFooter editing={false} pending={false} creationConfirmed submitBlocked onClose={onClose} />);
    expect(screen.getByRole('button', { name: 'Fermer' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Création vérifiée' }).disabled).toBe(true);
    expect([submitLabel({ editing: true, pending: false, creationConfirmed: false }), submitLabel({ editing: true, pending: true, creationConfirmed: false })])
      .toEqual(['Enregistrer', 'Enregistrement en cours…']);
  });

  it('MAIR-1136: moves through the creation steps', async () => {
    const onBack = vi.fn();
    const onSkipToRecap = vi.fn();
    const props = { editing: false, pending: false, creationConfirmed: false, submitBlocked: false, onClose: vi.fn(), stepCount: 4, onBack, onSkipToRecap };
    const { rerender } = render(<CreateProjectFooter step={0} {...props} />);
    expect(screen.getByRole('button', { name: 'Suivant' }).type).toBe('submit');
    expect(screen.queryByRole('button', { name: 'Précédent' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Passer au récapitulatif' })).toBeNull();
    rerender(<CreateProjectFooter step={1} canSkipToRecap {...props} />);
    await userEvent.click(screen.getByRole('button', { name: 'Précédent' }));
    await userEvent.click(screen.getByRole('button', { name: 'Passer au récapitulatif' }));
    expect([onBack.mock.calls.length, onSkipToRecap.mock.calls.length]).toEqual([1, 1]);
    rerender(<CreateProjectFooter step={3} canSkipToRecap {...props} />);
    expect(screen.getByRole('button', { name: 'Créer le projet' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Passer au récapitulatif' })).toBeNull();
  });

  it('MAIR-1136: counts the changes and offers the deletion while editing', async () => {
    const onDelete = vi.fn();
    const props = { editing: true, pending: false, creationConfirmed: false, submitBlocked: false, onClose: vi.fn(), onDelete };
    const { rerender } = render(<CreateProjectFooter changeCount={0} {...props} />);
    expect(screen.getByRole('button', { name: 'Enregistrer (0)' }).disabled).toBe(true);
    rerender(<CreateProjectFooter changeCount={2} {...props} />);
    expect(screen.getByRole('button', { name: 'Enregistrer (2)' }).disabled).toBe(false);
    await userEvent.click(screen.getByRole('button', { name: 'Supprimer' }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
