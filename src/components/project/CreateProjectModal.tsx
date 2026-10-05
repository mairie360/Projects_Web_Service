'use client';

import React from 'react';
import { Button } from '@mairie360/lib-components';
import { X } from 'lucide-react';
import { ProgressMeter } from '../ProjectCard';
import type { Project } from '../../types/project';
import { type FilterOption, type ProjectFormState } from '../../lib/projectPageState';
import { FieldLabel, FormField, MultiSelectField, SelectField, TextAreaField, fieldClassName } from './ProjectFormControls';
import { ProjectTasksEditor } from './ProjectTasksEditor';

export function CreateProjectModal({
  mode,
  form,
  error,
  pending = false,
  memberOptions,
  labelOptions,
  statusOptions,
  priorityOptions,
  onChange,
  onClose,
  onSubmit,
}: {
  mode: 'create' | 'edit';
  form: ProjectFormState;
  error: string;
  pending?: boolean;
  memberOptions: FilterOption[];
  labelOptions: FilterOption[];
  statusOptions: FilterOption[];
  priorityOptions: FilterOption[];
  onChange: (patch: Partial<ProjectFormState>) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const isEditMode = mode === 'edit';
  const overlayRef = React.useRef<HTMLDivElement>(null);
  const dialogRef = React.useRef<HTMLFormElement>(null);
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
        aria-describedby={pending || error ? feedbackId : undefined}
        aria-busy={pending}
        tabIndex={-1}
        onKeyDown={handleDialogKeyDown}
        className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-md bg-[#f6f4f1] shadow-[0_18px_50px_rgba(27,31,36,0.28)]"
        onSubmit={onSubmit}
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
          {pending && (
            <p id={feedbackId} role="status" className="mb-4 text-sm font-medium text-[#24292f]">Enregistrement en cours…</p>
          )}
          {error && (
            <div id={feedbackId} role="alert" className="mb-4 rounded-md border border-[#ffcecb] bg-[#ffebe9] px-4 py-3 text-sm font-medium text-[#cf222e]">
              {error}
            </div>
          )}

          <fieldset disabled={pending} className="grid min-w-0 grid-cols-1 gap-5 border-0 p-0 lg:grid-cols-[minmax(0,1fr)_300px]">
            <section className="space-y-4">
              <div className="rounded-md border border-[#d9d5d0] bg-[#fbfaf8] p-4">
                <FormField
                  id="project-title"
                  label="Titre"
                  value={form.title}
                  required
                  placeholder="Ajouter un titre..."
                  onChange={(title) => onChange({ title })}
                />
              </div>

              <div className="overflow-hidden rounded-md border border-[#d9d5d0] bg-[#fbfaf8]">
                <div className="flex h-10 items-center border-b border-[#dedbd6] bg-[#f1eee9] px-3">
                  <span className="rounded-md border border-[#d0d7de] bg-white px-3 py-1 text-xs font-semibold text-[#24292f]">
                    Écrire
                  </span>
                </div>
                <div className="p-4">
                  <TextAreaField
                    id="project-description"
                    label="Description"
                    value={form.description}
                    required
                    placeholder="Ajouter une description, des critères d'acceptation ou des notes..."
                    onChange={(description) => onChange({ description })}
                  />
                </div>
              </div>

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
              <div>
                <h3 className="text-sm font-semibold text-[#24292f]">Champs du projet</h3>
                <p className="mt-1 text-xs text-[#57606a]">Configure les champs visibles sur les cartes.</p>
              </div>

              <SelectField
                id="project-status"
                label="Statut"
                value={form.status}
                options={statusOptions}
                onChange={(status) => onChange({ status: status as Project['status'] })}
              />

              <SelectField
                id="project-priority"
                label="Priorité"
                value={form.priority}
                options={priorityOptions}
                onChange={(priority) => onChange({ priority: priority as Project['priority'] })}
              />

              <SelectField
                id="project-responsible"
                label="Assigné principal"
                value={form.responsible}
                options={responsibleOptions}
                onChange={(responsible) => onChange({ responsible })}
              />

              <MultiSelectField
                id="project-assignees"
                label="Assignés"
                values={form.assignees}
                options={memberOptions}
                placeholder="Choisir un ou plusieurs assignés"
                onChange={(assignees) => onChange({ assignees })}
              />

              <MultiSelectField
                id="project-labels"
                label="Étiquettes"
                values={form.labels}
                options={labelOptions}
                placeholder="Choisir une ou plusieurs étiquettes"
                onChange={(labels) => onChange({ labels })}
              />

              <div>
                <FieldLabel htmlFor="project-due-date" label="Échéance" required />
                <input
                  id="project-due-date"
                  type="date"
                  value={form.dueDate}
                  required
                  className={fieldClassName}
                  onChange={(event) => onChange({ dueDate: event.target.value })}
                />
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-[#24292f]">Progression</h3>
                <ProgressMeter value={form.progress} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border border-[#d9d5d0] bg-white px-3 py-2">
                  <div className="text-xs font-semibold text-[#57606a]">Terminées</div>
                  <div className="mt-1 text-lg font-semibold text-[#24292f]">{form.completedTasks}</div>
                </div>
                <div className="rounded-md border border-[#d9d5d0] bg-white px-3 py-2">
                  <div className="text-xs font-semibold text-[#57606a]">Total</div>
                  <div className="mt-1 text-lg font-semibold text-[#24292f]">{form.totalTasks}</div>
                </div>
              </div>
            </aside>
          </fieldset>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-[#dedbd6] bg-[#fbfaf8] px-5 py-3 sm:flex-row sm:justify-end">
          <Button
            label="Annuler"
            disabled={pending}
            type="button"
            onClick={onClose}
            className="!h-9 !min-h-0 !rounded-md !border-[#d9d5d0] !bg-[#fbfaf8] !px-4 !text-sm !font-semibold !text-[#24292f] hover:!bg-[#f1eee9]"
          />
          <Button
            label={pending ? 'Enregistrement en cours…' : isEditMode ? 'Enregistrer' : 'Créer le projet'}
            disabled={pending}
            type="submit"
            primary
            className="!h-9 !min-h-0 !rounded-md !border-[#2da44e] !bg-[#2da44e] !px-4 !text-sm !font-semibold !text-white hover:!bg-[#2c974b]"
          />
        </div>
      </form>
    </div>
  );
}
