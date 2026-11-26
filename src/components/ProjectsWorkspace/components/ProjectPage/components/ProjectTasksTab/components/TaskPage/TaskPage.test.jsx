import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import fixtures from '../../../../../../../../../tests/support/bff-fixtures.cjs';
import { TaskPage } from './TaskPage';

const columns = [{ status: 'todo', label: 'À faire' }, { status: 'in-progress', label: 'En cours' }, { status: 'done', label: 'Terminé' }];
const collaboration = (taskId = null) => ({ taskId, loading: false, saving: false, error: '', collaboration: null, message: '', open: vi.fn(async () => undefined), refresh: vi.fn(), setMessage: vi.fn(), submit: vi.fn(), reset: vi.fn() });

describe('TaskPage (MAIR-1137 C15)', () => {
  it('shows the task with its breadcrumb, meta line, actions and « Informations », and reads its follow-up', async () => {
    const user = userEvent.setup();
    const project = fixtures.projectListItem();
    const task = { ...fixtures.projectTask(), dueDate: '2026-10-01' };
    const follow = collaboration();
    const handlers = { onBack: vi.fn(), onEdit: vi.fn(), onMove: vi.fn(), onDuplicate: vi.fn(), onDelete: vi.fn() };
    render(<TaskPage task={task} project={project} column="todo" columns={columns} overdue blocked={false} collaboration={follow} {...handlers} />);
    const page = within(screen.getByRole('article', { name: task.title }));
    expect(follow.open).toHaveBeenCalledWith(task.id);
    expect(page.getByRole('navigation', { name: 'Fil d’Ariane de la tâche' }).textContent).toContain('Tâche');
    const meta = page.getByRole('group', { name: 'Résumé de la tâche' });
    expect(within(meta).getByText('En retard')).toBeTruthy();
    expect(within(meta).getByText('Marie Durand')).toBeTruthy();
    expect(page.getByRole('region', { name: 'Informations de la tâche' }).textContent).toContain(project.title);
    expect(page.getByText('Aucune description pour l’instant.')).toBeTruthy();
    await user.click(page.getByRole('button', { name: 'Marquer comme terminée' }));
    expect(handlers.onMove).toHaveBeenCalledWith('done');
    await user.click(page.getByRole('button', { name: 'Modifier', exact: true }));
    expect(handlers.onEdit).toHaveBeenCalled();
    await user.click(page.getByRole('button', { name: `Actions pour ${task.title}` }));
    await user.click(screen.getByRole('menuitem', { name: 'Dupliquer' }));
    expect(handlers.onDuplicate).toHaveBeenCalled();
    await user.click(page.getByRole('button', { name: new RegExp(`· ${project.title}, retour aux tâches$`) }));
    expect(handlers.onBack).toHaveBeenCalled();
  });

  it('MAIR-1198 shows the description of the task with its line breaks, and no empty state', () => {
    const task = { ...fixtures.projectTask(), description: 'Trois devis.\nAvant le conseil.' };
    const { container } = render(<TaskPage task={task} project={fixtures.projectListItem()} column="todo" columns={columns} overdue={false} blocked={false} collaboration={collaboration(task.id)} onBack={vi.fn()} onEdit={vi.fn()} />);
    const text = container.querySelector('[data-task-description]');
    expect(text.textContent).toBe('Trois devis.\nAvant le conseil.');
    expect(text.className).toContain('whitespace-pre-wrap');
    expect(screen.queryByText('Aucune description pour l’instant.')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Ajouter une description' })).toBeNull();
  });

  it('MAIR-1198 « Ajouter une description » opens the edit, and is not offered without the right to edit', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const task = { ...fixtures.projectTask(), description: '   ' };
    const props = { task, project: fixtures.projectListItem(), column: 'todo', columns, overdue: false, blocked: false, collaboration: collaboration(task.id), onBack: vi.fn() };
    const { rerender } = render(<TaskPage {...props} onEdit={onEdit} />);
    expect(screen.getByText('Aucune description pour l’instant.')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Ajouter une description' }));
    expect(onEdit).toHaveBeenCalled();
    rerender(<TaskPage {...props} />);
    expect(screen.getByText('Aucune description pour l’instant.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Ajouter une description' })).toBeNull();
  });

  it('offers « Rouvrir » for a done task and the state behind its pill', async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    const task = { ...fixtures.projectTask(), status: 'done' };
    render(<TaskPage task={task} project={fixtures.projectListItem()} column="done" columns={columns} overdue={false} blocked={false} collaboration={collaboration(task.id)} onBack={vi.fn()} onMove={onMove} />);
    await user.click(screen.getByRole('button', { name: 'Rouvrir' }));
    expect(onMove).toHaveBeenCalledWith('todo');
    await user.click(screen.getByRole('button', { name: 'État : Terminé, changer l’état' }));
    screen.getByRole('menuitemradio', { name: 'En cours' }).focus();
    await user.keyboard('{Enter}');
    expect(onMove).toHaveBeenLastCalledWith('in-progress');
  });
});

describe('MAIR-1226 TaskPage RGAA', () => {
  const render_ = (follow = collaboration()) => {
    const project = fixtures.projectListItem();
    const task = fixtures.projectTask();
    const view = render(<TaskPage task={task} project={project} column="todo" columns={columns} overdue={false} blocked={false} collaboration={follow} onBack={vi.fn()} />);
    return { ...view, project, task };
  };

  it('9.2: « Informations de la tâche » is a region, no complementary landmark inside main', () => {
    render_();
    expect(screen.queryByRole('complementary')).toBeNull();
    expect(screen.getByRole('region', { name: 'Informations de la tâche' })).toBeTruthy();
  });

  it('11.9: the back link is named by its visible text first', () => {
    const { project } = render_();
    const back = screen.getByRole('button', { name: new RegExp(`retour aux tâches$`) });
    expect(back.getAttribute('aria-label').startsWith(back.textContent.trim())).toBe(true);
    expect(back.textContent).toContain(project.title);
  });

  it('7.5: the activity loading is written into a status region that already existed', () => {
    const { rerender, project, task } = render_();
    const region = screen.getAllByRole('status').find((node) => node.textContent === 'Chargement de l’activité…');
    expect(region).toBeTruthy();
    rerender(<TaskPage task={task} project={project} column="todo" columns={columns} overdue={false} blocked={false} collaboration={collaboration(task.id)} onBack={vi.fn()} />);
    expect(region.isConnected).toBe(true);
    expect(region.textContent).toBe('');
  });
});
