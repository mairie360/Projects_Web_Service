import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { project } from '@tests/component/units/project-fixtures';
import { ProjectPageHeader } from './ProjectPageHeader';

describe('ProjectPageHeader (MAIR-846)', () => {
  it('shows the breadcrumb, status, priority, labels, title and description', () => {
    render(<ProjectPageHeader project={project()} titleId="t" onBack={vi.fn()} />);
    expect(screen.getByRole('navigation', { name: 'Fil d’Ariane' }).textContent).toMatch(/Projets\/#/);
    expect(screen.getByRole('heading', { level: 1 }).id).toBe('t');
    expect(screen.getByText('En cours')).toBeTruthy();
    expect(screen.getByText('Énergie')).toBeTruthy();
    expect(screen.getByText('Remplacer les lampes par des LED.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Modifier' })).toBeNull();
  });
});
