import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TaskStatusKanban } from './TaskStatusKanban';

const statuses = [{ id: 'open', name: 'À faire', color: '#1256a6', category: 'todo' }, { id: 'closed', name: 'Terminé', color: '#267845', category: 'done' }];

describe('TaskStatusKanban', () => {
  it('places each task in its status column and moves it from its selector', () => {
    const onStatusChange = vi.fn();
    render(<TaskStatusKanban statuses={statuses} tasks={[{ id: 't1', title: 'Préparer le conseil', statusId: 'open' }]} onStatusChange={onStatusChange} />);
    expect(screen.getByRole('region', { name: 'À faire' }).textContent).toContain('Préparer le conseil');
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'closed' } });
    expect(onStatusChange).toHaveBeenCalledTimes(1);
    expect(onStatusChange.mock.calls[0]).toContain('closed');
  });
});
