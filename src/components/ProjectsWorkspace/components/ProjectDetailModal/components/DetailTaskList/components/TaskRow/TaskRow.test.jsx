import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { memberOptions, person, priorityOptions, project, statusOptions, task } from '@tests/component/units/project-fixtures';
import { TaskRow } from './TaskRow';

const rowProps = { linked: false, pending: false, blocked: false, mutationPending: false, toggleDisabled: false, statusValue: 'todo', statusOptions, deleting: false,
  onToggleDone: vi.fn(), onStatusChange: vi.fn(), onFollowUp: vi.fn(), onEdit: vi.fn(), onAskDelete: vi.fn() };

describe('TaskRow', () => {
  it('wires its actions and follows the task permissions', async () => {
    const props = { ...rowProps, onToggleDone: vi.fn(), onStatusChange: vi.fn(), onFollowUp: vi.fn(), onEdit: vi.fn(), onAskDelete: vi.fn() };
    const { rerender } = render(<TaskRow task={task()} {...props} writeError="Écriture refusée" />);
    await userEvent.click(screen.getByRole('button', { name: 'Marquer Relevé des candélabres comme terminée' }));
    await userEvent.click(screen.getByRole('button', { name: 'Suivi' }));
    await userEvent.click(screen.getByRole('button', { name: 'Supprimer Relevé des candélabres' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Statut de Relevé des candélabres' }), { target: { value: 'done' } });
    expect(props.onToggleDone).toHaveBeenCalledTimes(1);
    expect(props.onFollowUp).toHaveBeenCalledTimes(1);
    expect(props.onAskDelete).toHaveBeenCalledTimes(1);
    expect(props.onStatusChange).toHaveBeenCalledWith('done');
    expect(screen.getByRole('alert').textContent).toContain('Écriture refusée');
    rerender(<TaskRow task={task({ completed: true, permissions: { canView: true, canEdit: false, canDelete: false, canUpdateStatus: false, canComment: true } })} {...props} linked pending />);
    expect(screen.getByRole('button', { name: 'Marquer Relevé des candélabres comme non terminée' })).toBeTruthy();
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.queryByRole('button', { name: /Supprimer/ })).toBeNull();
    expect(screen.getByRole('article').getAttribute('aria-current')).toBe('true');
    expect(screen.getByRole('status').textContent).toContain('Opération sur la tâche en cours…');
  });

  it('shows three people at most', () => {
    const many = ['A', 'B', 'C', 'D', 'E'].map(name => ({ name }));
    render(<TaskRow task={task({ assignees: many })} {...rowProps} />);
    expect(screen.getByText('+2')).toBeTruthy();
  });
});
