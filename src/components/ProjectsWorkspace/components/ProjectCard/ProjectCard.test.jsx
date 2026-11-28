import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import fixtures from '@tests/support/bff-fixtures.cjs';
import { ProjectCard } from './ProjectCard';

describe('ProjectCard', () => {
  it('opens the project from its title in both variants', async () => {
    const item = fixtures.projectListItem(); const onOpen = vi.fn();
    const { rerender } = render(<ProjectCard project={item} onOpen={onOpen} />);
    await userEvent.click(screen.getByRole('button', { name: `Ouvrir la fiche du projet ${item.title}` }));
    rerender(<ProjectCard variant="grid" project={item} onOpen={onOpen} />);
    await userEvent.click(screen.getByRole('button', { name: `Ouvrir la fiche du projet ${item.title}` }));
    expect(onOpen).toHaveBeenCalledTimes(2);
  });
});

describe('ProjectCard V2 (MAIR-829)', () => {
  const card = (overrides = {}, variant = 'kanban') => render(<ProjectCard variant={variant} project={fixtures.projectListItem(overrides)} onOpen={vi.fn()} />);

  it('shows the key, labels, priority, due date, progress, team and « x/y tâches », without task composer', () => {
    const { container } = card({ id: 'project-14', labels: ['Urbanisme', 'Concertation'], dueDate: '2099-03-30', progress: 40, tasks: { total: 6, completed: 2, active: 4, archived: 0 } });
    expect(screen.getByText('PRJ-14')).toBeTruthy();
    expect(screen.getByRole('list', { name: 'Étiquettes du projet' }).textContent).toContain('Concertation');
    // MAIR-1254: the artifact's long due date.
    expect(screen.getByText('30 mars 2099')).toBeTruthy();
    expect(screen.queryByText('30/03/2099')).toBeNull();
    expect(screen.getByText('2/6 tâches')).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: 'Progression' }).getAttribute('aria-valuenow')).toBe('40');
    expect(container.textContent).not.toMatch(/Ajouter une tâche|En retard/);
  });

  it('flags « En retard » a past due date unless the project is done', () => {
    card({ dueDate: '2020-01-01', status: 'in-progress' });
    expect(screen.getByText('En retard')).toBeTruthy();
    cleanup();
    card({ dueDate: '2020-01-01', status: 'done' });
    expect(screen.queryByText('En retard')).toBeNull();
  });

  it('shows the status pill in the grid only', () => {
    const { container, unmount } = card({ status: 'review' }, 'grid');
    expect(container.textContent).toContain('En revue');
    unmount();
    expect(card({ status: 'review' }).container.textContent).not.toContain('En revue');
  });
});
