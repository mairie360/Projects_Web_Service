import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { priorityOptions, statusOptions } from '@tests/component/units/project-fixtures';
import { ProjectFiltersBar } from './ProjectFiltersBar';

describe('ProjectFiltersBar', () => {
  it('reports search, due date, filter opening and the view', async () => {
    const handlers = { onSearchChange: vi.fn(), onStatusChange: vi.fn(), onPriorityChange: vi.fn(), onDueBeforeChange: vi.fn(), onOpenFilterChange: vi.fn(), onViewModeChange: vi.fn() };
    render(<ProjectFiltersBar search="" status="all" priority="all" dueBefore="" statusOptions={[{ label: 'Tous les statuts', value: 'all' }, ...statusOptions]}
      priorityOptions={[{ label: 'Toutes les priorités', value: 'all' }, ...priorityOptions]} openFilter={null} viewMode="kanban"
      views={[{ value: 'kanban', label: 'Kanban' }, { value: 'table', label: 'Tableau' }]} {...handlers} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'école' } });
    fireEvent.change(screen.getByLabelText('Échéance avant'), { target: { value: '2026-12-01' } });
    await userEvent.click(screen.getByRole('button', { name: 'Tous les statuts' }));
    await userEvent.click(screen.getByRole('tab', { name: /Tableau/ }));
    expect(handlers.onSearchChange).toHaveBeenCalledWith('école');
    expect(handlers.onDueBeforeChange).toHaveBeenCalledWith('2026-12-01');
    expect(handlers.onOpenFilterChange).toHaveBeenCalledWith('status');
    expect(handlers.onViewModeChange).toHaveBeenCalledWith('table');
  });
});
