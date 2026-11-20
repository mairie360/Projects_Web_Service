import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { project, task } from '@tests/component/units/project-fixtures';
import { ProjectOverview } from './ProjectOverview';

const props = (overrides = {}) => ({
  project: project(), tasks: [task()], onCompleteTask: vi.fn(), onShowTab: vi.fn(), onSuspend: vi.fn(), onCloseProject: vi.fn(), ...overrides,
});

describe('ProjectOverview (MAIR-846)', () => {
  it('shows the four panels of the mockup', () => {
    render(<ProjectOverview {...props()} />);
    for (const title of ['Prochaines tâches', 'Jalons', 'Informations', 'Activité récente']) expect(screen.getByText(title)).toBeTruthy();
    expect(screen.getByText('Jalons non disponibles')).toBeTruthy();
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
});
