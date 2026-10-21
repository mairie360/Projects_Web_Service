import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PageReadError } from './PageReadError';

describe('PageReadError', () => {
  it('keeps the last data visible and retries unless loading', async () => {
    const onRetry = vi.fn();
    const { rerender } = render(<PageReadError error="Projets indisponibles" stale loading={false} onRetry={onRetry} />);
    expect(screen.getByText(/Dernières données reçues/)).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    rerender(<PageReadError error="Projets indisponibles" stale={false} loading onRetry={onRetry} />);
    expect(screen.getByRole('button', { name: 'Réessayer' }).disabled).toBe(true);
    expect(screen.queryByText(/Dernières données reçues/)).toBeNull();
    expect(screen.getByText('Actualisation des projets...')).toBeTruthy();
  });
});
