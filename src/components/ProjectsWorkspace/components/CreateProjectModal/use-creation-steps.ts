import React from 'react';
import type { ProjectFormState } from '@/lib/projectPageState';
import { CREATION_STEP_FIELDS, validateProjectForm, type ProjectFieldErrors } from '../../project-form-validation';

/** MAIR-1136 (C9, Figma F3): the four steps of the project creation. */
export const CREATION_STEPS = ['L’essentiel', 'Organisation', 'Tâches', 'Récapitulatif'] as const;
export const RECAP_STEP = CREATION_STEPS.length - 1;

/** Errors of the given steps only (the steps before the one the agent goes to). */
export function stepErrors(errors: ProjectFieldErrors, steps: number): ProjectFieldErrors {
  const fields = CREATION_STEP_FIELDS.slice(0, steps).flat();
  return Object.fromEntries(Object.entries(errors).filter(([key]) => fields.includes(key as keyof ProjectFieldErrors))) as ProjectFieldErrors;
}

/** The first step holding one of these errors, or `undefined`. */
export function firstStepInError(errors: ProjectFieldErrors) {
  const index = CREATION_STEP_FIELDS.findIndex((fields) => fields.some((field) => errors[field]));
  return index < 0 ? undefined : index;
}

/**
 * Where the creation stands: the current step, the moves the checks allow (forward only once the steps before are
 * valid, back always) and the shortcut « Passer au récapitulatif » (as soon as « L’essentiel » is valid).
 */
export function useCreationSteps(form: ProjectFormState, groupCount: number) {
  const [step, setStep] = React.useState(0);
  const errors = validateProjectForm(form, { creating: true, groupCount });
  const reachable = (target: number) => target <= step || Object.keys(stepErrors(errors, target)).length === 0;
  const canSkipToRecap = step < RECAP_STEP && Object.keys(stepErrors(errors, 1)).length === 0;
  return { step, setStep, errors, reachable, canSkipToRecap };
}
