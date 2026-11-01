'use client';

import React from 'react';
import { StatusDefinitionEditor, workflowControl } from '@/components/ProjectsWorkspace/components/StatusDefinitionEditor';
import { assertTemplate, sameStatuses, validTemplateStatuses, WORKFLOW_UNVERIFIED, type ProjectTemplate, type ProjectWorkflowPort, type TaskStatusDefinition } from '@/lib/projectWorkflow';
import { workflowMessage, copyStatuses, readTemplates } from '@/components/ProjectsWorkspace/workflow-helpers';

export function TemplateManagerEditor({ port }: { port: ProjectWorkflowPort }) {
  const [templates, setTemplates] = React.useState<ProjectTemplate[]>([]);
  const [selected, setSelected] = React.useState<ProjectTemplate | undefined>();
  const [name, setName] = React.useState('');
  const [statuses, setStatuses] = React.useState<TaskStatusDefinition[]>([{ id: 'draft-1', name: 'À faire', color: '#1256a6', category: 'todo' }, { id: 'draft-2', name: 'En cours', color: '#4b908d', category: 'inprogress' }, { id: 'draft-3', name: 'Terminé', color: '#267845', category: 'done' }]);
  const [loading, setLoading] = React.useState(true);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState('');
  const [uncertain, setUncertain] = React.useState(false);
  const [notice, setNotice] = React.useState('');
  const [retry, setRetry] = React.useState(0);
  const busy = React.useRef(false);
  const active = React.useRef(true);
  const writeRequest = React.useRef<AbortController | null>(null);
  const pendingDraft = React.useRef<{ id?: string; knownIds: Set<string>; name: string; statuses: TaskStatusDefinition[] } | null>(null);
  const id = React.useId();
  React.useEffect(() => {
    active.current = true;
    const controller = new AbortController();
    void Promise.resolve().then(() => {
      if (controller.signal.aborted) return;
      setLoading(true);
      return readTemplates(port, controller.signal).then(result => { if (!controller.signal.aborted) {
      setTemplates(result); setError('');
      const draft = pendingDraft.current;
      if (draft) {
        const matches = result.filter(template => (draft.id ? template.id === draft.id : !draft.knownIds.has(template.id)) && template.name === draft.name && sameStatuses(template.statuses, draft.statuses, true));
        if (matches.length === 1) {
          setSelected(matches[0]); setName(matches[0].name); setStatuses(copyStatuses(matches[0].statuses));
          setUncertain(false); setNotice('Modèle vérifié par lecture.'); pendingDraft.current = null;
        } else setError('La modification du modèle reste non vérifiée. Le brouillon est conservé.');
      }
    } }).catch(reason => { if (!controller.signal.aborted) setError(workflowMessage(reason)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    });
    return () => { active.current = false; controller.abort(); writeRequest.current?.abort(); };
  }, [port, retry]);
  const select = (value: string) => {
    const template = templates.find(item => item.id === value);
    setSelected(template); setName(template?.name ?? '');
    setStatuses(template ? copyStatuses(template.statuses) : [{ id: 'draft-1', name: 'À faire', color: '#1256a6', category: 'todo' }, { id: 'draft-2', name: 'En cours', color: '#4b908d', category: 'inprogress' }, { id: 'draft-3', name: 'Terminé', color: '#267845', category: 'done' }]);
    setError(''); setNotice('');
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!port.saveTemplate || busy.current || uncertain || !name.trim() || !validTemplateStatuses(statuses)) return;
    busy.current = true; setPending(true); setError(''); setNotice('');
    const controller = new AbortController(); writeRequest.current = controller;
    const expected = copyStatuses(statuses).map(status => ({ ...status, name: status.name.trim() }));
    pendingDraft.current = { id: selected?.id, knownIds: new Set(templates.map(template => template.id)), name: name.trim(), statuses: expected };
    try {
      const receipt = await port.saveTemplate({ id: selected?.id, revision: selected?.revision, name: name.trim(), statuses: copyStatuses(expected) }, controller.signal);
      if (!active.current || controller.signal.aborted) return;
      assertTemplate(receipt);
      if ((selected && (receipt.id !== selected.id || receipt.revision === selected.revision)) || (!selected && templates.some(template => template.id === receipt.id)) || receipt.name !== name.trim() || !sameStatuses(receipt.statuses, expected, true)) throw new Error(WORKFLOW_UNVERIFIED);
      setTemplates(current => [...current.filter(template => template.id !== receipt.id), receipt]);
      setSelected(receipt); setName(receipt.name); setStatuses(copyStatuses(receipt.statuses)); setNotice('Modèle enregistré.'); pendingDraft.current = null;
    } catch (reason) {
      if (active.current && !controller.signal.aborted) { setError(`${workflowMessage(reason)} ${WORKFLOW_UNVERIFIED}`); setUncertain(true); }
    } finally { busy.current = false; if (active.current && !controller.signal.aborted) setPending(false); }
  };
  return <form aria-label="Gestion des modèles" onSubmit={event => void save(event)} className="mt-4 min-w-0 space-y-4 rounded-md border border-[#d9d5d0] bg-white p-4">
    <h2 className="font-semibold">Modèles de projet</h2>
    {loading && <p role="status">Chargement des modèles…</p>}
    {error && <p role="alert" className="text-sm text-[#a40e26] [overflow-wrap:anywhere]">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {uncertain && <p className="text-sm">Le brouillon est conservé. Vérifiez le catalogue avant de reprendre une modification ; une création non vérifiée ne sera pas renvoyée automatiquement.</p>}
    {error && <button type="button" className={workflowControl} disabled={pending || loading} onClick={() => setRetry(value => value + 1)}>Relire le catalogue</button>}
    <fieldset disabled={loading || pending || uncertain} className="min-w-0 space-y-4 border-0 p-0">
      <label htmlFor={`${id}-select`} className="block text-sm">Modèle à modifier<select id={`${id}-select`} value={selected?.id ?? ''} className={`${workflowControl} mt-1 block w-full`} onChange={event => select(event.target.value)}><option value="">Créer un modèle</option>{templates.map(template => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label>
      <label htmlFor={`${id}-name`} className="block text-sm">Nom du modèle<input id={`${id}-name`} value={name} required maxLength={100} className={`${workflowControl} mt-1 block w-full`} onChange={event => setName(event.target.value)} /></label>
      <StatusDefinitionEditor statuses={statuses} onChange={next => setStatuses(next)} />
      <button type="submit" className={workflowControl} disabled={!port.saveTemplate || !name.trim() || !validTemplateStatuses(statuses) || (selected !== undefined && selected.name === name.trim() && sameStatuses(selected.statuses, statuses, true))}>Enregistrer le modèle</button>
    </fieldset>
    {!port.saveTemplate && <p role="status">L’enregistrement des modèles est indisponible.</p>}
  </form>;
}
