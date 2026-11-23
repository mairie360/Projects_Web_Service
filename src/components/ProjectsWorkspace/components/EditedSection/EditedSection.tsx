import React from 'react';
import { StatusPill } from '@mairie360/lib-components/primitives';

export interface EditedSectionProps {
  title: string;
  /** Some field of the section differs from the saved project: « Modifié » next to the title. */
  modified: boolean;
  children: React.ReactNode;
}

/**
 * MAIR-1136 (C13, Figma F3): one section of the single-page project edit (« L’essentiel », « Organisation »),
 * shared by the dialog of the list and the modal of the project page.
 */
export const EditedSection = ({ title, modified, children }: EditedSectionProps) => {
  const headingId = React.useId();
  return (
    <section aria-labelledby={headingId} className="grid min-w-0 gap-4">
      <div className="flex items-center gap-2 border-b border-[var(--mairie-border)] pb-2">
        <h3 id={headingId} className="text-sm font-semibold text-[var(--mairie-text)]">{title}</h3>
        {modified && <StatusPill label="Modifié" tone="warning" size="s" />}
      </div>
      {children}
    </section>
  );
};
