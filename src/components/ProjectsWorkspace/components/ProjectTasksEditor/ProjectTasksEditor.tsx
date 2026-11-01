'use client';

import { ListChecks } from 'lucide-react';
import { archivedTasksLabel, type FilterOption, type ProjectFormState } from '@/lib/projectPageState';
import { DraftTaskRow } from './components/DraftTaskRow';
import { TaskDraftForm } from './components/TaskDraftForm';
import { useTaskDrafts } from './use-task-drafts';

export function ProjectTasksEditor({
  form,
  memberOptions,
  labelOptions,
  statusOptions,
  priorityOptions,
  onChange,
}: {
  form: ProjectFormState;
  memberOptions: FilterOption[];
  labelOptions: FilterOption[];
  statusOptions: FilterOption[];
  priorityOptions: FilterOption[];
  onChange: (patch: Partial<ProjectFormState>) => void;
}) {
  const drafts = useTaskDrafts({ form, memberOptions, onChange });

  return (
    <section className="overflow-hidden rounded-md border border-[#d9d5d0] bg-[#fbfaf8]">
      <div className="flex items-center justify-between border-b border-[#dedbd6] bg-[#f1eee9] px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#24292f]">
          <ListChecks className="h-4 w-4 text-[#57606a]" strokeWidth={1.8} />
          Tâches
        </div>
        <span className="text-xs font-medium text-[#57606a]">
          {form.completedTasks}/{form.totalTasks}
          {form.archivedTasks > 0 && ` · ${archivedTasksLabel(form.archivedTasks)}`}
        </span>
      </div>

      <TaskDraftForm
        form={drafts.taskForm}
        dueDate={drafts.taskDueDate}
        editing={!!drafts.editingTaskId}
        error={drafts.taskFormError}
        responsible={form.responsible}
        memberOptions={memberOptions}
        labelOptions={labelOptions}
        statusOptions={statusOptions}
        priorityOptions={priorityOptions}
        onChange={drafts.updateTaskForm}
        onSave={drafts.saveTask}
        onCancel={drafts.cancelTaskEdit}
      />

      {form.taskItems.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-[#57606a]">Aucune tâche pour ce projet.</div>
      ) : (
        <div className="divide-y divide-[#d8dee4]">
          {form.taskItems.map((task) => (
            <DraftTaskRow key={task.id} task={task} onToggle={() => drafts.toggleTask(task.id)} onEdit={() => drafts.editTask(task)} />
          ))}
        </div>
      )}
    </section>
  );
}
