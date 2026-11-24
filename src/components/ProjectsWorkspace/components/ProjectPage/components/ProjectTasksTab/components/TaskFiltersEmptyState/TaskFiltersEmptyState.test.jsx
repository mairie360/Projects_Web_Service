import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TaskFiltersEmptyState } from './TaskFiltersEmptyState';

describe('TaskFiltersEmptyState', () => {
  it('MAIR-1178: says no task matches the filters and resets them', () => {
    const onReset = vi.fn();
    render(<TaskFiltersEmptyState onReset={onReset} />);
    expect(screen.getByText('Aucune tâche ne correspond aux filtres')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Réinitialiser les filtres' }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
