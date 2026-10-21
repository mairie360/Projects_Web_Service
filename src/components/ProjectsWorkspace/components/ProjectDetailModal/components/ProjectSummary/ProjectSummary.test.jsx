import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { memberOptions, person, priorityOptions, project, statusOptions, task } from '@tests/component/units/project-fixtures';
import { ProjectSummary } from './ProjectSummary';

describe('ProjectSummary', () => {
  it('shows the description, people and labels of the project', () => {
    render(<ProjectSummary project={project()} />);
    expect(screen.getByText('Remplacer les lampes par des LED.')).toBeTruthy();
    expect(screen.getAllByText('Marie Durand').length).toBeGreaterThan(0);
    expect(screen.getByText('Énergie')).toBeTruthy();
  });
});
