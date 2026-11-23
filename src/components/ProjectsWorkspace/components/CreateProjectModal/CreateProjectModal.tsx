'use client';

import React from 'react';
import { type FilterOption, type ProjectFormState } from '@/lib/projectPageState';
import { CreateProjectFeedback } from './components/CreateProjectFeedback';
import { CreateProjectFooter } from './components/CreateProjectFooter';
import { ProjectMainFields } from './components/ProjectMainFields';
import { ProjectRecap } from './components/ProjectRecap';
import { ProjectSideFields } from './components/ProjectSideFields';
import { EditedSection } from '../EditedSection';
import { ProjectTasksEditor } from '../ProjectTasksEditor';
import { ProjectTemplatePicker } from './components/ProjectTemplatePicker';
import type { ProjectTemplate, ProjectWorkflowPort } from '@/lib/projectWorkflow';
import { PROJECT_VERIFICATION_MESSAGE } from '@/lib/projectReceiptVerification';
import { IconButton, StepProgress } from '@mairie360/lib-components/primitives';
import { changedProjectFields, PROJECT_FIELD_IDS, PROJECT_FORM_SECTIONS, validateProjectForm, type ProjectFieldErrors } from '../../project-form-validation';
import { CREATION_STEPS, firstStepInError, RECAP_STEP, stepErrors, useCreationSteps } from './use-creation-steps';

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
  onDelete,
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
  /** MAIR-1136: « Supprimer » of the edit (the deletion asks for its confirmation). */
  onDelete?: () => void;
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
  const groupCount = groupOptions?.length ?? 0;
  // MAIR-1136 (C9): the creation goes step by step; the edit compares with the project it opened on (C13).
  const creation = useCreationSteps(form, groupCount);
  const [initialForm] = React.useState(form);
  const changed = isEditMode ? changedProjectFields(form, initialForm) : [];
  const sectionChanged = (section: keyof typeof PROJECT_FORM_SECTIONS) => changed.some((key) => (PROJECT_FORM_SECTIONS[section] as readonly string[]).includes(key));
  const focusRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    // A step shown to explain an error focuses its first field once it is visible.
    if (!focusRef.current) return;
    document.getElementById(focusRef.current)?.focus();
    focusRef.current = null;
  });

  const showErrors = (errors: ProjectFieldErrors) => {
    const first = (Object.keys(PROJECT_FIELD_IDS) as (keyof ProjectFieldErrors)[]).find((key) => errors[key]);
    setFieldErrors(errors);
    if (!first) return false;
    if (!isEditMode) creation.setStep(firstStepInError(errors) ?? creation.step);
    focusRef.current = PROJECT_FIELD_IDS[first];
    document.getElementById(PROJECT_FIELD_IDS[first])?.focus();
    return true;
  };

  // Forward only once the steps before the target are valid; back always.
  const goToStep = (target: number) => {
    if (target > creation.step && showErrors(stepErrors(creation.errors, target))) return;
    creation.setStep(target);
    dialogRef.current?.focus();
  };

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

  const sideFieldProps = { statusOptions, priorityOptions, responsibleOptions, memberOptions, labelOptions, groupOptions, groupsError, groupRequired: !isEditMode, errors: fieldErrors, onChange: changeForm };

  // MAIR-836 (Figma F3 3.3): the messages under the fields replace the browser bubbles; the first field in error
  // gets the focus and nothing is sent. MAIR-1136: before the recap, Entrée (a submit) moves to the next step.
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    if (!isEditMode && creation.step < RECAP_STEP) {
      event.preventDefault();
      goToStep(creation.step + 1);
      return;
    }
    if (showErrors(validateProjectForm(form, { creating: !isEditMode, groupCount }))) {
      event.preventDefault();
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

        {!isEditMode && (
          <div className="grid gap-2 border-b border-[var(--mairie-border)] px-5 py-3">
            <StepProgress steps={CREATION_STEPS.map((label, index) => ({ label, optional: index === 2 }))} current={creation.step} onStepChange={pending ? undefined : goToStep} tone="projects" size="s" label="Étapes de la création" />
            <p aria-live="polite" className="text-xs font-medium text-[var(--mairie-text-muted)]">Étape {creation.step + 1} sur {CREATION_STEPS.length} · {CREATION_STEPS[creation.step]}</p>
          </div>
        )}

        {/* MAIR-1136: every creation step keeps the height of the tallest, so the dialog does not jump. */}
        <div className={`min-h-0 overflow-y-auto p-5${isEditMode ? '' : ' sm:min-h-[460px]'}`}>
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
            {isEditMode ? (
              <>
                {/* MAIR-1136 (C13): the edit stays on one page, its sections marked « Modifié » once changed. */}
                <EditedSection title="L’essentiel" modified={sectionChanged('essential')}>
                  <ProjectMainFields form={form} errors={fieldErrors} onChange={changeForm} />
                  <ProjectSideFields form={form} part="essential" {...sideFieldProps} />
                </EditedSection>
                <EditedSection title="Organisation" modified={sectionChanged('organisation')}>
                  <ProjectSideFields form={form} part="organisation" {...sideFieldProps} />
                </EditedSection>
              </>
            ) : (
              <>
                <div hidden={creation.step !== 0} className="grid gap-4">
                  <ProjectMainFields form={form} errors={fieldErrors} onChange={changeForm} />
                  <ProjectSideFields form={form} part="essential" {...sideFieldProps} />
                </div>
                <div hidden={creation.step !== 1} className="grid gap-4">
                  <ProjectSideFields form={form} part="organisation" {...sideFieldProps} />
                </div>
              </>
            )}
            {/* The template and the initial tasks are the optional « Tâches » step (MAIR-1136, C9). */}
            <div hidden={!isEditMode && creation.step !== 2} className="grid gap-4">
              {!isEditMode && <ProjectTemplatePicker port={workflowPort?.createProjectFromTemplate ? workflowPort : undefined} disabled={submitBlocked} onChange={setTemplate} />}
              <ProjectTasksEditor
                form={form}
                memberOptions={memberOptions}
                labelOptions={labelOptions}
                statusOptions={statusOptions}
                priorityOptions={priorityOptions}
                onChange={onChange}
              />
            </div>
            {!isEditMode && creation.step === RECAP_STEP && (
              <ProjectRecap form={form} template={template} memberOptions={memberOptions} groupOptions={groupOptions ?? []} statusOptions={statusOptions} priorityOptions={priorityOptions} onEditStep={goToStep} />
            )}
          </fieldset>
        </div>

        <CreateProjectFooter
          editing={isEditMode}
          pending={pending}
          creationConfirmed={creationConfirmed}
          submitBlocked={submitBlocked}
          onClose={onClose}
          // Once the creation was sent (verification), the footer keeps its last action, whatever the step shown.
          step={verificationRequired || creationConfirmed ? RECAP_STEP : creation.step}
          stepCount={CREATION_STEPS.length}
          canSkipToRecap={creation.canSkipToRecap}
          onBack={() => goToStep(creation.step - 1)}
          onSkipToRecap={() => goToStep(RECAP_STEP)}
          changeCount={isEditMode ? changed.length : undefined}
          onDelete={onDelete}
        />
      </form>
    </div>
  );
}
