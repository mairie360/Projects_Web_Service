import React from 'react';
import { getInstanceTimeZone } from '@mairie360/lib-components/shared';
import { History, MessageSquare } from 'lucide-react';

import { COMMENT_MAX_LENGTH, NO_MARKUP_HINT, NO_MARKUP_PATTERN } from '../../../lib/text-constraints';
import type { TaskCollaboration } from '../../../types/project';

const formatMoment = (value: string) => new Date(value).toLocaleString('fr-FR', { timeZone: getInstanceTimeZone() });

export interface TaskFollowUpProps {
  taskTitle: string;
  loading: boolean;
  saving: boolean;
  error: string;
  collaboration: TaskCollaboration | null;
  canComment: boolean;
  message: string;
  onMessageChange: (value: string) => void;
  onRefresh: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

/** "Suivi" of a task: its comments with the comment form, and its change history. */
export const TaskFollowUp = ({ taskTitle, loading, saving, error, collaboration, canComment, message, onMessageChange, onRefresh, onSubmit }: TaskFollowUpProps) => (
  <div className="mt-3 min-w-0 rounded-md border border-[#d0d7de] bg-[#f6f8fa] p-3">
    {loading && <p role="status" className="text-xs text-[#57606a]">Chargement du suivi...</p>}
    {saving && <p role="status" className="text-xs text-[#57606a]">Envoi du commentaire...</p>}
    {error && <p role="alert" className="text-xs font-medium text-[#cf222e] [overflow-wrap:anywhere]">{error}</p>}
    {error && (
      <button type="button" disabled={loading || saving} className="mt-2 rounded-md border border-[#d0d7de] bg-white px-2 py-1 text-xs font-semibold text-[#24292f] disabled:opacity-50" onClick={onRefresh}>Actualiser le suivi</button>
    )}
    {collaboration && (
      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="min-w-0">
          <h4 className="flex items-center gap-1.5 text-xs font-semibold text-[#24292f]"><MessageSquare className="h-3.5 w-3.5" /> Commentaires</h4>
          <div className="mt-2 max-h-40 space-y-2 overflow-y-auto">
            {collaboration.comments.length === 0 && <p className="text-xs text-[#6e7781]">Aucun commentaire.</p>}
            {collaboration.comments.map((comment) => (
              <div key={comment.id} className="rounded-md border border-[#d8dee4] bg-white p-2 text-xs">
                <div className="flex flex-col gap-1 font-semibold text-[#24292f] [overflow-wrap:anywhere] sm:flex-row sm:flex-wrap sm:justify-between sm:gap-2"><span className="min-w-0">{comment.author.name}</span><time className="font-normal text-[#6e7781]">{formatMoment(comment.createdAt)}</time></div>
                <p className="mt-1 whitespace-pre-wrap text-[#57606a] [overflow-wrap:anywhere]">{comment.message}</p>
              </div>
            ))}
          </div>
          {canComment && (
            <form className="mt-2 flex min-w-0 flex-col gap-2 sm:flex-row" onSubmit={onSubmit}>
              <input value={message} disabled={saving} aria-label={`Commentaire pour ${taskTitle}`} pattern={NO_MARKUP_PATTERN} title={NO_MARKUP_HINT} placeholder="Ajouter un commentaire..." maxLength={COMMENT_MAX_LENGTH} className="h-8 min-w-0 rounded-md border border-[#d0d7de] bg-white px-2 text-xs outline-none focus:border-[#0969da] sm:flex-1" onChange={(event) => onMessageChange(event.target.value)} />
              <button type="submit" disabled={saving || loading || !message.trim()} className="min-h-8 shrink-0 rounded-md bg-[#0969da] px-3 text-xs font-semibold text-white disabled:opacity-50">Envoyer</button>
            </form>
          )}
        </div>
        <div className="min-w-0">
          <h4 className="flex items-center gap-1.5 text-xs font-semibold text-[#24292f]"><History className="h-3.5 w-3.5" /> Historique</h4>
          <div className="mt-2 max-h-52 space-y-2 overflow-y-auto">
            {collaboration.history.length === 0 && <p className="text-xs text-[#6e7781]">Aucune modification enregistrée.</p>}
            {collaboration.history.map((entry) => (
              <div key={entry.id} className="border-l-2 border-[#0969da] pl-2 text-xs [overflow-wrap:anywhere]">
                <p className="font-medium text-[#24292f]">{entry.label}</p>
                <p className="mt-0.5 text-[#6e7781]">{entry.author.name} · {formatMoment(entry.createdAt)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    )}
  </div>
);
