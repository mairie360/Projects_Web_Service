import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { project, task } from '@tests/component/units/project-fixtures';
import { ProjectMetrics } from './ProjectMetrics';
import { dueMetric, formatLongDate, overdueTasksMetric, progressMetric } from './project-metrics';

describe('ProjectMetrics (MAIR-846, C4)', () => {
  it('computes the indicators from the project data', () => {
    expect(progressMetric(project())).toEqual({ value: '40 %', detail: '2/5 tâches terminées' });
    expect(dueMetric({ dueDate: '2026-12-15', status: 'in-progress' }, '2026-11-01')).toEqual({ value: 'J-44', detail: 'Fin prévue le 15 déc. 2026' });
    expect(dueMetric({ dueDate: '2026-11-01', status: 'todo' }, '2026-11-01').value).toBe('Aujourd’hui');
    expect(dueMetric({ dueDate: '2026-10-29', status: 'todo' }, '2026-11-01').value).toBe('3 j de retard');
    expect(dueMetric({ dueDate: '2026-10-29', status: 'done' }, '2026-11-01').value).toBe('Terminé');
    expect(dueMetric({ dueDate: '', status: 'todo' }, '2026-11-01')).toEqual({ value: '—', detail: 'Sans échéance' });
    expect(dueMetric({ dueDate: '2026-02-30', status: 'todo' }, '2026-11-01').detail).toBe('Échéance invalide');
    const tasks = [task({ dueDate: '2026-10-01' }), task({ id: 't2', dueDate: '2026-10-01', completed: true, status: 'done' }), task({ id: 't3', dueDate: '2026-12-01' })];
    expect(overdueTasksMetric(tasks, '2026-11-01')).toEqual({ value: '1', detail: 'Tâche à traiter en priorité' });
    expect(overdueTasksMetric([], '2026-11-01')).toEqual({ value: '0', detail: 'Tout est dans les temps' });
    expect(formatLongDate('2026-09-03')).toBe('3 sept. 2026');
  });

  it('shows the four cards, the budget as not provided', () => {
    render(<ProjectMetrics project={project()} tasks={[]} />);
    for (const label of ['Avancement', 'Échéance', 'Budget engagé', 'Tâches en retard']) expect(screen.getByText(label)).toBeTruthy();
    expect(screen.getByText('Budget non renseigné')).toBeTruthy();
    expect(screen.getByText('40 %')).toBeTruthy();
  });
});
