'use client';

import React from 'react';
import { CircleDot } from 'lucide-react';
import { NO_MARKUP_HINT, NO_MARKUP_PATTERN } from '@/lib/text-constraints';
import { TaskCreationNotice } from '../../../TaskCreationNotice';
import { CompactMultiSelect } from './components/CompactMultiSelect';
import { TaskComposerFields } from './components/TaskComposerFields';
import { TaskComposerTrigger } from './components/TaskComposerTrigger';
import { useTaskComposer, type TaskComposerProps } from './use-task-composer';

function TaskComposerForm(props: TaskComposerProps) {
  const { project, creationState, onInspect, onAddTask } = props;
  const composer = useTaskComposer(props);
  const inspect = onInspect ? () => onInspect(project.id) : undefined;

  if (!onAddTask || project.permissions?.canCreateTask === false) return null;

  if (!composer.open) {
    return <TaskComposerTrigger creationState={creationState} blocked={composer.creationBlocked} onInspect={inspect} onOpen={() => composer.setOpen(true)} />;
  }

  return (
    <form
      className="mt-3 rounded-md border border-[#d0d7de] bg-[#f6f8fa] p-2.5 shadow-sm"
      aria-label="Créer une tâche"
      aria-busy={composer.saving}
      onClick={(event) => event.stopPropagation()}
      onSubmit={(event) => {
        event.preventDefault();
        void composer.submitTask();
      }}
    >
      <fieldset disabled={composer.saving} className="min-w-0 border-0 p-0">
      <div className="flex items-center gap-2">
        <CircleDot className="h-4 w-4 shrink-0 text-[#1a7f37]" strokeWidth={2} />
        <input
          value={composer.title}
          autoFocus
          placeholder="Ajouter une tâche..."
          aria-label="Titre de la tâche"
          pattern={NO_MARKUP_PATTERN}
          title={NO_MARKUP_HINT}
          className="h-8 min-w-0 flex-1 rounded-md border border-[#d0d7de] bg-white px-2 text-sm text-[#24292f] outline-none transition placeholder:text-[#6e7781] focus:border-[#0969da] focus:ring-2 focus:ring-[#0969da]/20"
          onChange={(event) => {
            composer.update({ title: event.target.value });
            composer.clearError();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              composer.close();
            }
          }}
        />
      </div>

      {composer.error && !composer.creationBlocked && <p role="alert" className="mt-2 text-xs font-medium text-[#cf222e]">{composer.error}</p>}
      <div ref={composer.noticeRef} tabIndex={-1} className="focus-visible:outline-2 focus-visible:outline-[#cf222e]">
        <TaskCreationNotice state={creationState} onInspect={inspect} />
      </div>
      {composer.saving && <p role="status" className="mt-2 text-xs text-[#57606a]">Enregistrement de la tâche…</p>}

      {composer.statusLoading && <p className="mt-2 text-xs text-[#536171]">Chargement des statuts du projet…</p>}
      {composer.statusUnavailable && <p className="mt-2 text-xs text-[#536171]">Statuts personnalisés indisponibles ; les catégories standard restent disponibles.</p>}
      <TaskComposerFields
        statuses={composer.dynamicStatuses}
        statusId={composer.statusId}
        status={composer.status}
        priority={composer.priority}
        dueDate={composer.dueDate}
        onChange={composer.update}
      />

      <div className="mt-2">
        <CompactMultiSelect label="Assignés" values={composer.assignees} options={composer.availableMembers} onChange={(assignees) => composer.update({ assignees })} />
      </div>

      <div className="mt-2">
        <CompactMultiSelect label="Étiquettes" values={composer.labels} options={composer.availableLabels} onChange={(labels) => composer.update({ labels })} />
      </div>

      <div className="mt-2 flex items-center justify-end gap-2">
        <button
          type="button"
          className="inline-flex h-8 items-center rounded-md border border-[#d0d7de] bg-white px-3 text-xs font-semibold text-[#24292f] transition hover:bg-[#f6f8fa]"
          onClick={() => composer.setOpen(false)}
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={composer.creationBlocked || creationState?.pending}
          className="inline-flex h-8 items-center rounded-md border border-[#2da44e] bg-[#2da44e] px-3 text-xs font-semibold text-white transition hover:bg-[#2c974b] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Ajouter
        </button>
      </div>
      </fieldset>
    </form>
  );
}

export function TaskComposer(props: TaskComposerProps) {
  return <TaskComposerForm key={props.project.id} {...props} />;
}
