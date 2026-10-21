import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PersonAvatar } from './PersonAvatar';

describe('PersonAvatar', () => {
  it('shows the person initials', () => {
    const { container } = render(<PersonAvatar name="Alice Martin" />);
    expect(container.textContent).toContain('AM');
  });
});
