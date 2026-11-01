'use client';
import React from 'react';
import { categoryLabels, type StatusMigration, type TaskStatusDefinition, type WorkflowTask } from '@/lib/projectWorkflow';

export const workflowControl = 'min-h-11 max-w-full rounded-md border border-[#d0d7de] bg-white px-3 py-2 text-sm text-[#24292f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1256a6] disabled:opacity-60';
export function StatusDefinitionEditor({ statuses, migrations = [], tasks = [], disabled, onChange }: {
  statuses: TaskStatusDefinition[]; migrations?: StatusMigration[]; tasks?: WorkflowTask[]; disabled?: boolean;
  onChange: (statuses: TaskStatusDefinition[], migrations: StatusMigration[]) => void;
}) {
  const prefix = React.useId();
  const [removing, setRemoving] = React.useState<string | null>(null);
  const [target, setTarget] = React.useState('');
  const sequence = React.useRef(0);
  const update = (id: string, patch: Partial<TaskStatusDefinition>) => onChange(statuses.map(status => status.id === id ? { ...status, ...patch } : status), migrations);
  const reorder = (index: number, delta: number) => {
    const next = [...statuses];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    onChange(next, migrations);
  };
  const remove = () => {
    if (!removing || !target || target === removing || !statuses.some(status => status.id === target)) return;
    const next = statuses.filter(status => status.id !== removing);
    onChange(next, [...migrations.filter(migration => migration.from !== removing).map(migration => ({ ...migration, to: migration.to === removing ? target : migration.to })), { from: removing, to: target }]);
    setRemoving(null);
    setTarget('');
  };
  return <fieldset disabled={disabled} className="min-w-0 space-y-4 border-0 p-0">
    <legend className="mb-3 font-semibold text-[#24292f]">Définition des statuts</legend>
    <p className="text-sm text-[#536171]">Conservez un statut par catégorie. Chaque nom doit être unique, sans caractères &lt; ou &gt;. Maximum : 30 statuts.</p>
    <ol className="space-y-3">{statuses.map((status, index) => <li key={status.id} className="min-w-0 rounded-md border border-[#d9d5d0] bg-[#fbfaf8] p-3">
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
        <label htmlFor={`${prefix}-${status.id}-name`} className="text-sm">Nom du statut {index + 1}<input id={`${prefix}-${status.id}-name`} value={status.name} required maxLength={100} className={`${workflowControl} mt-1 w-full`} onChange={event => update(status.id, { name: event.target.value })} /></label>
        <label htmlFor={`${prefix}-${status.id}-category`} className="text-sm">Catégorie du statut {index + 1}<select id={`${prefix}-${status.id}-category`} value={status.category} className={`${workflowControl} mt-1 w-full`} onChange={event => update(status.id, { category: event.target.value as TaskStatusDefinition['category'] })}>{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label htmlFor={`${prefix}-${status.id}-color`} className="text-sm">Couleur du statut {index + 1}<input id={`${prefix}-${status.id}-color`} type="color" value={status.color} className={`${workflowControl} mt-1 block w-20`} onChange={event => update(status.id, { color: event.target.value })} /></label>
        <div className="flex flex-wrap items-end gap-2">
          <button type="button" className={workflowControl} disabled={index === 0} aria-label={`Monter ${status.name}`} onClick={() => reorder(index, -1)}>↑</button>
          <button type="button" className={workflowControl} disabled={index === statuses.length - 1} aria-label={`Descendre ${status.name}`} onClick={() => reorder(index, 1)}>↓</button>
          <button type="button" className={workflowControl} disabled={statuses.filter(item => item.category === status.category).length < 2} onClick={() => { setRemoving(status.id); setTarget(''); }}>Supprimer {status.name}</button>
        </div>
      </div>
    </li>)}</ol>
    {removing && <div className="space-y-3 rounded-md border border-[#d0d7de] bg-white p-3" role="group" aria-label="Suppression du statut">
      <p className="text-sm">{(statuses.find(status => status.id === removing)?.taskCount ?? tasks.filter(task => task.statusId === removing || migrations.some(migration => migration.from === task.statusId && migration.to === removing)).length)} tâche(s) à déplacer. Le déplacement sera enregistré avec les statuts.</p>
      <label htmlFor={`${prefix}-migration`} className="block text-sm">Déplacer les tâches vers<select id={`${prefix}-migration`} value={target} className={`${workflowControl} mt-1 block w-full`} onChange={event => setTarget(event.target.value)}><option value="">Choisir un statut</option>{statuses.filter(status => status.id !== removing).map(status => <option key={status.id} value={status.id}>{status.name}</option>)}</select></label>
      <div className="flex flex-wrap gap-2"><button type="button" className={workflowControl} disabled={!target} onClick={remove}>Confirmer la suppression</button><button type="button" className={workflowControl} onClick={() => setRemoving(null)}>Conserver le statut</button></div>
    </div>}
    <button type="button" disabled={statuses.length >= 30} className={workflowControl} onClick={() => {
      if (statuses.length >= 30) return;
      let id: string;
      do { id = `draft-${++sequence.current}`; } while (statuses.some(status => status.id === id));
      let name = 'Nouveau statut';
      let suffix = 1;
      while (statuses.some(status => status.name === name)) name = `Nouveau statut ${++suffix}`;
      onChange([...statuses, { id, name, color: '#1256a6', category: 'todo' }], migrations);
    }}>Ajouter un statut</button>
  </fieldset>;
}
