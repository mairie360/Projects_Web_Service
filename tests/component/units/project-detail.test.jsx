import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DetailHeader } from '@/components/project/project-detail/DetailHeader';
import { DetailRefreshAlert } from '@/components/project/project-detail/DetailRefreshAlert';
import { ProjectLifecycle } from '@/components/project/project-detail/ProjectLifecycle';
import { ProjectSummary } from '@/components/project/project-detail/ProjectSummary';
import { TaskDeleteConfirm } from '@/components/project/project-detail/TaskDeleteConfirm';
import { TaskFilters } from '@/components/project/project-detail/TaskFilters';
import { TaskFollowUp } from '@/components/project/project-detail/TaskFollowUp';
import { TaskRow } from '@/components/project/project-detail/TaskRow';
import { priorityOptions, project, statusOptions, task } from './project-fixtures';

const rowProps = { linked: false, pending: false, blocked: false, mutationPending: false, toggleDisabled: false, statusValue: 'todo', statusOptions, deleting: false,
  onToggleDone: vi.fn(), onStatusChange: vi.fn(), onFollowUp: vi.fn(), onEdit: vi.fn(), onAskDelete: vi.fn() };

describe('MAIR-608 project detail sub-components', () => {
  it('DetailHeader shows the edit toggle only when the project is editable', async () => {
    const onToggleEdit = vi.fn(); const onClose = vi.fn();
    const { rerender } = render(<DetailHeader project={project()} titleId="t" editing={false} editDisabled={false} closeDisabled={false} onToggleEdit={onToggleEdit} onClose={onClose} />);
    expect(screen.getByRole('heading', { name: 'Rénovation de l’éclairage public' }).getAttribute('id')).toBe('t');
    await userEvent.click(screen.getByRole('button', { name: 'Modifier' }));
    await userEvent.click(screen.getByRole('button', { name: 'Fermer la fiche projet' }));
    expect(onToggleEdit).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    rerender(<DetailHeader project={project({ permissions: { canEdit: false } })} titleId="t" editing={false} editDisabled={false} closeDisabled onToggleEdit={onToggleEdit} onClose={onClose} />);
    expect(screen.queryByRole('button', { name: 'Modifier' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Fermer la fiche projet' }).disabled).toBe(true);
  });

  it('DetailRefreshAlert explains what stays visible and retries', async () => {
    const onRetry = vi.fn();
    const { rerender } = render(<DetailRefreshAlert error="Lecture refusée" verificationRequired={false} busy={false} retryDisabled={false} onRetry={onRetry} />);
    expect(screen.getByRole('alert').textContent).toContain('Les tâches confirmées restent affichées');
    await userEvent.click(screen.getByRole('button', { name: 'Réessayer la fiche' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    rerender(<DetailRefreshAlert error="Lecture refusée" verificationRequired busy retryDisabled onRetry={onRetry} />);
    expect(screen.getByRole('alert').textContent).toContain('Le dernier projet vérifié reste affiché');
    expect(screen.getByRole('button', { name: 'Actualisation de la fiche…' }).disabled).toBe(true);
  });

  it('TaskFilters reports each filter', () => {
    const handlers = { onSearchChange: vi.fn(), onStatusChange: vi.fn(), onPriorityChange: vi.fn(), onDueChange: vi.fn() };
    render(<TaskFilters search="" status="all" priority="all" due="" statusOptions={statusOptions} priorityOptions={priorityOptions} {...handlers} />);
    fireEvent.change(screen.getByRole('searchbox', { name: 'Rechercher une tâche' }), { target: { value: 'candé' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Filtrer les tâches par statut' }), { target: { value: 'done' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Filtrer les tâches par priorité' }), { target: { value: 'high' } });
    fireEvent.change(screen.getByLabelText('Échéance maximale des tâches'), { target: { value: '2026-11-30' } });
    expect([handlers.onSearchChange, handlers.onStatusChange, handlers.onPriorityChange, handlers.onDueChange].map(fn => fn.mock.calls[0][0]))
      .toEqual(['candé', 'done', 'high', '2026-11-30']);
  });

  it('TaskRow wires its actions and follows the task permissions', async () => {
    const props = { ...rowProps, onToggleDone: vi.fn(), onStatusChange: vi.fn(), onFollowUp: vi.fn(), onEdit: vi.fn(), onAskDelete: vi.fn() };
    const { rerender } = render(<TaskRow task={task()} {...props} writeError="Écriture refusée" />);
    await userEvent.click(screen.getByRole('button', { name: 'Marquer Relevé des candélabres comme terminée' }));
    await userEvent.click(screen.getByRole('button', { name: 'Suivi' }));
    await userEvent.click(screen.getByRole('button', { name: 'Supprimer Relevé des candélabres' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Statut de Relevé des candélabres' }), { target: { value: 'done' } });
    expect(props.onToggleDone).toHaveBeenCalledTimes(1);
    expect(props.onFollowUp).toHaveBeenCalledTimes(1);
    expect(props.onAskDelete).toHaveBeenCalledTimes(1);
    expect(props.onStatusChange).toHaveBeenCalledWith('done');
    expect(screen.getByRole('alert').textContent).toContain('Écriture refusée');
    rerender(<TaskRow task={task({ completed: true, permissions: { canView: true, canEdit: false, canDelete: false, canUpdateStatus: false, canComment: true } })} {...props} linked pending />);
    expect(screen.getByRole('button', { name: 'Marquer Relevé des candélabres comme non terminée' })).toBeTruthy();
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.queryByRole('button', { name: /Supprimer/ })).toBeNull();
    expect(screen.getByRole('article').getAttribute('aria-current')).toBe('true');
    expect(screen.getByRole('status').textContent).toContain('Opération sur la tâche en cours…');
  });

  it('TaskRow shows three people at most', () => {
    const many = ['A', 'B', 'C', 'D', 'E'].map(name => ({ name }));
    render(<TaskRow task={task({ assignees: many })} {...rowProps} />);
    expect(screen.getByText('+2')).toBeTruthy();
  });

  it('TaskDeleteConfirm cancels or confirms', async () => {
    const onCancel = vi.fn(); const onConfirm = vi.fn();
    render(<TaskDeleteConfirm cancelDisabled={false} confirmDisabled={false} onCancel={onCancel} onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    await userEvent.click(screen.getByRole('button', { name: 'Supprimer' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('TaskFollowUp lists comments and history, comments and refreshes after an error', async () => {
    const props = { taskTitle: 'Relevé', loading: false, saving: false, error: '', canComment: true, message: 'Vu', onMessageChange: vi.fn(), onRefresh: vi.fn(), onSubmit: vi.fn(event => event.preventDefault()) };
    const collaboration = { comments: [{ id: 'c1', author: { name: 'Alice' }, message: 'Posé', createdAt: '2026-10-02T10:00:00Z' }], history: [{ id: 'h1', label: 'Statut modifié', author: { name: 'Marie' }, createdAt: '2026-10-02T09:00:00Z' }] };
    const { rerender } = render(<TaskFollowUp {...props} collaboration={collaboration} />);
    expect(screen.getByText('Posé')).toBeTruthy();
    expect(screen.getByText('Statut modifié')).toBeTruthy();
    fireEvent.change(screen.getByRole('textbox', { name: 'Commentaire pour Relevé' }), { target: { value: 'Vu et validé' } });
    expect(props.onMessageChange).toHaveBeenCalledWith('Vu et validé');
    await userEvent.click(screen.getByRole('button', { name: 'Envoyer' }));
    expect(props.onSubmit).toHaveBeenCalledTimes(1);
    rerender(<TaskFollowUp {...props} collaboration={{ comments: [], history: [] }} canComment={false} error="Suivi indisponible" />);
    expect(screen.getByText('Aucun commentaire.')).toBeTruthy();
    expect(screen.getByText('Aucune modification enregistrée.')).toBeTruthy();
    expect(screen.queryByRole('textbox')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Actualiser le suivi' }));
    expect(props.onRefresh).toHaveBeenCalledTimes(1);
  });

  it('ProjectSummary and ProjectLifecycle show the project and its closing actions', async () => {
    const onSuspend = vi.fn(); const onClose = vi.fn();
    render(<><ProjectSummary project={project()} /><ProjectLifecycle disabled={false} onSuspend={onSuspend} onClose={onClose} /></>);
    expect(screen.getByText('Remplacer les lampes par des LED.')).toBeTruthy();
    expect(screen.getAllByText('Marie Durand').length).toBeGreaterThan(0);
    expect(screen.getByText('Énergie')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Suspendre' }));
    await userEvent.click(screen.getByRole('button', { name: 'Clôturer' }));
    expect(onSuspend).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
