'use client';

import React from 'react';
import { type FilterOption, type ProjectFormState } from '@/lib/projectPageState';
import { CreateProjectFeedback } from './components/CreateProjectFeedback';
import { CreateProjectFooter } from './components/CreateProjectFooter';
import { ProjectMainFields } from './components/ProjectMainFields';
import { ProjectSideFields } from './components/ProjectSideFields';
import { ProjectTasksEditor } from '../ProjectTasksEditor';
import { ProjectTemplatePicker } from './components/ProjectTemplatePicker';
import type { ProjectTemplate, ProjectWorkflowPort } from '@/lib/projectWorkflow';
import { PROJECT_VERIFICATION_MESSAGE } from '@/lib/projectReceiptVerification';
import { IconButton } from '@mairie360/lib-components/primitives';
import { PROJECT_FIELD_IDS, validateProjectForm, type ProjectFieldErrors } from './project-form-validation';

export function CreateProjectModal({
  mode,
  workflowPort,
  form,
  error,
  pending = false,
  verificationRequired = false,
  verificationPending = false,
  verificationError,
  verificationMessage = PROJECT_VERIFICATION_MESSAGE,
  verificationLabel = 'Vérifier le projet',
  verificationPendingLabel = 'Vérification du projet…',
  confirmedCreationTitle,
  canSave = true,
  onVerify,
  memberOptions,
  labelOptions,
  groupOptions,
  groupsError,
  statusOptions,
  priorityOptions,
  onChange,
  onClose,
  onInteract,
  onSubmit,
}: {
  mode: 'create' | 'edit';
  workflowPort?: ProjectWorkflowPort;
  form: ProjectFormState;
  error: string;
  pending?: boolean;
  verificationRequired?: boolean;
  verificationPending?: boolean;
  verificationError?: string;
  verificationMessage?: string;
  verificationLabel?: string;
  verificationPendingLabel?: string;
  confirmedCreationTitle?: string;
  canSave?: boolean;
  onVerify?: () => void | Promise<void>;
  memberOptions: FilterOption[];
  labelOptions: FilterOption[];
  groupOptions?: FilterOption[];
  groupsError?: string;
  statusOptions: FilterOption[];
  priorityOptions: FilterOption[];
  onChange: (patch: Partial<ProjectFormState>) => void;
  onClose: () => void;
  onInteract?: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>, template?: ProjectTemplate) => void;
}) {
  const [template, setTemplate] = React.useState<ProjectTemplate | undefined>();
  const [fieldErrors, setFieldErrors] = React.useState<ProjectFieldErrors>({});
  const isEditMode = mode === 'edit';
  const creationConfirmed = !isEditMode && confirmedCreationTitle !== undefined;
  const submitBlocked = pending || verificationRequired || verificationPending || creationConfirmed || !canSave;
  const overlayRef = React.useRef<HTMLDivElement>(null);
  const dialogRef = React.useRef<HTMLFormElement>(null);
  const verificationFeedbackRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();
  const feedbackId = React.useId();
  const responsibleOptions = [{ label: 'Choisir un responsable', value: '' }, ...memberOptions];

  // A corrected field loses its message at once; the others keep theirs until the next submit.
  const changeForm = (patch: Partial<ProjectFormState>) => {
    setFieldErrors((current) => {
      // A team member satisfies the « Responsable » rule as well.
      const touched = [...Object.keys(patch), ...('assignees' in patch ? ['responsible'] : [])].filter((key) => key in current);
      if (touched.length === 0) return current;
      const next = { ...current };
      for (const key of touched) delete next[key as keyof ProjectFieldErrors];
      return next;
    });
    onChange(patch);
  };

  // MAIR-836 (Figma F3 3.3): the messages under Titre, Groupe and Échéance replace the browser bubbles; the
  // first field in error gets the focus and nothing is sent.
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    const errors = validateProjectForm(form, { creating: !isEditMode, groupCount: groupOptions?.length ?? 0 });
    const first = (Object.keys(PROJECT_FIELD_IDS) as (keyof ProjectFieldErrors)[]).find((key) => errors[key]);
    setFieldErrors(errors);
    if (first) {
      event.preventDefault();
      document.getElementById(PROJECT_FIELD_IDS[first])?.focus();
      return;
    }
    onSubmit(event, template);
  };

  React.useLayoutEffect(() => {
    if (typeof document === 'undefined' || typeof HTMLElement === 'undefined') return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overlay = overlayRef.current;
    dialogRef.current?.focus();
    return () => {
      if (opener?.isConnected && (overlay?.contains(document.activeElement) || document.activeElement === document.body)) {
        opener.focus();
      }
    };
  }, []);

  React.useLayoutEffect(() => {
    if (pending) dialogRef.current?.focus();
  }, [pending]);

  React.useLayoutEffect(() => {
    // After acceptance stops saving, bring the non-retryable confirmation
    // warning into the scrolling body. Later read retries must not steal typing.
    if ((verificationRequired || creationConfirmed) && !pending) verificationFeedbackRef.current?.focus();
  }, [verificationRequired, creationConfirmed, pending]);

  const handleDialogKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
    if (event.defaultPrevented || event.nativeEvent.isComposing) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      if (!pending) onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter((element) => {
      const style = window.getComputedStyle(element);
      return element.tabIndex >= 0 && !element.matches(':disabled') && !element.closest('[hidden], [aria-hidden="true"]') &&
        style.display !== 'none' && style.visibility !== 'hidden';
    });
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first) {
      event.preventDefault();
      dialog.focus();
    } else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div ref={overlayRef} className="fixed inset-0 z-[70] flex items-center justify-center bg-[var(--mairie-overlay-background)]/35 p-4">
      <form
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={pending || error || verificationRequired || creationConfirmed ? feedbackId : undefined}
        aria-busy={pending}
        tabIndex={-1}
        onKeyDown={handleDialogKeyDown}
        onKeyDownCapture={onInteract}
        onPointerDownCapture={onInteract}
        onChangeCapture={onInteract}
        noValidate
        className="flex max-h-[92vh] w-full max-w-[720px] flex-col overflow-hidden rounded-[var(--mairie-radius-l)] bg-[var(--mairie-surface)] shadow-[var(--mairie-shadow)]"
        onSubmit={submit}
      >
        <div className="flex items-center justify-between gap-4 border-b border-[var(--mairie-border)] px-5 py-3">
          <h2 id={titleId} className="truncate text-base font-semibold text-[var(--mairie-text)]">
            {isEditMode ? 'Modifier le projet' : 'Nouveau projet'}
          </h2>
          <IconButton
            preset="close"
            size="s"
            disabled={pending}
            label={isEditMode ? 'Fermer la modification de projet' : 'Fermer la création de projet'}
            onClick={onClose}
          />
        </div>

        <div className="min-h-0 overflow-y-auto p-5">
          <CreateProjectFeedback
            feedbackId={feedbackId}
            feedbackRef={verificationFeedbackRef}
            pending={pending}
            error={error}
            verificationRequired={verificationRequired}
            verificationMessage={verificationMessage}
            verificationError={verificationError}
            verificationPending={verificationPending}
            verificationLabel={verificationLabel}
            verificationPendingLabel={verificationPendingLabel}
            confirmedCreationTitle={creationConfirmed ? confirmedCreationTitle : undefined}
            onVerify={() => void onVerify?.()}
          />

          <fieldset disabled={pending} className="grid min-w-0 grid-cols-1 gap-4 border-0 p-0">
            <ProjectMainFields form={form} errors={fieldErrors} onChange={changeForm} />
            <ProjectSideFields
              form={form}
              statusOptions={statusOptions}
              priorityOptions={priorityOptions}
              responsibleOptions={responsibleOptions}
              memberOptions={memberOptions}
              labelOptions={labelOptions}
              groupOptions={groupOptions}
              groupsError={groupsError}
              groupRequired={!isEditMode}
              errors={fieldErrors}
              onChange={changeForm}
            />
            {/* Not in the F3 mockup (MAIR-836 C5, open point): the template and the initial tasks stay after its fields. */}
            {!isEditMode && <ProjectTemplatePicker port={workflowPort?.createProjectFromTemplate ? workflowPort : undefined} disabled={submitBlocked} onChange={setTemplate} />}
            <ProjectTasksEditor
              form={form}
              memberOptions={memberOptions}
              labelOptions={labelOptions}
              statusOptions={statusOptions}
              priorityOptions={priorityOptions}
              onChange={onChange}
            />
          </fieldset>
        </div>

        <CreateProjectFooter editing={isEditMode} pending={pending} creationConfirmed={creationConfirmed} submitBlocked={submitBlocked} onClose={onClose} />
      </form>
    </div>
  );
}
