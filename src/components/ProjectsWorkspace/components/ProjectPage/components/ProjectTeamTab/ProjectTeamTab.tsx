import React from 'react';
import { ConfirmModal, DeleteIconButton, ErrorAlert, Panel, ProgressMeter, SelectField, StatusPill, UserIdentity } from '@mairie360/lib-components/primitives';
import { Users } from 'lucide-react';

import type { FilterOption } from '@/lib/projectPageState';
import type { ProjectMember, ProjectMemberRole } from '@/types/project';
import { AddMemberForm } from './components/AddMemberForm';

/** MAIR-1088: the roles of a project member, in French. */
export const MEMBER_ROLE_OPTIONS: { value: ProjectMemberRole; label: string }[] = [
  { value: 'manager', label: 'Responsable' },
  { value: 'contributor', label: 'Contributeur' },
  { value: 'reader', label: 'Lecteur' },
];
const roleLabel = (role: ProjectMemberRole) => MEMBER_ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;

/** « 2 tâches terminées sur 5 » and the share done, from the member's active tasks. */
export function memberLoad(member: Pick<ProjectMember, 'load'>) {
  const total = member.load?.tasksTotal ?? 0;
  const done = total - (member.load?.tasksOpen ?? 0);
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0, label: total ? `${done} tâche${done > 1 ? 's' : ''} terminée${done > 1 ? 's' : ''} sur ${total}` : 'Aucune tâche' };
}

export interface ProjectTeamTabProps {
  members: ProjectMember[];
  /** The owner of the project (`responsible`): never removed nor given another role. */
  ownerId?: string;
  /** Managers add, change the role of and remove members. */
  canManage: boolean;
  /** Agents of the page (`options.members`): those not in the team can be added. */
  memberOptions: FilterOption[];
  pendingId: string | null;
  error?: string;
  notice?: string;
  disabled?: boolean;
  onAdd: (userId: string, role: ProjectMemberRole, name: string) => Promise<boolean>;
  onChangeRole: (userId: string, role: ProjectMemberRole) => Promise<boolean>;
  onRemove: (userId: string) => Promise<boolean>;
}

/**
 * MAIR-874 (C1, Figma F8) « Équipe »: each member with their role and their load (tasks done / total, `ProgressMeter`);
 * a manager adds an agent with a role, changes a role and removes a member after confirmation. The owner stays.
 */
export const ProjectTeamTab = ({ members, ownerId, canManage, memberOptions, pendingId, error, notice, disabled = false, onAdd, onChangeRole, onRemove }: ProjectTeamTabProps) => {
  const [pendingRemoval, setPendingRemoval] = React.useState<ProjectMember | null>(null);
  const busy = disabled || pendingId !== null;
  const candidates = memberOptions.filter((option) => option.value && !members.some((member) => member.id === option.value));
  return (
    <div className="space-y-6">
      {notice && <p role="status" className="text-sm font-medium text-[var(--mairie-text)]">{notice}</p>}
      {error && <ErrorAlert title="Équipe non modifiée" description={error} />}
      <Panel
        title="Équipe"
        description={`${members.length} membre${members.length > 1 ? 's' : ''}`}
        icon={Users}
        state={members.length ? 'default' : 'empty'}
        stateProps={{ title: 'Aucun membre', description: canManage ? 'Ajoutez les agents qui travaillent sur le projet.' : 'Le projet n’a pas encore d’équipe.' }}
      >
        <ul className="divide-y divide-[var(--mairie-border)]" aria-label="Membres du projet">
          {members.map((member) => {
            const owner = member.id === ownerId;
            const load = memberLoad(member);
            return (
              <li key={member.id} aria-busy={pendingId === member.id || undefined} className="grid grid-cols-1 items-center gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_180px_minmax(160px,220px)_auto]">
                <span className="flex min-w-0 items-center gap-2">
                  <UserIdentity name={member.name} variant="nameOnly" size="s" avatarSrc={member.avatarUrl ?? undefined} />
                  {owner && <StatusPill label="Responsable du projet" tone="info" size="s" />}
                </span>
                {canManage && !owner ? (
                  <SelectField
                    id={`team-role-${member.id}`}
                    label={`Rôle de ${member.name}`}
                    value={member.role}
                    options={MEMBER_ROLE_OPTIONS}
                    placeholder={null}
                    disabled={busy}
                    onChange={(role) => { if (role !== member.role) void onChangeRole(member.id, role); }}
                  />
                ) : (
                  <span className="text-sm text-[var(--mairie-text)]">{roleLabel(member.role)}</span>
                )}
                <ProgressMeter label={load.label} value={load.percent} size="s" />
                <span className="flex justify-end">
                  {canManage && !owner && <DeleteIconButton label={`Retirer ${member.name} de l’équipe`} size="s" disabled={busy} onClick={() => setPendingRemoval(member)} />}
                </span>
              </li>
            );
          })}
        </ul>
      </Panel>
      {canManage && (
        <Panel title="Ajouter un membre" description="L’agent voit le projet dès qu’il rejoint l’équipe.">
          <AddMemberForm candidates={candidates} roleOptions={MEMBER_ROLE_OPTIONS} pending={pendingId !== null && !members.some((member) => member.id === pendingId)} onAdd={onAdd} />
        </Panel>
      )}
      <ConfirmModal
        open={pendingRemoval !== null}
        title="Retirer le membre ?"
        message={pendingRemoval ? `${pendingRemoval.name} ne fera plus partie de l’équipe ; ses tâches du projet ne lui seront plus assignées.` : ''}
        confirmLabel="Retirer"
        busy={pendingRemoval !== null && pendingId === pendingRemoval.id}
        initialFocus="cancel"
        onCancel={() => setPendingRemoval(null)}
        onConfirm={async () => {
          if (!pendingRemoval) return;
          await onRemove(pendingRemoval.id);
          setPendingRemoval(null);
        }}
      />
    </div>
  );
};
