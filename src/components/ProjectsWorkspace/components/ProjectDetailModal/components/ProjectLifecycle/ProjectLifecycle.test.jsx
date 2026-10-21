import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProjectLifecycle } from './ProjectLifecycle';

describe('ProjectLifecycle', () => {
  it('suspends or closes the project', async () => {
    const onSuspend = vi.fn(); const onClose = vi.fn();
    render(<ProjectLifecycle disabled={false} onSuspend={onSuspend} onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: 'Suspendre' }));
    await userEvent.click(screen.getByRole('button', { name: 'Clôturer' }));
    expect(onSuspend).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
