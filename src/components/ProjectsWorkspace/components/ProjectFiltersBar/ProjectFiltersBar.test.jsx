import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { priorityOptions, statusOptions } from '@tests/component/units/project-fixtures';
import { ProjectFiltersBar } from './ProjectFiltersBar';

function renderBar(overrides = {}) {
  const handlers = { onSearchChange: vi.fn(), onStatusChange: vi.fn(), onPriorityChange: vi.fn(), onDueBeforeChange: vi.fn(), onViewModeChange: vi.fn() };
  render(<ProjectFiltersBar search="" status="all" priority="all" dueBefore="" statusOptions={[{ label: 'Tous les statuts', value: 'all' }, ...statusOptions]}
    priorityOptions={[{ label: 'Toutes les priorités', value: 'all' }, ...priorityOptions]} viewMode="kanban"
    views={[{ value: 'kanban', label: 'Kanban' }, { value: 'table', label: 'Tableau' }]} {...handlers} {...overrides} />);
  return handlers;
}

describe('ProjectFiltersBar', () => {
  it('reports search, due date, filters and the view through the lib controls (MAIR-828)', async () => {
    const handlers = renderBar();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Rechercher un projet' }), { target: { value: 'école' } });
    fireEvent.change(screen.getByLabelText('Échéance avant'), { target: { value: '2026-12-01' } });
    fireEvent.change(screen.getByRole('combobox', { name: /Statut/ }), { target: { value: statusOptions[0].value } });
    await userEvent.click(screen.getByRole('radio', { name: /Tableau/ }));
    expect(handlers.onSearchChange).toHaveBeenCalledWith('école');
    expect(handlers.onDueBeforeChange).toHaveBeenCalledWith('2026-12-01');
    expect(handlers.onStatusChange).toHaveBeenCalledWith(statusOptions[0].value);
    expect(handlers.onViewModeChange).toHaveBeenCalledWith('table');
  });

  it('maps the lib "no filter" choice back to the BFF `all` option', () => {
    const handlers = renderBar({ priority: priorityOptions[0].value });
    const priority = screen.getByRole('combobox', { name: /Priorité/ });
    expect(screen.getByRole('option', { name: 'Toutes les priorités' })).toBeTruthy();
    fireEvent.change(priority, { target: { value: '' } });
    expect(handlers.onPriorityChange).toHaveBeenCalledWith('all');
  });
});
