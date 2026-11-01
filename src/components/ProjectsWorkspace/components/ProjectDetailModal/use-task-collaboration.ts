import React from 'react';
import { addTaskComment, getBffProjectErrorMessage, getTaskCollaboration } from '@/lib/bffProjectClient';
import type { ProjectTask, TaskCollaboration, TaskComment } from '@/types/project';

type TaskFollowUpSelection = {
  projectId: string;
  taskId: string;
  confirmedComments: TaskComment[];
  loading: boolean;
};

// Comments and history of the task whose follow-up is open.
export function useTaskCollaboration({ projectId, tasks }: { projectId: string; tasks: ProjectTask[] }) {
  const [taskId, setTaskId] = React.useState<string | null>(null);
  const [collaboration, setCollaboration] = React.useState<TaskCollaboration | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [message, setMessageState] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const selectionRef = React.useRef<TaskFollowUpSelection | null>(null);
  const readRef = React.useRef(0);
  const requestRef = React.useRef<symbol | null>(null);

  React.useEffect(() => () => {
    selectionRef.current = null;
    readRef.current += 1;
    requestRef.current = null;
  }, []);

  const load = async (selection: TaskFollowUpSelection) => {
    if (selectionRef.current !== selection) return;
    const read = ++readRef.current;
    selection.loading = true;
    setError('');
    setLoading(true);
    const isCurrent = () => selectionRef.current === selection && readRef.current === read;
    try {
      const received = await getTaskCollaboration(selection.projectId, selection.taskId);
      if (!isCurrent()) return;
      // The POST response is already authoritative, even if the following read
      // temporarily fails or has not caught up with the confirmed comment yet.
      const receivedIds = new Set(received.comments.map((comment) => comment.id));
      setCollaboration({
        ...received,
        comments: [...received.comments, ...selection.confirmedComments.filter((comment) => !receivedIds.has(comment.id))],
      });
    } catch (error) {
      if (isCurrent()) {
        const prefix = selection.confirmedComments.length ? 'Commentaire enregistré. Actualisation impossible : ' : '';
        setError(`${prefix}${getBffProjectErrorMessage(error)}`);
      }
    } finally {
      if (isCurrent()) {
        selection.loading = false;
        setLoading(false);
      }
    }
  };

  const open = async (id: string) => {
    if (selectionRef.current?.taskId === id) {
      selectionRef.current = null;
      readRef.current += 1;
      setTaskId(null);
      setLoading(false);
      return;
    }

    const selection: TaskFollowUpSelection = { projectId, taskId: id, confirmedComments: [], loading: false };
    selectionRef.current = selection;
    setTaskId(id);
    setCollaboration(null);
    setError('');
    setMessageState('');
    await load(selection);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>, id: string) => {
    event.preventDefault();
    const text = message.trim();
    const selection = selectionRef.current;
    if (!text || requestRef.current || !selection || selection.taskId !== id || selection.loading ||
      tasks.find((task) => task.id === id)?.permissions?.canComment === false) return;

    const request = Symbol('comment-request');
    requestRef.current = request;
    setSaving(true);
    setError('');
    try {
      const confirmed = await addTaskComment(selection.projectId, id, text);
      if (selectionRef.current !== selection) return;
      selection.confirmedComments = [...selection.confirmedComments.filter((comment) => comment.id !== confirmed.id), confirmed];
      setCollaboration((current) => ({
        ...(current ?? { history: [], pagination: { page: 1, limit: 50, commentsTotal: 0, historyTotal: 0, hasNextPage: false } }),
        comments: [...(current?.comments ?? []).filter((comment) => comment.id !== confirmed.id), confirmed],
      }));
      setMessageState('');
      await load(selection);
    } catch (error) {
      if (selectionRef.current === selection) setError(getBffProjectErrorMessage(error));
    } finally {
      if (requestRef.current === request) {
        requestRef.current = null;
        setSaving(false);
      }
    }
  };

  const refresh = () => {
    const selection = selectionRef.current;
    if (selection && !requestRef.current && !selection.loading) void load(selection);
  };

  const setMessage = (value: string) => {
    if (!requestRef.current) setMessageState(value);
  };

  const reset = () => {
    selectionRef.current = null;
    readRef.current += 1;
    setTaskId(null);
    setCollaboration(null);
    setLoading(false);
    setError('');
    setMessageState('');
  };

  return { taskId, collaboration, loading, error, message, saving, open, submit, refresh, setMessage, reset };
}

export type TaskCollaborationState = ReturnType<typeof useTaskCollaboration>;
