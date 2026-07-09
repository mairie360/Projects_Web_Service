'use client';

import React from 'react';
import { CheckCircle2, CircleDot, Plus, Tag } from 'lucide-react';

import type { Project, ProjectTaskDraft } from '../../types/project';
import { createPersonFromOptionValue, getPersonValue } from '../../lib/projectPageState';
import type { SelectOption } from './types';

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
  const selectedOptions = options.filter((option) => values.includes(option.value));

  React.useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (fieldRef.current && !fieldRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
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
        type="button"
        className="flex h-8 w-full items-center justify-between gap-2 rounded-md border border-[#d0d7de] bg-white px-2 text-left text-xs text-[#24292f] outline-none transition hover:bg-[#f6f8fa] focus-visible:border-[#0969da] focus-visible:ring-2 focus-visible:ring-[#0969da]/20"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={selectedOptions.length > 0 ? 'truncate' : 'truncate text-[#6e7781]'}>
          {selectedOptions.length > 0 ? `${selectedOptions.length} sélectionné(s)` : label}
        </span>
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
  memberOptions = [],
  labelOptions = [],
  onAddTask,
}: {
  project: Project;
  memberOptions?: SelectOption[];
  labelOptions?: SelectOption[];
  onAddTask?: (project: Project, task: ProjectTaskDraft) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState('');
  const [status, setStatus] = React.useState<Project['status']>(project.status);
  const [priority, setPriority] = React.useState<Project['priority']>(project.priority);
  const [assignees, setAssignees] = React.useState<string[]>([getPersonValue(project.responsible)]);
  const [labels, setLabels] = React.useState<string[]>([]);
  const [dueDate, setDueDate] = React.useState(project.dueDate);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (!open) {
      setTitle('');
      setStatus(project.status);
      setPriority(project.priority);
      setAssignees([getPersonValue(project.responsible)]);
      setLabels([]);
      setDueDate(project.dueDate);
      setError('');
    }
  }, [open, project.dueDate, project.priority, project.responsible, project.status]);

  React.useEffect(() => {
    setStatus(project.status);
    setPriority(project.priority);
    setAssignees([getPersonValue(project.responsible)]);
    setDueDate(project.dueDate);
  }, [project.dueDate, project.priority, project.responsible, project.status]);

  if (!onAddTask) return null;

  const availableMembers =
    memberOptions.length > 0
      ? memberOptions
      : project.assignees.map((assignee) => ({ label: assignee.name, value: getPersonValue(assignee) }));
  const availableLabels =
    labelOptions.length > 0 ? labelOptions : project.labels.map((label) => ({ label, value: label }));

  const submitTask = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Le titre de la tâche est obligatoire.');
      return;
    }

    const assigneeValues = Array.from(
      new Set((assignees.length > 0 ? assignees : [getPersonValue(project.responsible)]).filter(Boolean))
    );
    const selectedAssignees = assigneeValues.map((value) => createPersonFromOptionValue(value, availableMembers));

    onAddTask(project, {
      title: trimmedTitle,
      status,
      responsible: selectedAssignees[0] ?? project.responsible,
      assignees: selectedAssignees,
      priority,
      labels,
      dueDate,
    });
    setTitle('');
    setLabels([]);
    setError('');
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        type="button"
        className="mt-3 flex h-8 w-full items-center gap-2 rounded-md border border-dashed border-[#d0d7de] bg-[#f6f8fa] px-2.5 text-left text-xs font-semibold text-[#57606a] transition hover:border-[#0969da] hover:bg-[#ddf4ff] hover:text-[#0969da]"
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2} />
        Ajouter une tâche
      </button>
    );
  }

  return (
    <form
      className="mt-3 rounded-md border border-[#d0d7de] bg-[#f6f8fa] p-2.5 shadow-sm"
      onClick={(event) => event.stopPropagation()}
      onSubmit={(event) => {
        event.preventDefault();
        submitTask();
      }}
    >
      <div className="flex items-center gap-2">
        <CircleDot className="h-4 w-4 shrink-0 text-[#1a7f37]" strokeWidth={2} />
        <input
          value={title}
          autoFocus
          placeholder="Ajouter une tâche..."
          className="h-8 min-w-0 flex-1 rounded-md border border-[#d0d7de] bg-white px-2 text-sm text-[#24292f] outline-none transition placeholder:text-[#6e7781] focus:border-[#0969da] focus:ring-2 focus:ring-[#0969da]/20"
          onChange={(event) => {
            setTitle(event.target.value);
            if (error) setError('');
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              setOpen(false);
            }
          }}
        />
      </div>

      {error && <p className="mt-2 text-xs font-medium text-[#cf222e]">{error}</p>}

      <div className="mt-2 grid grid-cols-2 gap-2">
        <select value={status} className={compactFieldClassName} onChange={(event) => setStatus(event.target.value as Project['status'])}>
          <option value="todo">À faire</option>
          <option value="in-progress">En cours</option>
          <option value="review">En révision</option>
          <option value="done">Terminé</option>
        </select>
        <select
          value={priority}
          className={compactFieldClassName}
          onChange={(event) => setPriority(event.target.value as Project['priority'])}
        >
          <option value="high">Haute</option>
          <option value="medium">Moyenne</option>
          <option value="low">Basse</option>
        </select>
        <input type="date" value={dueDate} className={compactFieldClassName} onChange={(event) => setDueDate(event.target.value)} />
      </div>

      <div className="mt-2">
        <CompactMultiSelect label="Assignés" values={assignees} options={availableMembers} onChange={setAssignees} />
      </div>

      <div className="mt-2">
        <CompactMultiSelect label="Étiquettes" values={labels} options={availableLabels} onChange={setLabels} />
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
          className="inline-flex h-8 items-center rounded-md border border-[#2da44e] bg-[#2da44e] px-3 text-xs font-semibold text-white transition hover:bg-[#2c974b]"
        >
          Ajouter
        </button>
      </div>
    </form>
  );
}
