import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProjectsEmptyState } from './ProjectsEmptyState';

describe('ProjectsEmptyState', () => {
  it('says no project matches, without a reset when no filter applies', () => {
    render(<ProjectsEmptyState />);
    expect(screen.getByText('Aucun projet à afficher')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Réinitialiser les filtres' })).toBeNull();
  });

  it('MAIR-829: offers « Réinitialiser les filtres » after a search or a filter', () => {
    const onReset = vi.fn();
    render(<ProjectsEmptyState onReset={onReset} />);
    fireEvent.click(screen.getByRole('button', { name: 'Réinitialiser les filtres' }));
    expect(onReset).toHaveBeenCalledOnce();
  });
});
