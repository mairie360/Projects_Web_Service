import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PriorityLabel } from './PriorityLabel';

describe('PriorityLabel', () => {
  it('labels the value in French', () => {
    render(<PriorityLabel priority="low" />);
    expect(screen.getByText('Basse')).toBeTruthy();
  });
});
