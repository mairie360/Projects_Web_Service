import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { project } from '@tests/component/units/project-fixtures';
import { ProjectPageHeader } from './ProjectPageHeader';

describe('ProjectPageHeader (MAIR-846)', () => {
  it('shows the breadcrumb, the title first, the meta line and the description, without the labels (MAIR-1135)', () => {
    const shown = project({ dueDate: '2020-01-15', status: 'in-progress' });
    render(<ProjectPageHeader project={shown} titleId="t" onBack={vi.fn()} />);
    expect(screen.getByRole('navigation', { name: 'Fil d’Ariane' }).textContent).toMatch(/Projets\/#/);
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
});
