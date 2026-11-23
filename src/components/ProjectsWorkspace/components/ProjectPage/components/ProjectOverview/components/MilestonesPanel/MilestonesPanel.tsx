import React from 'react';
import { Button, Checkbox, ConfirmModal, DeleteIconButton, EditIconButton, ErrorAlert, Panel, StatusPill } from '@mairie360/lib-components/primitives';
import { CalendarDays, Flag, Plus } from 'lucide-react';

import { instanceToday } from '../../../../../../project-card-meta';
import { formatLongDate } from '../../../ProjectMetrics';
import type { Milestone } from '@/types/project';
import type { MilestoneInput } from '@/lib/bffProjectClient';
import { MilestoneForm } from './components/MilestoneForm';

/** MAIR-1086: « Atteint », « En retard » (day past, not reached) or « À venir », in the instance day. */
export function milestoneState(milestone: Milestone, today = instanceToday()) {
  if (milestone.reached) return { label: 'Atteint', tone: 'success' as const };
  if (milestone.dueDate < today) return { label: 'En retard', tone: 'danger' as const };
  return { label: 'À venir', tone: 'neutral' as const };
}

export interface MilestonesPanelProps {
  milestones: Milestone[];
  /** Milestones of the project; the page shows the first 100. */
  total: number;
  /** Managers add, edit, mark reached and delete milestones (BFF 403 for the others). */
  canManage: boolean;
  disabled?: boolean;
  pendingId?: string | null;
  error?: string;
  onAdd: (input: MilestoneInput) => Promise<boolean>;
  onUpdate: (milestoneId: string, patch: Partial<MilestoneInput>) => Promise<boolean>;
  onRemove: (milestoneId: string) => Promise<boolean>;
}

/** MAIR-846 (C6) / MAIR-1086 « Jalons »: key steps of the project, by date. */
export const MilestonesPanel = ({ milestones, total, canManage, disabled = false, pendingId = null, error, onAdd, onUpdate, onRemove }: MilestonesPanelProps) => {
  const [adding, setAdding] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [pendingDeletion, setPendingDeletion] = React.useState<Milestone | null>(null);
  const busy = disabled || pendingId !== null;
  const hidden = Math.max(0, total - milestones.length);
  const empty = milestones.length === 0 && !adding;

  return (
    <Panel
      title="Jalons"
      description="Étapes clés validées par la collectivité"
      icon={Flag}
      action={canManage && !adding ? <Button variant="outline" tone="neutral" size="s" icon={Plus} label="Ajouter un jalon" disabled={busy} onClick={() => { setEditingId(null); setAdding(true); }} /> : undefined}
      state={empty && !error ? 'empty' : 'default'}
      stateProps={{ title: 'Aucun jalon', description: canManage ? 'Ajoutez les étapes clés du projet.' : 'Le responsable du projet n’a pas encore fixé d’étapes clés.' }}
    >
      <div className="space-y-3">
        {error && <ErrorAlert title="Jalon non enregistré" description={error} />}
        {adding && (
          <MilestoneForm
            idPrefix="milestone-new"
            submitLabel="Ajouter le jalon"
            pending={pendingId === 'new'}
            onCancel={() => setAdding(false)}
            onSubmit={async (value) => { if (await onAdd(value)) setAdding(false); }}
          />
        )}
        <ul className="space-y-2" aria-label="Jalons du projet">
          {milestones.map((milestone) => {
            const state = milestoneState(milestone);
            if (editingId === milestone.id) {
              return (
                <li key={milestone.id}>
                  <MilestoneForm
                    idPrefix={`milestone-${milestone.id}`}
                    initial={milestone}
                    submitLabel="Enregistrer le jalon"
                    pending={pendingId === milestone.id}
                    onCancel={() => setEditingId(null)}
                    onSubmit={async (value) => { if (await onUpdate(milestone.id, value)) setEditingId(null); }}
                  />
                </li>
              );
            }
            return (
              <li key={milestone.id} aria-busy={pendingId === milestone.id || undefined} className="flex flex-wrap items-center gap-3 rounded-[var(--mairie-radius-m,8px)] bg-[var(--mairie-surface-muted,#f6f4f1)] px-3 py-2">
                {canManage ? (
                  <Checkbox label={milestone.title} checked={milestone.reached} disabled={busy} hint={milestone.reached ? 'Décochez pour rouvrir le jalon.' : undefined} onChange={(event) => void onUpdate(milestone.id, { reached: event.target.checked })} className="min-w-0 flex-1" />
                ) : (
                  <span className="min-w-0 flex-1 text-sm font-medium text-[var(--mairie-text)]">{milestone.title}</span>
                )}
                <StatusPill label={state.label} tone={state.tone} size="s" dot />
                <span className="inline-flex items-center gap-1 text-sm text-[var(--mairie-text-muted)]"><CalendarDays aria-hidden className="h-4 w-4" />{formatLongDate(milestone.dueDate)}</span>
                {canManage && (
                  <span className="flex gap-1">
                    <EditIconButton label={`Modifier le jalon ${milestone.title}`} size="s" disabled={busy} onClick={() => { setAdding(false); setEditingId(milestone.id); }} />
                    <DeleteIconButton label={`Supprimer le jalon ${milestone.title}`} size="s" disabled={busy} onClick={() => setPendingDeletion(milestone)} />
                  </span>
                )}
              </li>
            );
          })}
        </ul>
        {hidden > 0 && <p className="text-sm text-[var(--mairie-text-muted)]">{hidden === 1 ? '1 autre jalon, plus lointain.' : `${hidden} autres jalons, plus lointains.`}</p>}
      </div>
      <ConfirmModal
        open={pendingDeletion !== null}
        title="Supprimer le jalon ?"
        message={pendingDeletion ? `Le jalon « ${pendingDeletion.title} » sera retiré du projet.` : ''}
        confirmLabel="Supprimer"
        busy={pendingDeletion !== null && pendingId === pendingDeletion.id}
        initialFocus="cancel"
        onCancel={() => setPendingDeletion(null)}
        onConfirm={async () => {
          if (!pendingDeletion) return;
          await onRemove(pendingDeletion.id);
          setPendingDeletion(null);
        }}
      />
    </Panel>
  );
};
