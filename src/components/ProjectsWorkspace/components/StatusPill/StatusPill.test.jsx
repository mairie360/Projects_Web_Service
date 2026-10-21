import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { StatusPill } from './StatusPill';

describe('StatusPill', () => {
  it('labels the value in French', () => {
    render(<StatusPill status="in-progress" />);
    expect(screen.getByText('En cours')).toBeTruthy();
  });
});
