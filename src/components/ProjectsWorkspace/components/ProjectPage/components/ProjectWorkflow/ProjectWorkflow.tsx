'use client';

import React from 'react';
import { TaskStatusKanban } from './components/TaskStatusKanban';
import { StatusDefinitionEditor, workflowControl } from '@/components/ProjectsWorkspace/components/StatusDefinitionEditor';
import { assertWorkflowSnapshot, canManageWorkflow, sameStatuses, validStatuses, validTemplateStatuses, WORKFLOW_UNAVAILABLE, WORKFLOW_UNVERIFIED, WorkflowWriteRefusedError, type LoadedWorkflowTask, type ProjectWorkflowPort, type ProjectWorkflowSnapshot, type StatusMigration, type TaskStatusDefinition } from '@/lib/projectWorkflow';
import { workflowMessage, copyStatuses } from '@/components/ProjectsWorkspace/workflow-helpers';

export function ProjectWorkflow({ projectId, role, port, onSnapshot, onMutation, refreshKey, loadedTasks, onMoveTask, onSaveStatuses }: { projectId: string; role?: string; port?: ProjectWorkflowPort; onSnapshot?: (snapshot: ProjectWorkflowSnapshot) => void; onMutation?: () => void; refreshKey?: unknown; loadedTasks?: readonly LoadedWorkflowTask[]; onMoveTask?: ProjectWorkflowPort['moveTask']; onSaveStatuses?: ProjectWorkflowPort['saveProjectStatuses'] }) {
  // A keyed child owns all drafts, requests and confirmations for one project.
  return port ? <ConnectedProjectWorkflow key={projectId} projectId={projectId} role={role} port={port} onSnapshot={onSnapshot} onMutation={onMutation} refreshKey={refreshKey} loadedTasks={loadedTasks} onMoveTask={onMoveTask} onSaveStatuses={onSaveStatuses} /> : <p className="mb-4 rounded-md border border-[#d9d5d0] bg-white p-3 text-sm text-[#536171]">{WORKFLOW_UNAVAILABLE}</p>;
}

function ConnectedProjectWorkflow({ projectId, role, port, onSnapshot, onMutation, refreshKey, loadedTasks, onMoveTask, onSaveStatuses }: { projectId: string; role?: string; port: ProjectWorkflowPort; onSnapshot?: (snapshot: ProjectWorkflowSnapshot) => void; onMutation?: () => void; refreshKey?: unknown; loadedTasks?: readonly LoadedWorkflowTask[]; onMoveTask?: ProjectWorkflowPort['moveTask']; onSaveStatuses?: ProjectWorkflowPort['saveProjectStatuses'] }) {
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
  // The detail's own active tasks: the refresh below reuses them instead of reading the detail again.
  const loadedTasksRef = React.useRef(loadedTasks);
  React.useEffect(() => { loadedTasksRef.current = loadedTasks; }, [loadedTasks]);
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
      const response = await port.readProject(projectId, controller.signal, loadedTasksRef.current ? { tasks: loadedTasksRef.current } : undefined);
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
      if (active.current && !controller.signal.aborted) setError(workflowMessage(reason));
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

  // MAIR-570: the page controller owns these writes (shared task write guards); the port is the fallback.
  const saveProjectStatuses = onSaveStatuses ?? port.saveProjectStatuses;
  const moveTask = onMoveTask ?? port.moveTask;
  const write = async (action: 'statuses' | 'task', taskId?: string, statusId?: string) => {
    if (busy.current || !snapshot || loading || uncertain) return;
    if (action === 'statuses' && (!canManageWorkflow(role) || !saveProjectStatuses || !validStatuses(statuses))) return;
    if (action === 'task' && (!moveTask || !snapshot.tasks.some(task => task.id === taskId && task.canUpdateStatus) || !snapshot.statuses.some(status => status.id === statusId))) return;
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
        ? await saveProjectStatuses!({ projectId, revision: before.revision, statuses: copyStatuses(expected), migrations: migrations.map(migration => ({ ...migration })) }, controller.signal)
        : await moveTask!({ projectId, revision: before.revision, taskId: taskId!, statusId: statusId! }, controller.signal);
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
      if (!active.current || controller.signal.aborted) return;
      // Nothing was sent: show why, without asking for a verification read.
      if (reason instanceof WorkflowWriteRefusedError) setError(reason.message);
      else { setError(`${workflowMessage(reason)} ${WORKFLOW_UNVERIFIED}`); setUncertain(true); }
    } finally {
      busy.current = false;
      if (active.current && !controller.signal.aborted) setPending(false);
    }
  };
  const canManage = canManageWorkflow(role);
  return <section aria-label="Statuts et tâches du projet" className="mairie-workflow-panel mb-5 min-w-0 space-y-4 rounded-md border border-[#d9d5d0] bg-white p-4">
    <h2 className="font-semibold text-[#172033]">Statuts des tâches du projet</h2>
    {loading && <p role="status">Chargement des statuts…</p>}
    {error && <p role="alert" className="text-sm text-[#a40e26] [overflow-wrap:anywhere]">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    <div className="flex flex-wrap gap-2">
      <button type="button" className={workflowControl} disabled={loading || pending} onClick={() => void read()}>Relire les statuts</button>
      {canManage && snapshot && <button type="button" className={workflowControl} disabled={!saveProjectStatuses || pending || loading || uncertain} onClick={() => { setEditing(true); editingRef.current = true; }}>Paramétrer les statuts</button>}
    </div>
    {canManage && !saveProjectStatuses && <p role="status" className="text-sm">L’enregistrement des statuts est indisponible.</p>}
    {editing && canManage && snapshot && <form aria-label="Paramétrage des statuts" onSubmit={event => { event.preventDefault(); void write('statuses'); }} className="space-y-4">
      <StatusDefinitionEditor statuses={statuses} migrations={migrations} tasks={snapshot.tasks} disabled={pending || loading || uncertain} onChange={(next, moves) => { setStatuses(next); setMigrations(moves); }} />
      <div className="flex flex-wrap gap-2"><button type="submit" className={workflowControl} disabled={pending || loading || uncertain || !validTemplateStatuses(statuses) || (sameStatuses(snapshot.statuses, statuses) && migrations.length === 0)}>Enregistrer les statuts</button><button type="button" className={workflowControl} disabled={pending} onClick={() => { setStatuses(copyStatuses(snapshot.statuses)); setMigrations([]); setEditing(false); editingRef.current = false; }}>Annuler les modifications</button></div>
    </form>}
    {snapshot && <TaskStatusKanban statuses={snapshot.statuses} tasks={snapshot.tasks} pending={pending || loading || uncertain || editing} onStatusChange={moveTask ? (id, status) => void write('task', id, status) : undefined} />}
  </section>;
}
