import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TaskDeleteConfirm } from './TaskDeleteConfirm';

describe('TaskDeleteConfirm', () => {
  it('cancels or confirms', async () => {
    const onCancel = vi.fn(); const onConfirm = vi.fn();
    render(<TaskDeleteConfirm cancelDisabled={false} confirmDisabled={false} onCancel={onCancel} onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    await userEvent.click(screen.getByRole('button', { name: 'Supprimer' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
