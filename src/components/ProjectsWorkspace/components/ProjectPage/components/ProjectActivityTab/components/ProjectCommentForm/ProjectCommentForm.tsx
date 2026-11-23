import React from 'react';
import { Button, TextArea } from '@mairie360/lib-components/primitives';
import { Send } from 'lucide-react';
import { COMMENT_MAX_LENGTH, NO_MARKUP_HINT, reportMarkupValidity } from '@/lib/text-constraints';

export interface ProjectCommentFormProps {
  /** Resolves `true` once the BFF saved the comment: the field is emptied. */
  onPublish: (message: string) => Promise<boolean>;
  pending: boolean;
  error?: string;
}

/** The text a comment may hold: 1 to 2000 characters once trimmed, no `<` or `>` (MAIR-1089, rules of MAIR-426). */
export function commentError(message: string) {
  const text = message.trim();
  if (!text) return 'Écrivez un commentaire avant de le publier.';
  if (text.length > COMMENT_MAX_LENGTH) return `Le commentaire ne doit pas dépasser ${COMMENT_MAX_LENGTH} caractères.`;
  if (/[<>]/.test(text)) return 'Le commentaire ne doit pas contenir les caractères < ou >.';
  return '';
}

/** MAIR-874 (C3, Figma F10): « Commentaire » and « Publier » (Ctrl + Entrée publishes too). */
export const ProjectCommentForm = ({ onPublish, pending, error }: ProjectCommentFormProps) => {
  const [message, setMessage] = React.useState('');
  const [fieldError, setFieldError] = React.useState('');
  const publish = async () => {
    const refused = commentError(message);
    setFieldError(refused);
    if (refused || pending) return;
    if (await onPublish(message.trim())) setMessage('');
  };
  return (
    <form noValidate aria-label="Publier un commentaire" className="space-y-3" onSubmit={(event) => { event.preventDefault(); void publish(); }}>
      <TextArea
        id="project-comment"
        label="Commentaire"
        value={message}
        rows={3}
        maxLength={COMMENT_MAX_LENGTH}
        title={NO_MARKUP_HINT}
        hint="Ctrl + Entrée pour publier."
        error={fieldError || error || undefined}
        disabled={pending}
        onChange={(event) => { reportMarkupValidity(event.target); setMessage(event.target.value); if (fieldError) setFieldError(''); }}
        onKeyDown={(event) => { if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); void publish(); } }}
      />
      <div className="flex justify-end">
        <Button type="submit" variant="solid" tone="primary" icon={Send} label="Publier" loading={pending} />
      </div>
    </form>
  );
};
