import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FieldLabel } from './FieldLabel';

describe('FieldLabel', () => {
  it('marks required fields', () => {
    const { rerender } = render(<FieldLabel htmlFor="f" label="Titre" required />);
    expect(screen.getByText('*')).toBeTruthy();
    rerender(<FieldLabel htmlFor="f" label="Titre" />);
    expect(screen.queryByText('*')).toBeNull();
  });
});
