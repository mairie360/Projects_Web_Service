import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { priorityOptions, statusOptions } from '@tests/component/units/project-fixtures';
import { ProjectFiltersBar } from './ProjectFiltersBar';

function renderBar(overrides = {}) {
  const handlers = { onSearchChange: vi.fn(), onStatusChange: vi.fn(), onPriorityChange: vi.fn(), onDueRangeChange: vi.fn(), onViewModeChange: vi.fn(), onResetFilters: vi.fn() };
  const view = render(<ProjectFiltersBar search="" status="all" priority="all" dueRange="" statusOptions={[{ label: 'Tous les statuts', value: 'all' }, ...statusOptions]}
    priorityOptions={[{ label: 'Toutes les priorités', value: 'all' }, ...priorityOptions]} viewMode="kanban"
    views={[{ value: 'kanban', label: 'Kanban' }, { value: 'grid', label: 'Grille' }, { value: 'table', label: 'Tableau' }]} {...handlers} {...overrides} />);
  return { ...handlers, view };
}

describe('ProjectFiltersBar', () => {
  it('reports search, due range, filters and the view through the lib controls (MAIR-828)', async () => {
    const handlers = renderBar();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Rechercher un projet' }), { target: { value: 'école' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Échéance' }), { target: { value: 'overdue' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Tous les statuts' }), { target: { value: statusOptions[0].value } });
    await userEvent.click(screen.getByRole('radio', { name: /Tableau/ }));
    expect(handlers.onSearchChange).toHaveBeenCalledWith('école');
    expect(handlers.onDueRangeChange).toHaveBeenCalledWith('overdue');
    expect(handlers.onStatusChange).toHaveBeenCalledWith(statusOptions[0].value);
    expect(handlers.onViewModeChange).toHaveBeenCalledWith('table');
  });

  it('maps the lib "no filter" choice back to the BFF `all` option', () => {
    const handlers = renderBar({ priority: priorityOptions[0].value });
    const priority = screen.getByRole('combobox', { name: 'Toutes les priorités' });
    expect(screen.getAllByRole('option', { name: 'Toutes les priorités' }).length).toBe(1);
    fireEvent.change(priority, { target: { value: '' } });
    expect(handlers.onPriorityChange).toHaveBeenCalledWith('all');
  });

  it('MAIR-1254 shows the artifact filters without labels above them', () => {
    const { view } = renderBar();
    expect(screen.getByRole('searchbox', { name: 'Rechercher un projet' }).getAttribute('placeholder')).toBe('Rechercher un projet, une étiquette…');
    const text = view.container.textContent;
    for (const trigger of ['Tous les statuts', 'Toutes les priorités', 'Échéance']) expect(text).toContain(trigger);
    expect(text).not.toMatch(/Statut(?!s)|Priorité(?!s)|Échéance avant/);
    // The due-date filter is a menu of ranges, never a native date input.
    expect(view.container.querySelector('input[type="date"]')).toBeNull();
    expect([...screen.getByRole('combobox', { name: 'Échéance' }).options].map((option) => option.textContent))
      .toEqual(['Toutes les échéances', 'En retard', 'Ce mois-ci', 'Plus tard']);
  });

  it('MAIR-1254 orders the views Kanban, Tableau, Grille', () => {
    renderBar();
    expect(screen.getAllByRole('radio').map((radio) => radio.textContent.trim())).toEqual(['Kanban', 'Tableau', 'Grille']);
  });

  it('MAIR-1254 shows « Effacer » only while a filter is set', async () => {
    renderBar();
    expect(screen.queryByRole('button', { name: 'Effacer' })).toBeNull();
    const handlers = renderBar({ filtersActive: true, dueRange: 'later' });
    await userEvent.click(screen.getByRole('button', { name: 'Effacer' }));
    expect(handlers.onResetFilters).toHaveBeenCalledTimes(1);
  });

  it('MAIR-1254 shows bounds that match no range as the selected « Échéance » option, without reporting it', () => {
    const handlers = renderBar({ dueCustomLabel: 'Jusqu’au 31/12/2026' });
    const due = screen.getByRole('combobox', { name: 'Échéance' });
    expect(due.value).toBe('custom');
    expect(screen.getByRole('option', { name: 'Jusqu’au 31/12/2026' }).selected).toBe(true);
    fireEvent.change(due, { target: { value: 'custom' } });
    expect(handlers.onDueRangeChange).not.toHaveBeenCalled();
    fireEvent.change(due, { target: { value: 'later' } });
    expect(handlers.onDueRangeChange).toHaveBeenCalledWith('later');
  });

  it('MAIR-1254 has no custom « Échéance » option without custom bounds', () => {
    renderBar({ dueRange: 'overdue' });
    expect(screen.getByRole('combobox', { name: 'Échéance' }).value).toBe('overdue');
    expect(screen.queryByRole('option', { name: /^Jusqu’au|^Du |^À partir du/ })).toBeNull();
  });
});
