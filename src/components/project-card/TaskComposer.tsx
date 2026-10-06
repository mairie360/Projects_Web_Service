'use client';

import React from 'react';
import { CheckCircle2, CircleDot, Plus, Tag } from 'lucide-react';

import type { Project, ProjectTaskDraft } from '../../types/project';
import { createPersonFromOptionValue, getPersonValue } from '../../lib/projectPageState';
import type { TaskFormState } from '../../lib/projectPageState';
import { getBffProjectErrorMessage } from '../../lib/bffProjectClient';
import type { SelectOption } from './types';
import { TaskCreationNotice, type TaskCreationState } from '../project/TaskCreationNotice';
import { NEW_TASK_VERIFICATION_MESSAGE } from '../../lib/projectTaskVerification';

const compactFieldClassName =
  'h-8 w-full rounded-md border border-[#d0d7de] bg-white px-2 text-xs text-[#24292f] outline-none transition focus:border-[#0969da] focus:ring-2 focus:ring-[#0969da]/20';

function CompactMultiSelect({
  label,
  values,
  options,
  onChange,
}: {
  label: string;
  values: string[];
  options: SelectOption[];
  onChange: (values: string[]) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const fieldRef = React.useRef<HTMLDivElement>(null);
  const openerRef = React.useRef<HTMLButtonElement>(null);
  const summaryId = React.useId();
  const selectedOptions = options.filter((option) => values.includes(option.value));

  React.useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (fieldRef.current && !fieldRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      const ownsFocus = fieldRef.current?.contains(document.activeElement);
      setOpen(false);
      if (ownsFocus) openerRef.current?.focus();
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const toggleValue = (value: string) => {
    if (values.includes(value)) {
      onChange(values.filter((currentValue) => currentValue !== value));
      return;
    }

    onChange([...values, value]);
  };

  return (
    <div ref={fieldRef} className="relative">
      <button
        ref={openerRef}
        type="button"
        className="flex h-8 w-full items-center justify-between gap-2 rounded-md border border-[#d0d7de] bg-white px-2 text-left text-xs text-[#24292f] outline-none transition hover:bg-[#f6f8fa] focus-visible:border-[#0969da] focus-visible:ring-2 focus-visible:ring-[#0969da]/20"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        aria-describedby={summaryId}
        onClick={() => setOpen((current) => !current)}
      >
        <span aria-hidden="true" className={selectedOptions.length > 0 ? 'truncate' : 'truncate text-[#6e7781]'}>
          {selectedOptions.length > 0 ? `${selectedOptions.length} sélectionné(s)` : label}
        </span>
        <span id={summaryId} className="sr-only">{selectedOptions.length} sélectionné(s)</span>
        <Tag className="h-3.5 w-3.5 shrink-0 text-[#57606a]" strokeWidth={1.8} />
      </button>

      {open && (
        <div
          className="absolute left-0 top-[calc(100%+4px)] z-[80] max-h-48 w-full overflow-y-auto rounded-md border border-[#d0d7de] bg-white py-1 shadow-[0_8px_24px_rgba(140,149,159,0.22)]"
          role="listbox"
          aria-label={label}
          aria-multiselectable="true"
        >
          {options.map((option) => {
            const selected = values.includes(option.value);

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                className="flex min-h-8 w-full items-center gap-2 px-2 py-1.5 text-left text-xs text-[#24292f] transition hover:bg-[#f6f8fa]"
                onClick={() => toggleValue(option.value)}
              >
                <span
                  className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                    selected ? 'border-[#0969da] bg-[#0969da] text-white' : 'border-[#d0d7de] bg-white text-transparent'
                  }`}
                >
                  <CheckCircle2 className="h-3 w-3" strokeWidth={2.4} />
                </span>
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function TaskComposer({
  project,
  creationState,
  onInspect,
  onPreserveDraft,
  memberOptions = [],
  labelOptions = [],
  onAddTask,
}: {
  project: Project;
  creationState?: TaskCreationState;
  onInspect?: (projectId: string) => void | Promise<void>;
  onPreserveDraft?: (projectId: string, patch: Partial<TaskFormState>) => void;
  memberOptions?: SelectOption[];
  labelOptions?: SelectOption[];
  onAddTask?: (project: Project, task: ProjectTaskDraft) => void | Promise<void>;
}) {
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState(creationState?.draft?.title ?? '');
  const [status, setStatus] = React.useState<Project['status']>(creationState?.draft?.status ?? project.status);
  const [priority, setPriority] = React.useState<Project['priority']>(creationState?.draft?.priority ?? project.priority);
  const [assignees, setAssignees] = React.useState<string[]>(creationState?.draft?.assignees ?? [getPersonValue(project.responsible)]);
  const [labels, setLabels] = React.useState<string[]>(creationState?.draft?.labels ?? []);
  const [dueDate, setDueDate] = React.useState(creationState?.draft?.dueDate ?? project.dueDate);
  const [error, setError] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const savingRef = React.useRef(false);
  const noticeRef = React.useRef<HTMLDivElement>(null);
  const creationBlocked = !!creationState?.uncertainTitle;
  const preserveDraft = (patch: Partial<TaskFormState>) => {
    if (creationBlocked) onPreserveDraft?.(project.id, patch);
  };

  React.useEffect(() => {
    if (open && creationBlocked && !saving) noticeRef.current?.focus();
  }, [open, creationBlocked, saving]);

  React.useEffect(() => {
    if (!open && !creationBlocked) {
      setTitle('');
      setStatus(project.status);
      setPriority(project.priority);
      setAssignees([getPersonValue(project.responsible)]);
      setLabels([]);
      setDueDate(project.dueDate);
      setError('');
    }
  }, [open, creationBlocked, project.dueDate, project.priority, project.responsible, project.status]);

  if (!onAddTask || project.permissions?.canCreateTask === false) return null;

  const availableMembers =
    memberOptions.length > 0
      ? memberOptions
      : project.assignees.map((assignee) => ({ label: assignee.name, value: getPersonValue(assignee) }));
  const availableLabels =
    labelOptions.length > 0 ? labelOptions : project.labels.map((label) => ({ label, value: label }));

  const submitTask = async () => {
    if (savingRef.current || creationState?.pending) return;
    if (creationBlocked) {
      setError(NEW_TASK_VERIFICATION_MESSAGE);
      noticeRef.current?.focus();
      return;
    }
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Le titre de la tâche est obligatoire.');
      return;
    }

    const assigneeValues = Array.from(
      new Set((assignees.length > 0 ? assignees : [getPersonValue(project.responsible)]).filter(Boolean))
    );
    const selectedAssignees = assigneeValues.map((value) => createPersonFromOptionValue(value, availableMembers));

    savingRef.current = true;
    setSaving(true);
    setError('');
    try {
      await onAddTask(project, {
        title: trimmedTitle,
        status,
        responsible: selectedAssignees[0] ?? project.responsible,
        assignees: selectedAssignees,
        priority,
        labels,
        dueDate,
      });
      setOpen(false);
    } catch (error) {
      setError(getBffProjectErrorMessage(error));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <div onClick={(event) => event.stopPropagation()}>
      <TaskCreationNotice state={creationState} onInspect={onInspect ? () => onInspect(project.id) : undefined} />
      <button
        type="button"
        disabled={creationState?.pending}
        aria-busy={!!creationState?.pending}
        className="mt-3 flex h-8 w-full items-center gap-2 rounded-md border border-dashed border-[#d0d7de] bg-[#f6f8fa] px-2.5 text-left text-xs font-semibold text-[#57606a] transition hover:border-[#0969da] hover:bg-[#ddf4ff] hover:text-[#0969da]"
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2} />
        {creationBlocked ? 'Création à inspecter' : 'Ajouter une tâche'}
      </button>
      </div>
    );
  }

  return (
    <form
      className="mt-3 rounded-md border border-[#d0d7de] bg-[#f6f8fa] p-2.5 shadow-sm"
      aria-label="Créer une tâche"
      aria-busy={saving}
      onClick={(event) => event.stopPropagation()}
      onSubmit={(event) => {
        event.preventDefault();
        void submitTask();
      }}
    >
      <fieldset disabled={saving} className="min-w-0 border-0 p-0">
      <div className="flex items-center gap-2">
        <CircleDot className="h-4 w-4 shrink-0 text-[#1a7f37]" strokeWidth={2} />
        <input
          value={title}
          autoFocus
          placeholder="Ajouter une tâche..."
          aria-label="Titre de la tâche"
          className="h-8 min-w-0 flex-1 rounded-md border border-[#d0d7de] bg-white px-2 text-sm text-[#24292f] outline-none transition placeholder:text-[#6e7781] focus:border-[#0969da] focus:ring-2 focus:ring-[#0969da]/20"
          onChange={(event) => {
            setTitle(event.target.value);
            preserveDraft({ title: event.target.value });
            if (error) setError('');
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              if (!savingRef.current) setOpen(false);
            }
          }}
        />
      </div>

      {error && !creationBlocked && <p role="alert" className="mt-2 text-xs font-medium text-[#cf222e]">{error}</p>}
      <div ref={noticeRef} tabIndex={-1} className="focus-visible:outline-2 focus-visible:outline-[#cf222e]">
        <TaskCreationNotice state={creationState} onInspect={onInspect ? () => onInspect(project.id) : undefined} />
      </div>
      {saving && <p role="status" className="mt-2 text-xs text-[#57606a]">Enregistrement de la tâche…</p>}

      <div className="mt-2 grid grid-cols-2 gap-2">
        <select aria-label="Statut" value={status} className={compactFieldClassName} onChange={(event) => { const value = event.target.value as Project['status']; setStatus(value); preserveDraft({ status: value }); }}>
          <option value="todo">À faire</option>
          <option value="in-progress">En cours</option>
          <option value="review">En révision</option>
          <option value="done">Terminé</option>
        </select>
        <select
          aria-label="Priorité"
          value={priority}
          className={compactFieldClassName}
          onChange={(event) => { const value = event.target.value as Project['priority']; setPriority(value); preserveDraft({ priority: value }); }}
        >
          <option value="high">Haute</option>
          <option value="medium">Moyenne</option>
          <option value="low">Basse</option>
        </select>
        <input aria-label="Échéance" type="date" value={dueDate} className={compactFieldClassName} onChange={(event) => { setDueDate(event.target.value); preserveDraft({ dueDate: event.target.value }); }} />
      </div>

      <div className="mt-2">
        <CompactMultiSelect label="Assignés" values={assignees} options={availableMembers} onChange={values => { setAssignees(values); preserveDraft({ assignees: values }); }} />
      </div>

      <div className="mt-2">
        <CompactMultiSelect label="Étiquettes" values={labels} options={availableLabels} onChange={values => { setLabels(values); preserveDraft({ labels: values }); }} />
      </div>

      <div className="mt-2 flex items-center justify-end gap-2">
        <button
          type="button"
          className="inline-flex h-8 items-center rounded-md border border-[#d0d7de] bg-white px-3 text-xs font-semibold text-[#24292f] transition hover:bg-[#f6f8fa]"
          onClick={() => setOpen(false)}
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={creationBlocked || creationState?.pending}
          className="inline-flex h-8 items-center rounded-md border border-[#2da44e] bg-[#2da44e] px-3 text-xs font-semibold text-white transition hover:bg-[#2c974b] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Ajouter
        </button>
      </div>
      </fieldset>
    </form>
  );
}
