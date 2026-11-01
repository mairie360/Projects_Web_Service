import React from 'react';
import type { ProjectWorkflowPort, TaskStatusDefinition } from '@/lib/projectWorkflow';
import type { Project, ProjectTaskDraft } from '@/types/project';
import { createPersonFromOptionValue, getPersonValue, type TaskFormState } from '@/lib/projectPageState';
import { getBffProjectErrorMessage } from '@/lib/bffProjectClient';
import { NEW_TASK_VERIFICATION_MESSAGE } from '@/lib/projectTaskVerification';
import type { SelectOption } from '../../project-card-types';
import type { TaskCreationState } from '../../../TaskCreationNotice';

export type TaskComposerProps = {
  project: Project;
  workflowPort?: ProjectWorkflowPort;
  creationState?: TaskCreationState;
  onInspect?: (projectId: string) => void | Promise<void>;
  onPreserveDraft?: (projectId: string, patch: Partial<TaskFormState>) => void;
  memberOptions?: SelectOption[];
  labelOptions?: SelectOption[];
  onAddTask?: (project: Project, task: ProjectTaskDraft) => void | Promise<void>;
};

// Draft, project statuses read and submission of the card's quick task form.
export function useTaskComposer({ project, workflowPort, creationState, onPreserveDraft, memberOptions = [], labelOptions = [], onAddTask }: TaskComposerProps) {
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState(creationState?.draft?.title ?? '');
  const [status, setStatus] = React.useState<Project['status']>(creationState?.draft?.status ?? project.status);
  const [dynamicStatuses, setDynamicStatuses] = React.useState<TaskStatusDefinition[] | null>(null);
  const [statusId, setStatusId] = React.useState(creationState?.draft?.statusId ?? '');
  const [statusLoading, setStatusLoading] = React.useState(false);
  const [statusUnavailable, setStatusUnavailable] = React.useState(false);
  React.useEffect(() => {
    if (!open || !workflowPort) return;
    const controller = new AbortController();
    void Promise.resolve().then(async () => {
      if (controller.signal.aborted) return;
      setStatusLoading(true); setStatusUnavailable(false);
      try {
        // Choosing a status needs the statuses alone, not the project detail and its archived tasks.
        const statuses = workflowPort.readStatuses
          ? await workflowPort.readStatuses(project.id, controller.signal)
          : (await workflowPort.readProject(project.id, controller.signal)).statuses;
        if (!controller.signal.aborted) setDynamicStatuses(statuses);
      } catch { if (!controller.signal.aborted) setStatusUnavailable(true); }
      finally { if (!controller.signal.aborted) setStatusLoading(false); }
    });
    return () => controller.abort();
  }, [open, workflowPort, project.id]);
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
      setStatusId('');
      setPriority(project.priority);
      setAssignees([getPersonValue(project.responsible)]);
      setLabels([]);
      setDueDate(project.dueDate);
      setError('');
    }
  }, [open, creationBlocked, project.dueDate, project.priority, project.responsible, project.status]);

  const availableMembers =
    memberOptions.length > 0
      ? memberOptions
      : project.assignees.map((assignee) => ({ label: assignee.name, value: getPersonValue(assignee) }));
  const availableLabels =
    labelOptions.length > 0 ? labelOptions : project.labels.map((label) => ({ label, value: label }));

  // Without an explicit choice, a task takes the project's first status of its default category.
  const defaultCategory = status === 'done' ? 'done' : status === 'todo' ? 'todo' : 'inprogress';
  const effectiveStatusId = dynamicStatuses?.some(item => item.id === statusId)
    ? statusId
    : dynamicStatuses?.find(item => item.category === defaultCategory)?.id ?? '';

  // One change of the draft: the matching field states, and the retained draft while creation is blocked.
  const update = (patch: Partial<TaskFormState>) => {
    if (patch.title !== undefined) setTitle(patch.title);
    if (patch.status !== undefined) setStatus(patch.status);
    if (patch.statusId !== undefined) setStatusId(patch.statusId);
    if (patch.priority !== undefined) setPriority(patch.priority);
    if (patch.assignees !== undefined) setAssignees(patch.assignees);
    if (patch.labels !== undefined) setLabels(patch.labels);
    if (patch.dueDate !== undefined) setDueDate(patch.dueDate);
    preserveDraft(patch);
  };

  const submitTask = async () => {
    if (!onAddTask || savingRef.current || creationState?.pending) return;
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
    if (statusLoading) { setError('Les statuts sont en cours de chargement.'); return; }
    if (dynamicStatuses && !effectiveStatusId) { setError('Choisissez un statut du projet.'); return; }

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
        ...(dynamicStatuses ? { statusId: effectiveStatusId } : {}),
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

  const close = () => { if (!savingRef.current) setOpen(false); };

  return {
    open, setOpen, close, title, status, statusId: effectiveStatusId, dynamicStatuses, statusLoading, statusUnavailable,
    priority, assignees, labels, dueDate, error, clearError: () => { if (error) setError(''); }, saving, noticeRef,
    creationBlocked, availableMembers, availableLabels, update, submitTask,
  };
}
