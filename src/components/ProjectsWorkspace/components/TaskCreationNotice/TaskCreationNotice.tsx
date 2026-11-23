'use client';

import React from 'react';
import { Button, ErrorAlert } from '@mairie360/lib-components/primitives';
import { NEW_TASK_VERIFICATION_MESSAGE } from '@/lib/projectTaskVerification';
import type { TaskFormState } from '@/lib/projectPageState';

export type TaskCreationState = {
  pending?: boolean;
  uncertainTitle?: string;
  draft?: TaskFormState;
  inspectionPending?: boolean;
  inspectionError?: string;
  inspectionMessage?: string;
};

/** A task creation the BFF did not confirm, on the lib ErrorAlert until the project is inspected (MAIR-828). */
export function TaskCreationNotice({ state, onInspect }: {
  state?: TaskCreationState;
  onInspect?: () => void | Promise<void>;
}) {
  if (!state?.uncertainTitle) return null;
  return (
    <ErrorAlert
      className="my-3 [overflow-wrap:anywhere]"
      title={`Création de tâche non vérifiée : ${state.uncertainTitle}`}
      description={(
        <>
          <span className="block">{NEW_TASK_VERIFICATION_MESSAGE}</span>
          {state.inspectionError && <span className="mt-2 block">{state.inspectionError}</span>}
          {state.inspectionMessage && <span role="status" className="mt-2 block">{state.inspectionMessage}</span>}
          {onInspect && (
            <span className="mt-2 block">
              <Button
                variant="outline"
                tone="danger"
                size="s"
                label={state.inspectionPending ? 'Inspection du projet…' : 'Inspecter les tâches du projet'}
                disabled={state.inspectionPending || state.pending}
                aria-busy={!!state.inspectionPending}
                onClick={() => void onInspect()}
              />
            </span>
          )}
        </>
      )}
    />
  );
}
