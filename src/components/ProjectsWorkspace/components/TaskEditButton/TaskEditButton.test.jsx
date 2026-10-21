import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TaskEditButton } from './TaskEditButton';

describe('TaskEditButton', () => {
  it('edits on click and can be disabled', async () => {
    const onClick = vi.fn();
    const { rerender } = render(<TaskEditButton onClick={onClick} />);
    await userEvent.click(screen.getByRole('button', { name: 'Modifier' }));
    expect(onClick).toHaveBeenCalledTimes(1);
    rerender(<TaskEditButton onClick={onClick} disabled />);
    expect(screen.getByRole('button', { name: 'Modifier' }).disabled).toBe(true);
  });
});
