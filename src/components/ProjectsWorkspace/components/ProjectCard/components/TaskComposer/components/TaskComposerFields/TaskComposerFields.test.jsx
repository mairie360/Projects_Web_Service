import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TaskComposerFields } from './TaskComposerFields';

const statuses = [{ id: 's1', name: 'Ouvert', color: '#1256a6', category: 'todo' }, { id: 's2', name: 'Clos', color: '#267845', category: 'done' }];

describe('TaskComposerFields', () => {
  it('reports category statuses, project statuses, priority and due date', () => {
    const onChange = vi.fn();
    const { rerender } = render(<TaskComposerFields statuses={null} statusId="" status="todo" priority="medium" dueDate="2026-11-03" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Statut'), { target: { value: 'done' } });
    fireEvent.change(screen.getByLabelText('Priorité'), { target: { value: 'high' } });
    fireEvent.change(screen.getByLabelText('Échéance'), { target: { value: '2026-12-01' } });
    expect(onChange.mock.calls).toEqual([[{ status: 'done' }], [{ priority: 'high' }], [{ dueDate: '2026-12-01' }]]);
    rerender(<TaskComposerFields statuses={statuses} statusId="s1" status="todo" priority="medium" dueDate="2026-11-03" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Statut'), { target: { value: 's2' } });
    expect(onChange).toHaveBeenLastCalledWith({ statusId: 's2', status: 'done' });
  });
});
