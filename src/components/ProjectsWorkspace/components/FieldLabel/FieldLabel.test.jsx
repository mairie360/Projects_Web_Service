import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FieldLabel } from './FieldLabel';

describe('FieldLabel', () => {
  it('marks required fields', () => {
    const { rerender } = render(<FieldLabel htmlFor="f" label="Titre" required />);
    expect(screen.getByText('*')).toBeTruthy();
    rerender(<FieldLabel htmlFor="f" label="Titre" />);
    expect(screen.queryByText('*')).toBeNull();
  });
});
