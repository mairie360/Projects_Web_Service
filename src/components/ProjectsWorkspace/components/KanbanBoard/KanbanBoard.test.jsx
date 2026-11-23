import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
    expect(screen.getByRole('region', { name: /^En cours/ })).toBeTruthy();
  });
});

describe('KanbanBoard V2 (MAIR-829)', () => {
  it('heads each column with its status, its count and a « + » opening the creation in that status', async () => {
    const onAddProject = vi.fn();
    const items = [fixtures.projectListItem({ id: 'project-1', status: 'review' }), fixtures.projectListItem({ id: 'project-2', status: 'review' })];
    render(<KanbanBoard projects={items} columns={columns} onAddProject={onAddProject} />);
    const review = screen.getByRole('region', { name: /^En revue/ });
    // MAIR-1134: the lib KanbanColumn heads it with its StatusPill and the count (« 2 cartes » for assistive technologies).
    expect(within(review).getAllByRole('heading', { level: 3 })[0].textContent).toBe('En revue, 2 cartes');
    fireEvent.click(within(review).getByRole('button', { name: 'Ajouter dans En revue' }));
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
    const done = screen.getByRole('region', { name: /^Terminé/ });
    fireEvent.dragOver(done, { dataTransfer });
    expect(done.getAttribute('data-drop-active')).toBe('true');
  });

  it('folds a column from its chevron, remembers it in the browser and still takes a drop (MAIR-1134)', async () => {
    window.localStorage.clear();
    const onMoveProject = vi.fn().mockResolvedValue(undefined);
    const item = fixtures.projectListItem({ status: 'todo' });
    const view = render(<KanbanBoard projects={[item]} columns={columns} onMoveProject={onMoveProject} />);
    await userEvent.click(screen.getByRole('button', { name: 'Replier la colonne Terminé' }));
    expect(screen.getByRole('button', { name: 'Déplier la colonne Terminé' }).getAttribute('aria-expanded')).toBe('false');
    expect(JSON.parse(window.localStorage.getItem('m360-collapsed-projects'))).toEqual(['done']);
    const payload = new Map();
    const dataTransfer = { setData: (type, value) => payload.set(type, value), getData: (type) => payload.get(type) ?? '' };
    fireEvent.dragStart(screen.getByRole('group', { name: item.title }), { dataTransfer });
    const done = screen.getByRole('region', { name: /^Terminé/ });
    fireEvent.dragOver(done, { dataTransfer });
    fireEvent.drop(done, { dataTransfer });
    await waitFor(() => expect(onMoveProject).toHaveBeenCalledWith(item, 'done'));
    view.unmount();
    render(<KanbanBoard projects={[item]} columns={columns} />);
    expect(await screen.findByRole('button', { name: 'Déplier la colonne Terminé' })).toBeTruthy();
    window.localStorage.clear();
  });

  it('offers « Modifier » in the card menu (MAIR-1134 C14)', async () => {
    const onProjectEdit = vi.fn();
    const item = fixtures.projectListItem({ status: 'todo' });
    render(<KanbanBoard projects={[item]} columns={columns} onProjectEdit={onProjectEdit} onProjectOpen={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: `Actions pour ${item.title}` }));
    const items = screen.getAllByRole('menuitem').map((entry) => entry.textContent);
    expect(items.slice(0, 2)).toEqual(['Ouvrir le projet', 'Modifier']);
    await userEvent.click(screen.getByRole('menuitem', { name: 'Modifier' }));
    expect(onProjectEdit).toHaveBeenCalledWith(item);
  });
});
