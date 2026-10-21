import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SearchInput } from './SearchInput';

describe('SearchInput', () => {
  it('reports the typed text', () => {
    const onChange = vi.fn();
    render(<SearchInput value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'école' } });
    expect(onChange).toHaveBeenCalledWith('école');
  });
});
