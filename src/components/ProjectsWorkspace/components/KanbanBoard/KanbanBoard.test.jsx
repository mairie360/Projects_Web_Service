import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

describe('KanbanBoard V2 (MAIR-829)', () => {
  it('heads each column with its status, its count and a « + » opening the creation in that status', async () => {
    const onAddProject = vi.fn();
    const items = [fixtures.projectListItem({ id: 'project-1', status: 'review' }), fixtures.projectListItem({ id: 'project-2', status: 'review' })];
    render(<KanbanBoard projects={items} columns={columns} onAddProject={onAddProject} />);
    const review = screen.getByRole('region', { name: 'En revue' });
    expect(within(review).getByRole('heading', { level: 2 }).textContent).toBe('En revue2');
    expect(within(review).getByLabelText('2 projets')).toBeTruthy();
    fireEvent.click(within(review).getByRole('button', { name: 'Ajouter un projet En revue' }));
    expect(onAddProject).toHaveBeenCalledWith('review');
  });

  it('moves a project from its card menu, like a drop', async () => {
    const onMoveProject = vi.fn().mockResolvedValue(undefined);
    const item = fixtures.projectListItem({ status: 'todo' });
    render(<KanbanBoard projects={[item]} columns={columns} onMoveProject={onMoveProject} />);
    await userEvent.click(screen.getByRole('button', { name: `Actions pour ${item.title}` }));
    await userEvent.click(screen.getByRole('menuitemradio', { name: 'Terminé' }));
    expect(onMoveProject).toHaveBeenCalledWith(item, 'done');
  });

  it('dims the dragged card and highlights the hovered column', () => {
    const item = fixtures.projectListItem({ status: 'todo' });
    render(<KanbanBoard projects={[item]} columns={columns} onMoveProject={vi.fn().mockResolvedValue(undefined)} />);
    const payload = new Map();
    const dataTransfer = { setData: (type, value) => payload.set(type, value), getData: (type) => payload.get(type) ?? '' };
    const group = screen.getByRole('group', { name: item.title });
    fireEvent.dragStart(group, { dataTransfer });
    expect(group.className).toContain('opacity-40');
    const done = screen.getByRole('region', { name: 'Terminé' });
    fireEvent.dragOver(done, { dataTransfer });
    expect(done.className).toContain('ring-2');
  });
});
