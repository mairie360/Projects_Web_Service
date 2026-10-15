'use client';
import React from 'react';
import { TaskStatusKanban } from './TaskStatusKanban';
import { StatusDefinitionEditor, workflowControl } from './StatusDefinitionEditor';
import { assertTemplate, assertWorkflowSnapshot, canManageWorkflow, categoryLabels, sameStatuses, validStatuses, validTemplateStatuses, WORKFLOW_UNAVAILABLE, WORKFLOW_UNVERIFIED, type ProjectTemplate, type ProjectWorkflowPort, type ProjectWorkflowSnapshot, type StatusMigration, type TaskStatusDefinition } from '../../lib/projectWorkflow';

const message = (error: unknown) => error instanceof Error ? error.message : WORKFLOW_UNVERIFIED;
const copyStatuses = (statuses: TaskStatusDefinition[]) => statuses.map(status => ({ ...status }));

export function ProjectWorkflow({ projectId, role, port, onSnapshot, onMutation, refreshKey }: { projectId: string; role?: string; port?: ProjectWorkflowPort; onSnapshot?: (snapshot: ProjectWorkflowSnapshot) => void; onMutation?: () => void; refreshKey?: unknown }) {
  // A keyed child owns all drafts, requests and confirmations for one project.
  return port ? <ConnectedProjectWorkflow key={projectId} projectId={projectId} role={role} port={port} onSnapshot={onSnapshot} onMutation={onMutation} refreshKey={refreshKey} /> : <p className="mb-4 rounded-md border border-[#d9d5d0] bg-white p-3 text-sm text-[#536171]">{WORKFLOW_UNAVAILABLE}</p>;
}
function ConnectedProjectWorkflow({ projectId, role, port, onSnapshot, onMutation, refreshKey }: { projectId: string; role?: string; port: ProjectWorkflowPort; onSnapshot?: (snapshot: ProjectWorkflowSnapshot) => void; onMutation?: () => void; refreshKey?: unknown }) {
  const [snapshot, setSnapshot] = React.useState<ProjectWorkflowSnapshot | null>(null);
  const [statuses, setStatuses] = React.useState<TaskStatusDefinition[]>([]);
  const statusesRef = React.useRef(statuses);
  React.useEffect(() => { statusesRef.current = statuses; }, [statuses]);
  const [migrations, setMigrations] = React.useState<StatusMigration[]>([]);
  const [editing, setEditing] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [pending, setPending] = React.useState(false);
  const [uncertain, setUncertain] = React.useState(false);
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');
  const onSnapshotRef = React.useRef(onSnapshot);
  React.useEffect(() => { onSnapshotRef.current = onSnapshot; }, [onSnapshot]);
  const active = React.useRef(true);
  const busy = React.useRef(false);
  const readRequest = React.useRef<AbortController | null>(null);
  const writeRequest = React.useRef<AbortController | null>(null);
  const editingRef = React.useRef(false);
  const read = React.useCallback(async () => {
    readRequest.current?.abort();
    const controller = new AbortController();
    readRequest.current = controller;
    setLoading(true);
    setError('');
    try {
      const response = await port.readProject(projectId, controller.signal);
      if (!active.current || controller.signal.aborted || readRequest.current !== controller) return;
      assertWorkflowSnapshot(response, projectId);
      setSnapshot(response);
      onSnapshotRef.current?.(response);
      // Refreshes never silently replace a same-project draft.
      if (!editingRef.current) setStatuses(copyStatuses(response.statuses));
      else {
        const mappings = new Map<string, string>();
        const rebased = statusesRef.current.map(status => {
          if (!status.id.startsWith('draft-')) return status;
          const matches = response.statuses.filter(item => item.name === status.name.trim() && item.category === status.category && item.color.toLowerCase() === status.color.toLowerCase());
          if (matches.length !== 1) return status;
          mappings.set(status.id, matches[0].id);
          return { ...status, id: matches[0].id };
        });
        setStatuses(rebased);
        setMigrations(current => current.filter(migration => response.statuses.some(status => status.id === migration.from)).map(migration => ({ ...migration, to: mappings.get(migration.to) ?? migration.to })));
      }
      setUncertain(false);
    } catch (reason) {
      if (active.current && !controller.signal.aborted) setError(message(reason));
    } finally {
      if (active.current && !controller.signal.aborted) setLoading(false);
    }
  }, [port, projectId]);
  React.useEffect(() => {
    active.current = true;
    let cancelled = false;
    void Promise.resolve().then(() => { if (!cancelled) return read(); });
    return () => { cancelled = true; active.current = false; readRequest.current?.abort(); writeRequest.current?.abort(); };
  }, [read, refreshKey]);

  const write = async (action: 'statuses' | 'task', taskId?: string, statusId?: string) => {
    if (busy.current || !snapshot || loading || uncertain) return;
    if (action === 'statuses' && (!canManageWorkflow(role) || !port.saveProjectStatuses || !validStatuses(statuses))) return;
    if (action === 'task' && (!port.moveTask || !snapshot.tasks.some(task => task.id === taskId && task.canUpdateStatus) || !snapshot.statuses.some(status => status.id === statusId))) return;
    busy.current = true;
    setPending(true);
    setError('');
    setNotice('');
    const controller = new AbortController();
    writeRequest.current = controller;
    const before = snapshot;
    const expected = copyStatuses(statuses).map(status => ({ ...status, name: status.name.trim() }));
    try {
      const response = action === 'statuses'
        ? await port.saveProjectStatuses!({ projectId, revision: before.revision, statuses: copyStatuses(expected), migrations: migrations.map(migration => ({ ...migration })) }, controller.signal)
        : await port.moveTask!({ projectId, revision: before.revision, taskId: taskId!, statusId: statusId! }, controller.signal);
      if (!active.current || controller.signal.aborted) return;
      assertWorkflowSnapshot(response, projectId);
      if (response.revision === before.revision || (action === 'statuses'
        ? !sameStatuses(response.statuses, expected.map(status => ({ ...status, id: response.draftStatusIds?.[status.id] ?? status.id }))) || before.tasks.some(task => {
          const migration = migrations.find(item => item.from === task.statusId);
          return !response.tasks.some(after => after.id === task.id && after.statusId === (migration ? response.draftStatusIds?.[migration.to] ?? migration.to : task.statusId));
        })
        : !response.tasks.some(task => task.id === taskId && task.statusId === statusId))) throw new Error(WORKFLOW_UNVERIFIED);
      setSnapshot(response);
      onSnapshotRef.current?.(response);
      setStatuses(copyStatuses(response.statuses));
      setMigrations([]);
      setEditing(false);
      editingRef.current = false;
      setNotice(action === 'statuses' ? 'Statuts enregistrés.' : 'Modification vérifiée.');
      onMutation?.();
    } catch (reason) {
      if (active.current && !controller.signal.aborted) { setError(`${message(reason)} ${WORKFLOW_UNVERIFIED}`); setUncertain(true); }
    } finally {
      busy.current = false;
      if (active.current && !controller.signal.aborted) setPending(false);
    }
  };
  const canManage = canManageWorkflow(role);
  return <section aria-label="Statuts et tâches du projet" className="mb-5 min-w-0 space-y-4 rounded-md border border-[#d9d5d0] bg-white p-4">
    <h2 className="font-semibold text-[#172033]">Statuts des tâches du projet</h2>
    {loading && <p role="status">Chargement des statuts…</p>}
    {error && <p role="alert" className="text-sm text-[#a40e26] [overflow-wrap:anywhere]">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    <div className="flex flex-wrap gap-2">
      <button type="button" className={workflowControl} disabled={loading || pending} onClick={() => void read()}>Relire les statuts</button>
      {canManage && snapshot && <button type="button" className={workflowControl} disabled={!port.saveProjectStatuses || pending || loading || uncertain} onClick={() => { setEditing(true); editingRef.current = true; }}>Paramétrer les statuts</button>}
    </div>
    {canManage && !port.saveProjectStatuses && <p role="status" className="text-sm">L’enregistrement des statuts est indisponible.</p>}
    {editing && canManage && snapshot && <form aria-label="Paramétrage des statuts" onSubmit={event => { event.preventDefault(); void write('statuses'); }} className="space-y-4">
      <StatusDefinitionEditor statuses={statuses} migrations={migrations} tasks={snapshot.tasks} disabled={pending || loading || uncertain} onChange={(next, moves) => { setStatuses(next); setMigrations(moves); }} />
      <div className="flex flex-wrap gap-2"><button type="submit" className={workflowControl} disabled={pending || loading || uncertain || !validTemplateStatuses(statuses) || (sameStatuses(snapshot.statuses, statuses) && migrations.length === 0)}>Enregistrer les statuts</button><button type="button" className={workflowControl} disabled={pending} onClick={() => { setStatuses(copyStatuses(snapshot.statuses)); setMigrations([]); setEditing(false); editingRef.current = false; }}>Annuler les modifications</button></div>
    </form>}
    {snapshot && <TaskStatusKanban statuses={snapshot.statuses} tasks={snapshot.tasks} pending={pending || loading || uncertain || editing} onStatusChange={port.moveTask ? (id, status) => void write('task', id, status) : undefined} />}
  </section>;
}

async function readTemplates(port: ProjectWorkflowPort, signal: AbortSignal) {
  const templates = await port.readTemplates(signal);
  if (!Array.isArray(templates)) throw new Error(WORKFLOW_UNVERIFIED);
  templates.forEach(assertTemplate);
  if (new Set(templates.map(template => template.id)).size !== templates.length) throw new Error(WORKFLOW_UNVERIFIED);
  return templates;
}
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
    }).catch(reason => { if (!controller.signal.aborted) setError(message(reason)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
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
function TemplateManagerEditor({ port }: { port: ProjectWorkflowPort }) {
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
    } }).catch(reason => { if (!controller.signal.aborted) setError(message(reason)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
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
      if (active.current && !controller.signal.aborted) { setError(`${message(reason)} ${WORKFLOW_UNVERIFIED}`); setUncertain(true); }
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
