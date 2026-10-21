import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { memberOptions, person, priorityOptions, project, statusOptions, task } from '@tests/component/units/project-fixtures';
import { DetailTaskList } from './DetailTaskList';

const filters = (filteredTasks) => ({ search: '', status: 'all', priority: 'all', due: '', setSearch: vi.fn(), setStatus: vi.fn(), setPriority: vi.fn(), setDue: vi.fn(), filteredTasks, reset: vi.fn() });
const collaboration = { taskId: null, collaboration: null, loading: false, error: '', message: '', saving: false, open: vi.fn(), submit: vi.fn(), refresh: vi.fn(), setMessage: vi.fn(), reset: vi.fn() };
const base = { project: project(), taskStatusOptions: statusOptions, priorityOptions, dynamicStatuses: undefined, mutationPending: false, highlightedTaskRef: { current: null }, onUpdateTaskStatus: vi.fn(), onEditTask: vi.fn() };

describe('DetailTaskList', () => {
  it('lists the tasks, asks before deleting and confirms the deletion', async () => {
    const onDeletingChange = vi.fn(); const onDeleteTask = vi.fn().mockResolvedValue(undefined); const tasks = [task()];
    const { rerender } = render(<DetailTaskList {...base} tasks={tasks} filters={filters(tasks)} collaboration={collaboration} deletingTaskId={null} onDeletingChange={onDeletingChange} onDeleteTask={onDeleteTask} />);
    expect(screen.getByText('2/5')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Supprimer Relevé des candélabres' }));
    expect(onDeletingChange).toHaveBeenCalledWith('task-1');
    rerender(<DetailTaskList {...base} tasks={tasks} filters={filters(tasks)} collaboration={collaboration} deletingTaskId="task-1" onDeletingChange={onDeletingChange} onDeleteTask={onDeleteTask} />);
    await userEvent.click(screen.getByRole('button', { name: 'Supprimer' }));
    expect(onDeleteTask).toHaveBeenCalledWith('project-1', 'task-1', 'Relevé des candélabres');
  });
  it('says when there is no task or no match', () => {
    const { rerender } = render(<DetailTaskList {...base} tasks={[]} filters={filters([])} collaboration={collaboration} deletingTaskId={null} onDeletingChange={vi.fn()} onDeleteTask={vi.fn()} />);
    expect(screen.getByText('Aucune tâche pour ce projet.')).toBeTruthy();
    rerender(<DetailTaskList {...base} tasks={[task()]} filters={filters([])} collaboration={collaboration} deletingTaskId={null} onDeletingChange={vi.fn()} onDeleteTask={vi.fn()} />);
    expect(screen.getByText('Aucune tâche ne correspond aux filtres.')).toBeTruthy();
  });
});
