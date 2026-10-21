import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PriorityPill } from './PriorityPill';

describe('PriorityPill', () => {
  it('labels the value in French', () => {
    render(<PriorityPill priority="high" />);
    expect(screen.getByText('Haute')).toBeTruthy();
  });
});
