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
});
