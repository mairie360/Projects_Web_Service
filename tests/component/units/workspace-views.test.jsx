import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ProjectsEmptyState } from '@/components/project/views/ProjectsEmptyState';
import { ProjectFiltersBar } from '@/components/project/workspace/ProjectFiltersBar';
import { WorkspaceHeader, accessScopeLabel } from '@/components/project/workspace/WorkspaceHeader';
import { LogoutErrorNotice, PageReadError, VerificationNotice, WorkspaceLoading } from '@/components/project/workspace/WorkspaceNotices';
import { priorityOptions, statusOptions } from './project-fixtures';

describe('MAIR-608 workspace and views sub-components', () => {
  it('WorkspaceHeader names the access scope and shows create only when allowed', async () => {
    const onCreate = vi.fn(); const onSettings = vi.fn();
    const { rerender } = render(<WorkspaceHeader title="Projets" subtitle="Suivi" scope="team" onSettings={onSettings} />);
    expect(screen.getByText('Projets de mon équipe')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Nouveau projet' })).toBeNull();
    rerender(<WorkspaceHeader title="Projets" subtitle="Suivi" onCreate={onCreate} onSettings={onSettings} />);
    await userEvent.click(screen.getByRole('button', { name: 'Nouveau projet' }));
    await userEvent.click(screen.getByRole('button', { name: 'Paramètres' }));
    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onSettings).toHaveBeenCalledTimes(1);
    expect([accessScopeLabel('all'), accessScopeLabel('assigned')]).toEqual(['Tous les projets municipaux', 'Mes projets assignés']);
  });

  it('ProjectFiltersBar reports search, due date and filter opening', async () => {
    const handlers = { onSearchChange: vi.fn(), onStatusChange: vi.fn(), onPriorityChange: vi.fn(), onDueBeforeChange: vi.fn(), onOpenFilterChange: vi.fn(), onViewModeChange: vi.fn() };
    render(<ProjectFiltersBar search="" status="all" priority="all" dueBefore="" statusOptions={[{ label: 'Tous les statuts', value: 'all' }, ...statusOptions]}
      priorityOptions={[{ label: 'Toutes les priorités', value: 'all' }, ...priorityOptions]} openFilter={null} viewMode="kanban"
      views={[{ value: 'kanban', label: 'Kanban' }, { value: 'table', label: 'Tableau' }]} {...handlers} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'école' } });
    fireEvent.change(screen.getByLabelText('Échéance avant'), { target: { value: '2026-12-01' } });
    await userEvent.click(screen.getByRole('button', { name: 'Tous les statuts' }));
    await userEvent.click(screen.getByRole('tab', { name: /Tableau/ }));
    expect(handlers.onSearchChange).toHaveBeenCalledWith('école');
    expect(handlers.onDueBeforeChange).toHaveBeenCalledWith('2026-12-01');
    expect(handlers.onOpenFilterChange).toHaveBeenCalledWith('status');
    expect(handlers.onViewModeChange).toHaveBeenCalledWith('table');
  });

  it('workspace notices announce their state and act', async () => {
    const onBackToLogin = vi.fn(); const onVerify = vi.fn(); const onRetry = vi.fn();
    render(<>
      <WorkspaceLoading />
      <LogoutErrorNotice message="Déconnexion à vérifier" onBackToLogin={onBackToLogin} />
      <VerificationNotice title="Projet A" message="À vérifier" error="Lecture refusée" pending={false} label="Vérifier le projet Projet A" pendingLabel="Vérification…" onVerify={onVerify} />
      <PageReadError error="Projets indisponibles" stale loading={false} onRetry={onRetry} />
    </>);
    expect(screen.getByText('Chargement du tableau des projets...')).toBeTruthy();
    expect(screen.getByText('Lecture refusée')).toBeTruthy();
    expect(screen.getByText(/Dernières données reçues/)).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Retour à la connexion' }));
    await userEvent.click(screen.getByRole('button', { name: 'Vérifier le projet Projet A' }));
    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    expect([onBackToLogin, onVerify, onRetry].every(fn => fn.mock.calls.length === 1)).toBe(true);
  });

  it('pending notices disable their action', () => {
    render(<>
      <VerificationNotice title="Projet A" message="À vérifier" pending label="Vérifier" pendingLabel="Vérification du projet…" onVerify={vi.fn()} />
      <PageReadError error="Projets indisponibles" stale={false} loading onRetry={vi.fn()} />
    </>);
    expect(screen.getByRole('button', { name: 'Vérification du projet…' }).disabled).toBe(true);
    expect(screen.getByRole('button', { name: 'Réessayer' }).disabled).toBe(true);
    expect(screen.queryByText(/Dernières données reçues/)).toBeNull();
    expect(screen.getByText('Actualisation des projets...')).toBeTruthy();
  });

  it('ProjectsEmptyState says no project matches', () => {
    render(<ProjectsEmptyState />);
    expect(screen.getByText('Aucun projet à afficher')).toBeTruthy();
  });
});
