'use client';

import React from 'react';
import { workflowControl } from '@/components/ProjectsWorkspace/components/StatusDefinitionEditor';
import { categoryLabels, WORKFLOW_UNAVAILABLE, type ProjectTemplate, type ProjectWorkflowPort } from '@/lib/projectWorkflow';
import { workflowMessage, readTemplates } from '@/components/ProjectsWorkspace/workflow-helpers';

export function ProjectTemplatePicker({ port, disabled, onChange }: { port?: ProjectWorkflowPort; disabled?: boolean; onChange: (template: ProjectTemplate | undefined) => void }) {
  const [templates, setTemplates] = React.useState<ProjectTemplate[]>([]);
  const [selected, setSelected] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(!!port);
  const [retry, setRetry] = React.useState(0);
  const id = React.useId();
  React.useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => {
      if (controller.signal.aborted) return;
      setLoading(!!port); setTemplates([]); setSelected(''); setError('');
      if (port) return readTemplates(port, controller.signal).then(result => {
      if (!controller.signal.aborted) setTemplates(result);
    }).catch(reason => { if (!controller.signal.aborted) setError(workflowMessage(reason)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    });
    return () => controller.abort();
  }, [port, retry]);
  const preview = templates.find(template => template.id === selected);
  return <section className="min-w-0 space-y-2 rounded-md border border-[#d9d5d0] bg-[#fbfaf8] p-3">
    <label htmlFor={id} className="block text-sm font-semibold">Modèle de projet<select id={id} className={`${workflowControl} mt-1 w-full`} value={selected} disabled={disabled || loading || !port || !!error} onChange={event => { setSelected(event.target.value); onChange(templates.find(template => template.id === event.target.value)); }}>
      <option value="">Sans modèle personnalisé</option>{templates.map(template => <option key={template.id} value={template.id}>{template.name}</option>)}
    </select></label>
    {!port && <p className="text-sm text-[#536171]">{WORKFLOW_UNAVAILABLE}</p>}
    {loading && <p role="status">Chargement des modèles…</p>}
    {error && <div role="alert"><p>{error}</p><button type="button" className={workflowControl} onClick={() => { onChange(undefined); setRetry(value => value + 1); }}>Réessayer les modèles</button></div>}
    {preview && <ul aria-label="Statuts du modèle" className="space-y-1 text-sm">{preview.statuses.map(status => <li key={status.id} className="flex gap-2 [overflow-wrap:anywhere]"><span aria-hidden="true" className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: status.color }} />{status.name} · {categoryLabels[status.category]}</li>)}</ul>}
  </section>;
}
