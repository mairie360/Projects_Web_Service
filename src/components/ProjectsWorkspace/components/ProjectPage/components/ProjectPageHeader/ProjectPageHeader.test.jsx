import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { project } from '@tests/component/units/project-fixtures';
import { ProjectPageHeader } from './ProjectPageHeader';

describe('ProjectPageHeader (MAIR-846)', () => {
  it('shows the breadcrumb, the title first, the meta line and the description, without the labels (MAIR-1135)', () => {
    const shown = project({ dueDate: '2020-01-15', status: 'in-progress' });
    render(<ProjectPageHeader project={shown} titleId="t" onBack={vi.fn()} />);
    expect(screen.getByRole('navigation', { name: 'Fil d’Ariane' }).textContent).toMatch(/Projets\/PRJ-\d+/);
    const title = screen.getByRole('heading', { level: 1 });
    expect(title.id).toBe('t');
    const meta = screen.getByRole('group', { name: 'Résumé du projet' });
    expect(title.compareDocumentPosition(meta) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(meta).getByText('En cours')).toBeTruthy();
    expect(within(meta).getByText('En retard')).toBeTruthy();
    expect(within(meta).getByText(shown.responsible.name)).toBeTruthy();
    expect(within(meta).getByText('15/01/2020')).toBeTruthy();
    expect(screen.queryByText('Énergie')).toBeNull();
    expect(screen.getByText('Remplacer les lampes par des LED.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Modifier' })).toBeNull();
  });

  it('gives the three actions the size m (MAIR-1135)', () => {
    render(<ProjectPageHeader project={project()} titleId="t" onBack={vi.fn()} onEdit={vi.fn()} onNewTask={vi.fn()} onDelete={vi.fn()} />);
    for (const name of ['Modifier', 'Nouvelle tâche', /^Plus d’actions/]) {
      expect(screen.getByRole('button', { name }).getAttribute('data-size')).toBe('m');
    }
  });

  describe('MAIR-1200 a closed project is read-only', () => {
    const closed = () => project({ status: 'done', permissions: { canView: true, canEdit: false, canDuplicate: true, canDelete: true, canCreateTask: false, canAssignMembers: false, canClose: false, canReopen: true } });

    it('shows the read-only banner under the description', () => {
      render(<ProjectPageHeader project={closed()} titleId="t" onBack={vi.fn()} />);
      const banner = screen.getByRole('status');
      expect(banner.textContent).toContain('Projet clôturé — lecture seule.');
      expect(banner.textContent).toContain('Les tâches, l’activité et les jalons restent consultables. Rouvrez le projet pour le modifier.');
      const description = screen.getByText('Remplacer les lampes par des LED.');
      expect(description.compareDocumentPosition(banner) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('has no banner on an open project', () => {
      render(<ProjectPageHeader project={project({ status: 'on-hold' })} titleId="t" onBack={vi.fn()} />);
      expect(screen.queryByText('Projet clôturé — lecture seule.')).toBeNull();
    });

    it('offers « Rouvrir » instead of the edit actions, and keeps Dupliquer and Supprimer', async () => {
      const onReopen = vi.fn();
      render(<ProjectPageHeader project={closed()} titleId="t" onBack={vi.fn()} onReopen={onReopen} onDuplicate={vi.fn()} onDelete={vi.fn()} />);
      expect(screen.queryByRole('button', { name: 'Modifier' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Nouvelle tâche' })).toBeNull();
      await userEvent.click(screen.getByRole('button', { name: /^Plus d’actions/ }));
      // « Envoyer un message » depends on the messaging front being configured; it is not an edit action.
      expect(screen.getAllByRole('menuitem').map((item) => item.textContent).filter((name) => name !== 'Envoyer un message')).toEqual(['Dupliquer', 'Supprimer']);
      await userEvent.keyboard('{Escape}');
      await userEvent.click(screen.getByRole('button', { name: 'Rouvrir' }));
      await userEvent.click(screen.getByRole('menuitem', { name: 'En cours' }));
      expect(onReopen).toHaveBeenCalledWith('in-progress');
    });
  });
});
