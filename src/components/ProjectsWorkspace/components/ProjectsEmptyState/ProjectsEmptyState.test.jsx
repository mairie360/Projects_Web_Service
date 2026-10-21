import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProjectsEmptyState } from './ProjectsEmptyState';

describe('ProjectsEmptyState', () => {
  it('says no project matches', () => {
    render(<ProjectsEmptyState />);
    expect(screen.getByText('Aucun projet à afficher')).toBeTruthy();
  });
});
