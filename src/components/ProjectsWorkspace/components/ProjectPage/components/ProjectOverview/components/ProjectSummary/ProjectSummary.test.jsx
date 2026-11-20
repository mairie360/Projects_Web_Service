import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { project } from '@tests/component/units/project-fixtures';
import { ProjectSummary } from './ProjectSummary';

describe('ProjectSummary', () => {
  it('lists the responsible, dates, priority, team and group of the project (MAIR-846)', () => {
    render(<ProjectSummary project={{ ...project(), group: { id: 'group-1', name: 'Voirie' } }} />);
    for (const label of ['Responsable', 'Début', 'Échéance', 'Priorité', 'Équipe', 'Groupe', 'Budget']) expect(screen.getByText(label)).toBeTruthy();
    expect(screen.getAllByText('Marie Durand').length).toBeGreaterThan(0);
    expect(screen.getByText('Voirie')).toBeTruthy();
    expect(screen.queryByText('Sans groupe')).toBeNull();
  });

  it('flags a project without group and says where to choose one (Figma 5.11)', () => {
    render(<ProjectSummary project={{ ...project(), group: null }} />);
    expect(screen.getByText('Sans groupe')).toBeTruthy();
    expect(screen.getByText('Choisissez un groupe dans « Modifier »')).toBeTruthy();
  });
});
