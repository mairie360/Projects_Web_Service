import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WorkspaceLoading } from './WorkspaceLoading';

describe('WorkspaceLoading', () => {
  it('announces the page read', () => {
    render(<WorkspaceLoading />);
    expect(screen.getByRole('status').textContent).toContain('Chargement du tableau des projets...');
  });
});
