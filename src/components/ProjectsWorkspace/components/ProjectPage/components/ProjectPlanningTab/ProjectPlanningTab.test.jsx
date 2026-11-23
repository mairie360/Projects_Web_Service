import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { task } from '@tests/component/units/project-fixtures';
import { ProjectPlanningTab } from './ProjectPlanningTab';
import { planningMilestones, planningPeriod, planningRows, taskGanttState } from './planning-model';

const today = '2026-11-10';

describe('ProjectPlanningTab (MAIR-868)', () => {
  it('reads each task from its start date to its due date, coloured by its state', () => {
    const rows = planningRows([
      task({ id: 't1', title: 'Relevé', startDate: '2026-11-02', dueDate: '2026-11-20', status: 'in-progress' }),
      task({ id: 't2', title: 'Devis', dueDate: '2026-11-05' }),
      task({ id: 't3', title: 'Sans date', dueDate: '' }),
      task({ id: 't4', title: 'Fini', dueDate: '2026-10-01', status: 'done', completed: true }),
      task({ id: 't5', title: 'Début incohérent', startDate: '2026-12-31', dueDate: '2026-12-01' }),
    ], today);
    expect(rows.map((row) => [row.id, row.start, row.end, row.state])).toEqual([
      ['t4', '2026-10-01', '2026-10-01', 'done'],
      ['t1', '2026-11-02', '2026-11-20', 'doing'],
      ['t2', '2026-11-05', '2026-11-05', 'late'],
      ['t5', '2026-12-01', '2026-12-01', 'todo'],
    ]);
    expect(rows[1].assigneeInitials).toBe('AM');
    expect(taskGanttState({ status: 'todo', completed: false, dueDate: '2026-12-01' }, today)).toBe('todo');
  });

  it('spans whole months around the tasks, the milestones and today', () => {
    const milestones = planningMilestones([{ id: 'milestone-1', title: 'Devis signé', dueDate: '2027-01-15', reached: true }, { id: 'm2', title: 'Invalide', dueDate: '2027-02-30', reached: false }]);
    expect(milestones).toEqual([{ id: 'milestone-1', label: 'Devis signé', date: '2027-01-15', reached: true }]);
    expect(planningPeriod(planningRows([task({ dueDate: '2026-11-20' })], today), milestones, today)).toEqual({ from: '2026-11-01', to: '2027-01-31' });
    expect(planningPeriod([], [], today)).toBeNull();
  });

  it('shows the bars and milestones of the lib planning and opens a task from its bar', async () => {
    const onOpenTask = vi.fn();
    render(<ProjectPlanningTab today={today} onOpenTask={onOpenTask} tasks={[task({ id: 'task-1', title: 'Relevé', startDate: '2026-11-02', dueDate: '2026-11-20', status: 'in-progress' }), task({ id: 'task-2', title: 'Sans date', dueDate: '' })]} milestones={[{ id: 'milestone-1', title: 'Devis signé', dueDate: '2026-11-15', reached: false }]} />);
    expect(screen.getByRole('region', { name: 'Planning du projet' })).toBeTruthy();
    expect(screen.getByText('1 tâche sans échéance n’apparaît pas sur le planning.')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: /^Relevé, en cours, du/ }));
    expect(onOpenTask).toHaveBeenCalledWith('task-1');
    expect(screen.getByRole('img', { name: /Devis signé/ })).toBeTruthy();
  });

  it('says there is nothing to plan', () => {
    render(<ProjectPlanningTab today={today} onOpenTask={vi.fn()} tasks={[task({ dueDate: '' })]} milestones={[]} />);
    expect(screen.getByText('Rien à planifier')).toBeTruthy();
  });
});
