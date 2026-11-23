import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { project, task } from '@tests/component/units/project-fixtures';
import { ProjectOverview } from './ProjectOverview';

const milestones = (overrides = {}) => ({
  milestones: [], total: 0, canManage: false, onAdd: vi.fn(), onUpdate: vi.fn(), onRemove: vi.fn(), ...overrides,
});
const activity = (overrides = {}) => ({ items: [], loading: false, onRetry: vi.fn(), ...overrides });
const props = (overrides = {}) => ({
  project: project(), tasks: [task()], onCompleteTask: vi.fn(), onShowTab: vi.fn(), onSuspend: vi.fn(), onCloseProject: vi.fn(),
  milestones: milestones(), activity: activity(), ...overrides,
});

describe('ProjectOverview (MAIR-846)', () => {
  it('shows the four panels of the mockup', () => {
    render(<ProjectOverview {...props()} />);
    for (const title of ['Prochaines tâches', 'Jalons', 'Informations', 'Activité récente']) expect(screen.getByText(title)).toBeTruthy();
    expect(screen.getByText('Aucun jalon')).toBeTruthy();
    expect(screen.getByText('Aucune activité')).toBeTruthy();
  });

  it('lists the milestones and the latest activity of the project (MAIR-1086, MAIR-1089)', () => {
    render(<ProjectOverview {...props({
      milestones: milestones({ milestones: [{ id: 'milestone-1', title: 'Validation du devis', dueDate: '2099-01-15', reached: false }], total: 1 }),
      activity: activity({ items: [{ kind: 'comment', id: 'comment-1', taskId: null, taskTitle: null, author: { id: 'user-2', name: 'Alice Martin' }, message: 'Réunion fixée.', changes: null, label: 'Comment', createdAt: '2026-09-04T09:00:00.000Z' }] }),
    })} />);
    expect(screen.getByText('Validation du devis')).toBeTruthy();
    expect(screen.getByText('À venir')).toBeTruthy();
    expect(screen.getByText('Alice Martin a commenté le projet')).toBeTruthy();
    expect(screen.getByText('Réunion fixée.')).toBeTruthy();
  });

  it('opens the tasks and activity tabs from their panels', async () => {
    const value = props();
    render(<ProjectOverview {...value} />);
    await userEvent.click(screen.getByRole('button', { name: 'Toutes les tâches' }));
    await userEvent.click(screen.getByRole('button', { name: 'Tout voir' }));
    expect(value.onShowTab.mock.calls).toEqual([['tasks'], ['activity']]);
  });

  it('keeps the lifecycle actions only when the project may be closed', () => {
    const { rerender } = render(<ProjectOverview {...props()} />);
    expect(screen.getByRole('button', { name: 'Clôturer' })).toBeTruthy();
    rerender(<ProjectOverview {...props({ project: project({ permissions: { canClose: false } }) })} />);
    expect(screen.queryByRole('button', { name: 'Clôturer' })).toBeNull();
  });

  it('offers « Reprendre » for a project on hold (MAIR-1084)', async () => {
    const value = props({ project: project({ status: 'on-hold' }), onResume: vi.fn() });
    render(<ProjectOverview {...value} />);
    await userEvent.click(screen.getByRole('button', { name: 'Reprendre' }));
    expect(value.onResume).toHaveBeenCalledTimes(1);
  });
});
