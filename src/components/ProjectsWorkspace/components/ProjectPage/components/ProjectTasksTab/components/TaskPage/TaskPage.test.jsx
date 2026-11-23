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
    expect(page.getByRole('complementary', { name: 'Informations de la tâche' }).textContent).toContain(project.title);
    expect(page.getByText('Description non disponible')).toBeTruthy();
    await user.click(page.getByRole('button', { name: 'Marquer comme terminée' }));
    expect(handlers.onMove).toHaveBeenCalledWith('done');
    await user.click(page.getByRole('button', { name: 'Modifier', exact: true }));
    expect(handlers.onEdit).toHaveBeenCalled();
    await user.click(page.getByRole('button', { name: `Actions pour ${task.title}` }));
    await user.click(screen.getByRole('menuitem', { name: 'Dupliquer' }));
    expect(handlers.onDuplicate).toHaveBeenCalled();
    await user.click(page.getByRole('button', { name: `Retour aux tâches de ${project.title}` }));
    expect(handlers.onBack).toHaveBeenCalled();
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
