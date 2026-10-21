import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LogoutErrorNotice } from './LogoutErrorNotice';

describe('LogoutErrorNotice', () => {
  it('shows the message and returns to Login', async () => {
    const onBackToLogin = vi.fn();
    render(<LogoutErrorNotice message="Déconnexion à vérifier" onBackToLogin={onBackToLogin} />);
    expect(screen.getByText('Déconnexion à vérifier')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Retour à la connexion' }));
    expect(onBackToLogin).toHaveBeenCalledTimes(1);
  });
});
