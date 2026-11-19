import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import fixtures from '@tests/support/bff-fixtures.cjs';
import { projectStatusBadge, projectStatusLabel } from '@/components/ProjectsWorkspace/project-card-meta';
import { KanbanBoard } from './KanbanBoard';

const columns = Object.keys(projectStatusBadge).map((status) => ({ status, label: projectStatusLabel(status) }));

describe('KanbanBoard', () => {
  it('lays the projects out in one region per status', () => {
    const item = fixtures.projectListItem({ status: 'todo' });
    render(<KanbanBoard projects={[item]} columns={columns} onMoveProject={vi.fn().mockResolvedValue(undefined)} onProjectOpen={vi.fn()} />);
    expect(screen.getByRole('group', { name: item.title })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'En cours' })).toBeTruthy();
  });
});
