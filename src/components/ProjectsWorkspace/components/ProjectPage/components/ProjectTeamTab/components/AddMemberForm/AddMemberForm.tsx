import React from 'react';
import { Button, SelectField } from '@mairie360/lib-components/primitives';
import { UserPlus } from 'lucide-react';
import type { FilterOption } from '@/lib/projectPageState';
import type { ProjectMemberRole } from '@/types/project';

export interface AddMemberFormProps {
  /** Agents who may join (the current members are left out by the caller). */
  candidates: FilterOption[];
  roleOptions: { value: ProjectMemberRole; label: string }[];
  pending: boolean;
  onAdd: (userId: string, role: ProjectMemberRole, name: string) => Promise<boolean>;
}

/** MAIR-874 (C1, Figma F8): an agent and their role, then « Ajouter ». */
export const AddMemberForm = ({ candidates, roleOptions, pending, onAdd }: AddMemberFormProps) => {
  const [userId, setUserId] = React.useState('');
  const [role, setRole] = React.useState<ProjectMemberRole>('contributor');
  const [error, setError] = React.useState('');
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId) {
      setError('Choisissez l’agent à ajouter.');
      return;
    }
    setError('');
    const candidate = candidates.find((option) => option.value === userId);
    if (await onAdd(userId, role, candidate?.name ?? candidate?.label ?? 'L’agent')) setUserId('');
  };
  return (
    <form noValidate aria-label="Ajouter un membre" className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[minmax(0,1fr)_200px_auto]" onSubmit={submit}>
      <SelectField
        id="team-add-agent"
        label="Agent"
        value={userId}
        options={candidates}
        placeholder={candidates.length ? 'Choisir un agent' : 'Tous les agents sont déjà dans l’équipe'}
        error={error || undefined}
        disabled={pending || candidates.length === 0}
        onChange={(value) => { setUserId(value); setError(''); }}
      />
      <SelectField id="team-add-role" label="Rôle" value={role} options={roleOptions} placeholder={null} disabled={pending} onChange={setRole} />
      <Button type="submit" variant="solid" tone="primary" icon={UserPlus} label="Ajouter" loading={pending} disabled={candidates.length === 0} />
    </form>
  );
};
