import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
const feedback = { feedbackId: 'f', feedbackRef: React.createRef(), pending: false, verificationRequired: false, verificationMessage: 'À vérifier', verificationPending: false, verificationLabel: 'Vérifier le projet', verificationPendingLabel: 'Vérification…', onVerify: vi.fn() };
import { CreateProjectFeedback } from './CreateProjectFeedback';

describe('CreateProjectFeedback', () => {
  it('shows one state at a time', async () => {
    const onVerify = vi.fn();
    const { rerender } = render(<CreateProjectFeedback {...feedback} pending />);
    expect(screen.getByRole('status').textContent).toContain('Enregistrement en cours…');
    rerender(<CreateProjectFeedback {...feedback} verificationRequired verificationError="Lecture refusée" error="ignoré" onVerify={onVerify} />);
    expect(screen.getByRole('alert').textContent).toContain('À vérifierLecture refusée');
    await userEvent.click(screen.getByRole('button', { name: 'Vérifier le projet' }));
    expect(onVerify).toHaveBeenCalledTimes(1);
    rerender(<CreateProjectFeedback {...feedback} confirmedCreationTitle="Projet A" />);
    expect(screen.getByRole('status').textContent).toContain('Création vérifiée : Projet A');
    rerender(<CreateProjectFeedback {...feedback} error="Création refusée" />);
    expect(screen.getByRole('alert').textContent).toContain('Création refusée');
  });
});
