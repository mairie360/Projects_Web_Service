import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DetailRefreshAlert } from './DetailRefreshAlert';

describe('DetailRefreshAlert', () => {
  it('explains what stays visible and retries', async () => {
    const onRetry = vi.fn();
    const { rerender } = render(<DetailRefreshAlert error="Lecture refusée" verificationRequired={false} busy={false} retryDisabled={false} onRetry={onRetry} />);
    expect(screen.getByRole('alert').textContent).toContain('Les tâches confirmées restent affichées');
    await userEvent.click(screen.getByRole('button', { name: 'Réessayer la fiche' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    rerender(<DetailRefreshAlert error="Lecture refusée" verificationRequired busy retryDisabled onRetry={onRetry} />);
    expect(screen.getByRole('alert').textContent).toContain('Le dernier projet vérifié reste affiché');
    expect(screen.getByRole('button', { name: 'Actualisation de la fiche…' }).disabled).toBe(true);
  });
});
