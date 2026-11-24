import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProjectActionsMenu } from './ProjectActionsMenu';

const project = { id: 'project-1', title: 'Projet clavier', status: 'in-progress', permissions: { canView: true, canEdit: true, canDuplicate: true, canDelete: true } };

describe('ProjectActionsMenu', () => {
  it('MAIR-829: offers the V2 actions in the mockup order, without « Modifier »', async () => {
    render(<ProjectActionsMenu project={project} onOpen={vi.fn()} onDuplicate={vi.fn()} onDelete={vi.fn()} onChangeStatus={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Actions pour Projet clavier' }));
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['Ouvrir le projet', 'Dupliquer', 'Supprimer']);
    expect(screen.getAllByRole('menuitemradio').map((item) => item.textContent)).toEqual(['À faire', 'En cours', 'En revue', 'Suspendu', 'Terminé']);
    expect(screen.getByRole('menuitemradio', { name: 'En cours' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.queryByRole('menuitem', { name: 'Modifier' })).toBeNull();
  });

  it('MAIR-829: opens, duplicates and deletes the project', async () => {
    const onOpen = vi.fn(), onDuplicate = vi.fn(), onDelete = vi.fn();
    render(<ProjectActionsMenu project={project} onOpen={onOpen} onDuplicate={onDuplicate} onDelete={onDelete} />);
    const choose = async (name) => {
      await userEvent.click(screen.getByRole('button', { name: 'Actions pour Projet clavier' }));
      await userEvent.click(screen.getByRole('menuitem', { name }));
    };
    await choose('Ouvrir le projet');
    expect(onOpen).toHaveBeenCalledWith(project);
    await choose('Dupliquer');
    expect(onDuplicate).toHaveBeenCalledWith(project);
    await choose('Supprimer');
    expect(onDelete).toHaveBeenCalledWith(project);
  });

  it('MAIR-829: changes the status with a single choice and ignores the current one', async () => {
    const onChangeStatus = vi.fn();
    render(<ProjectActionsMenu project={project} onChangeStatus={onChangeStatus} />);
    await userEvent.click(screen.getByRole('button', { name: 'Actions pour Projet clavier' }));
    await userEvent.click(screen.getByRole('menuitemradio', { name: 'En cours' }));
    expect(onChangeStatus).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Actions pour Projet clavier' }));
    await userEvent.click(screen.getByRole('menuitemradio', { name: 'Terminé' }));
    expect(onChangeStatus).toHaveBeenCalledWith(project, 'done');
    await userEvent.click(screen.getByRole('button', { name: 'Actions pour Projet clavier' }));
    screen.getByRole('menuitemradio', { name: 'En revue' }).focus();
    await userEvent.keyboard('{Enter}');
    expect(onChangeStatus).toHaveBeenLastCalledWith(project, 'review');
  });

  it('hides the status choice without edit permission and the whole menu without any action', () => {
    const readOnly = { ...project, permissions: { canView: false, canEdit: false, canDuplicate: false, canDelete: false } };
    const { container } = render(<ProjectActionsMenu project={readOnly} onOpen={vi.fn()} onChangeStatus={vi.fn()} onDuplicate={vi.fn()} onDelete={vi.fn()} />);
    expect(container.textContent).toBe('');
  });

  it('blocks the duplication while one is pending or awaiting verification', async () => {
    const { rerender } = render(<ProjectActionsMenu project={project} onDuplicate={vi.fn()} duplicationPending />);
    await userEvent.click(screen.getByRole('button', { name: 'Actions pour Projet clavier' }));
    expect(screen.getByRole('menuitem', { name: 'Dupliquer' }).disabled).toBe(true);
    rerender(<ProjectActionsMenu project={project} onDuplicate={vi.fn()} duplicationVerificationRequired />);
    expect(screen.getByRole('menuitem', { name: 'Copie à vérifier' }).disabled).toBe(true);
  });
});

describe('ProjectActionsMenu on a closed project (MAIR-1200)', () => {
  const closed = { ...project, status: 'done', permissions: { canView: true, canEdit: false, canDuplicate: true, canDelete: true, canReopen: true } };

  it('offers « Rouvrir le projet en » with the open statuses instead of « Modifier » and « Changer le statut »', async () => {
    const onChangeStatus = vi.fn();
    render(<ProjectActionsMenu project={closed} onOpen={vi.fn()} onEdit={vi.fn()} onDuplicate={vi.fn()} onDelete={vi.fn()} onChangeStatus={onChangeStatus} />);
    await userEvent.click(screen.getByRole('button', { name: 'Actions pour Projet clavier' }));
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['Ouvrir le projet', 'Dupliquer', 'Supprimer']);
    expect(screen.getByText('Rouvrir le projet en')).toBeTruthy();
    expect(screen.queryByText('Changer le statut')).toBeNull();
    expect(screen.getAllByRole('menuitemradio').map((item) => item.textContent)).toEqual(['À faire', 'En cours', 'En revue', 'Suspendu']);
    await userEvent.click(screen.getByRole('menuitemradio', { name: 'Suspendu' }));
    expect(onChangeStatus).toHaveBeenCalledWith(closed, 'on-hold');
  });

  it('offers no status at all to whoever may not reopen it', async () => {
    const readOnly = { ...closed, permissions: { ...closed.permissions, canReopen: false } };
    render(<ProjectActionsMenu project={readOnly} onOpen={vi.fn()} onChangeStatus={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Actions pour Projet clavier' }));
    expect(screen.queryAllByRole('menuitemradio')).toEqual([]);
  });
});
