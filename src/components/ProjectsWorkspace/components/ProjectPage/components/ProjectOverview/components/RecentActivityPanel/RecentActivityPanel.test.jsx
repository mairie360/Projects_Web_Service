import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RecentActivityPanel } from './RecentActivityPanel';

const item = (overrides = {}) => ({ kind: 'status_changed', id: 'history-1', taskId: 'task-1', taskTitle: 'Relevé', author: { id: 'user-3', name: 'Marie Durand' }, message: null, changes: { status: { from: 'todo', to: 'done' } }, label: 'Statut modifié', createdAt: '2026-09-04T09:00:00.000Z', ...overrides });

describe('RecentActivityPanel (MAIR-1089)', () => {
  it('describes each entry with its author and its task', () => {
    render(<RecentActivityPanel items={[item(), item({ id: 'history-2', kind: 'task_created', author: null }), item({ id: 'history-3', kind: 'task_updated', label: 'Titre modifié' })]} loading={false} onRetry={vi.fn()} onShowAll={vi.fn()} />);
    expect(screen.getByText('Marie Durand a changé l’état de « Relevé »')).toBeTruthy();
    expect(screen.getByText('Statut modifié')).toBeTruthy();
    expect(screen.getByText('La plateforme a créé la tâche « Relevé »')).toBeTruthy();
    expect(screen.getByText('Marie Durand a modifié la tâche « Relevé »')).toBeTruthy();
  });

  it('shows the loading and the unavailable states', () => {
    const { rerender } = render(<RecentActivityPanel items={[]} loading onRetry={vi.fn()} onShowAll={vi.fn()} />);
    expect(screen.queryByText('Aucune activité')).toBeNull();
    expect(screen.getByText('Chargement de l’activité')).toBeTruthy();
    rerender(<RecentActivityPanel items={[]} loading={false} error="Le service des projets est temporairement indisponible." onRetry={vi.fn()} onShowAll={vi.fn()} />);
    expect(screen.getByText('Activité indisponible')).toBeTruthy();
  });
});
