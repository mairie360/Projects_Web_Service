import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { VerificationNotice } from './VerificationNotice';

describe('VerificationNotice', () => {
  it('verifies on demand and disables the action while pending', async () => {
    const onVerify = vi.fn();
    const { rerender } = render(<VerificationNotice title="Projet A" message="À vérifier" error="Lecture refusée" pending={false} label="Vérifier le projet Projet A" pendingLabel="Vérification…" onVerify={onVerify} />);
    expect(screen.getByText('Lecture refusée')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Vérifier le projet Projet A' }));
    expect(onVerify).toHaveBeenCalledTimes(1);
    rerender(<VerificationNotice title="Projet A" message="À vérifier" pending label="Vérifier" pendingLabel="Vérification du projet…" onVerify={onVerify} />);
    expect(screen.getByRole('button', { name: 'Vérification du projet…' }).disabled).toBe(true);
  });
});
