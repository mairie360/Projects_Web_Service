import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { project } from '@tests/component/units/project-fixtures';
import { ProjectSummary } from './ProjectSummary';

describe('ProjectSummary', () => {
  it('shows the description, people and labels of the project', () => {
    render(<ProjectSummary project={project()} />);
    expect(screen.getByText('Remplacer les lampes par des LED.')).toBeTruthy();
    expect(screen.getAllByText('Marie Durand').length).toBeGreaterThan(0);
    expect(screen.getByText('Énergie')).toBeTruthy();
  });
});
