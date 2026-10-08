'use client';

import React from 'react';
import { NEW_TASK_VERIFICATION_MESSAGE } from '../../lib/projectTaskVerification';
import type { TaskFormState } from '../../lib/projectPageState';

export type TaskCreationState = {
  pending?: boolean;
  uncertainTitle?: string;
  draft?: TaskFormState;
  inspectionPending?: boolean;
  inspectionError?: string;
  inspectionMessage?: string;
};

export function TaskCreationNotice({ state, onInspect }: {
  state?: TaskCreationState;
  onInspect?: () => void | Promise<void>;
}) {
  if (!state?.uncertainTitle) return null;
  return <div role="alert" className="my-3 rounded-md border border-[#ffcecb] bg-[#ffebe9] p-3 text-sm text-[#cf222e] [overflow-wrap:anywhere]">
    <p className="font-semibold">Création de tâche non vérifiée : {state.uncertainTitle}</p>
    <p>{NEW_TASK_VERIFICATION_MESSAGE}</p>
    {state.inspectionError && <p className="mt-2">{state.inspectionError}</p>}
    {state.inspectionMessage && <p role="status" className="mt-2">{state.inspectionMessage}</p>}
    {onInspect && <button type="button" disabled={state.inspectionPending || state.pending} aria-busy={!!state.inspectionPending} onClick={() => void onInspect()} className="mt-3 min-h-11 rounded-md border border-[#d0d7de] bg-white px-3 py-2 font-semibold text-[#24292f] disabled:opacity-60">
      {state.inspectionPending ? 'Inspection du projet…' : 'Inspecter les tâches du projet'}
    </button>}
  </div>;
}
