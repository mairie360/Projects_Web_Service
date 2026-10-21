import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProjectsEmptyState } from './ProjectsEmptyState';

describe('ProjectsEmptyState', () => {
  it('says no project matches', () => {
    render(<ProjectsEmptyState />);
    expect(screen.getByText('Aucun projet à afficher')).toBeTruthy();
  });
});
