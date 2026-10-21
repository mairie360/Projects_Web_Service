import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { WorkspaceLoading } from './WorkspaceLoading';

describe('WorkspaceLoading', () => {
  it('announces the page read', () => {
    render(<WorkspaceLoading />);
    expect(screen.getByRole('status').textContent).toContain('Chargement du tableau des projets...');
  });
});
