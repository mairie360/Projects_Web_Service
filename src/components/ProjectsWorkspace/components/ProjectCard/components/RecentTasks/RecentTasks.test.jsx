import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { memberOptions, person, priorityOptions, project, statusOptions, task } from '@tests/component/units/project-fixtures';
import { RecentTasks } from './RecentTasks';

describe('RecentTasks', () => {
  it('shows the last two tasks, newest first, and nothing without tasks', () => {
    const tasks = [task({ id: '1', title: 'Première' }), task({ id: '2', title: 'Deuxième' }), task({ id: '3', title: 'Troisième', status: 'done', completed: true })];
    const { container, rerender } = render(<RecentTasks tasks={tasks} />);
    expect(screen.queryByText('Première')).toBeNull();
    expect(container.textContent.indexOf('Troisième')).toBeLessThan(container.textContent.indexOf('Deuxième'));
    expect(screen.getByText('Terminé')).toBeTruthy();
    rerender(<RecentTasks tasks={[]} />);
    expect(container.innerHTML).toBe('');
  });
});
