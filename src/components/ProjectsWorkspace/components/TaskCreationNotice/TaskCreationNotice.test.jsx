import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TaskCreationNotice } from './TaskCreationNotice';

describe('TaskCreationNotice', () => {
  it('renders nothing without an uncertain creation and announces one', () => {
    const { container, rerender } = render(<TaskCreationNotice />);
    expect(container.innerHTML).toBe('');
    rerender(<TaskCreationNotice state={{ uncertainTitle: 'Relevé', inspectionMessage: 'Inspection en cours' }} onInspect={vi.fn()} />);
    expect(screen.getByRole('alert').textContent).toContain('Relevé');
    expect(screen.getByRole('status').textContent).toBe('Inspection en cours');
  });
});
