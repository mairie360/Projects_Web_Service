'use client';

import React from 'react';
import { X } from 'lucide-react';
import { type FilterOption, type ProjectFormState } from '@/lib/projectPageState';
import { CreateProjectFeedback } from './components/CreateProjectFeedback';
import { CreateProjectFooter } from './components/CreateProjectFooter';
import { ProjectMainFields } from './components/ProjectMainFields';
import { ProjectSideFields } from './components/ProjectSideFields';
import { ProjectTasksEditor } from '../ProjectTasksEditor';
import { ProjectTemplatePicker } from './components/ProjectTemplatePicker';
import type { ProjectTemplate, ProjectWorkflowPort } from '@/lib/projectWorkflow';
import { PROJECT_VERIFICATION_MESSAGE } from '@/lib/projectReceiptVerification';

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
  statusOptions: FilterOption[];
  priorityOptions: FilterOption[];
  onChange: (patch: Partial<ProjectFormState>) => void;
  onClose: () => void;
  onInteract?: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>, template?: ProjectTemplate) => void;
}) {
  const [template, setTemplate] = React.useState<ProjectTemplate | undefined>();
  const isEditMode = mode === 'edit';
  const creationConfirmed = !isEditMode && confirmedCreationTitle !== undefined;
  const submitBlocked = pending || verificationRequired || verificationPending || creationConfirmed || !canSave;
  const overlayRef = React.useRef<HTMLDivElement>(null);
  const dialogRef = React.useRef<HTMLFormElement>(null);
  const verificationFeedbackRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();
  const feedbackId = React.useId();
  const responsibleOptions = [{ label: 'Sélectionner un assigné', value: '' }, ...memberOptions];

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
    <div ref={overlayRef} className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4">
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
        className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-md bg-[#f6f4f1] shadow-[0_18px_50px_rgba(27,31,36,0.28)]"
        onSubmit={event => onSubmit(event, template)}
      >
        <div className="flex items-center justify-between gap-4 border-b border-[#1f1f1f] bg-[#2b2b2b] px-5 py-3">
          <h2 id={titleId} className="truncate text-base font-semibold text-white">
            {isEditMode ? 'Modifier le projet' : 'Nouveau projet'}
          </h2>
          <button
            type="button"
            disabled={pending}
            aria-label={isEditMode ? 'Fermer la modification de projet' : 'Fermer la création de projet'}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#d7e3e7] transition hover:bg-[#3a3a3a] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6aada9]/45"
            onClick={onClose}
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto bg-[#f6f4f1] p-5">
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

          <fieldset disabled={pending} className="grid min-w-0 grid-cols-1 gap-5 border-0 p-0 lg:grid-cols-[minmax(0,1fr)_300px]">
            <section className="space-y-4">
              <ProjectMainFields form={form} onChange={onChange} />

              <ProjectTasksEditor
                form={form}
                memberOptions={memberOptions}
                labelOptions={labelOptions}
                statusOptions={statusOptions}
                priorityOptions={priorityOptions}
                onChange={onChange}
              />
            </section>

            <aside className="space-y-4 rounded-md border border-[#d9d5d0] bg-[#fbfaf8] p-4">
              {!isEditMode && <ProjectTemplatePicker port={workflowPort?.createProjectFromTemplate ? workflowPort : undefined} disabled={submitBlocked} onChange={setTemplate} />}
              <ProjectSideFields
                form={form}
                statusOptions={statusOptions}
                priorityOptions={priorityOptions}
                responsibleOptions={responsibleOptions}
                memberOptions={memberOptions}
                labelOptions={labelOptions}
                onChange={onChange}
              />
            </aside>
          </fieldset>
        </div>

        <CreateProjectFooter editing={isEditMode} pending={pending} creationConfirmed={creationConfirmed} submitBlocked={submitBlocked} onClose={onClose} />
      </form>
    </div>
  );
}
