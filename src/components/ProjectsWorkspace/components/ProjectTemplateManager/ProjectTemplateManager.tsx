'use client';

import React from 'react';
import { workflowControl } from '../StatusDefinitionEditor';
import { canManageWorkflow, WORKFLOW_UNAVAILABLE, type ProjectWorkflowPort } from '@/lib/projectWorkflow';
import { TemplateManagerEditor } from './components/TemplateManagerEditor';

export function ProjectTemplateManager({ role, port }: { role?: string; port?: ProjectWorkflowPort }) {
  const [open, setOpen] = React.useState(false);
  const [opened, setOpened] = React.useState(false);
  if (!canManageWorkflow(role)) return null;
  return <section className="my-4 min-w-0">
    <button type="button" className={workflowControl} disabled={!port} aria-expanded={open} onClick={() => { setOpened(true); setOpen(value => !value); }}>Gérer les modèles</button>
    {!port && <p className="mt-2 text-sm text-[#536171]">{WORKFLOW_UNAVAILABLE}</p>}
    {opened && port && <div hidden={!open}><TemplateManagerEditor key={role} port={port} /></div>}
  </section>;
}
