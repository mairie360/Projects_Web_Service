import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { priorityOptions, statusOptions } from '@tests/component/units/project-fixtures';
import { TaskFilters } from './TaskFilters';

describe('TaskFilters', () => {
  it('reports each filter', () => {
    const handlers = { onSearchChange: vi.fn(), onStatusChange: vi.fn(), onPriorityChange: vi.fn(), onDueChange: vi.fn() };
    render(<TaskFilters search="" status="all" priority="all" due="" statusOptions={statusOptions} priorityOptions={priorityOptions} {...handlers} />);
    fireEvent.change(screen.getByRole('searchbox', { name: 'Rechercher une tâche' }), { target: { value: 'candé' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Filtrer les tâches par statut' }), { target: { value: 'done' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Filtrer les tâches par priorité' }), { target: { value: 'high' } });
    fireEvent.change(screen.getByLabelText('Échéance maximale des tâches'), { target: { value: '2026-11-30' } });
    expect([handlers.onSearchChange, handlers.onStatusChange, handlers.onPriorityChange, handlers.onDueChange].map(fn => fn.mock.calls[0][0]))
      .toEqual(['candé', 'done', 'high', '2026-11-30']);
  });
});
