import React from 'react';
import { addProjectMember, BffProjectError, getBffProjectErrorMessage, removeProjectMember, updateProjectMemberRole } from '@/lib/bffProjectClient';
import type { Project, ProjectMember, ProjectMemberRole } from '@/types/project';

/** MAIR-1088: the owner of a project keeps it: neither removed nor given another role (BFF 409). */
export const OWNER_KEPT = 'Le responsable du projet reste dans l’équipe avec le rôle Responsable : il ne peut être ni retiré ni changé de rôle.';

const refusal = (failure: unknown) => (failure instanceof BffProjectError && failure.status === 409 ? OWNER_KEPT : getBffProjectErrorMessage(failure));

/**
 * MAIR-874 (C1) / MAIR-1088: the team of the project page. The detail gives every member with their role and load;
 * an addition or a role change answers the whole team as re-read, a removal drops the member. A new detail replaces it.
 */
export function useProjectMembers(project: Pick<Project, 'id' | 'members'>) {
  const [state, setState] = React.useState(() => ({ source: project.members, projectId: project.id, members: project.members ?? [] }));
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');
  const pendingRef = React.useRef(false);

  if (state.source !== project.members || state.projectId !== project.id) {
    setState({ source: project.members, projectId: project.id, members: project.members ?? [] });
    if (state.projectId !== project.id) { setError(''); setNotice(''); }
  }

  const run = async (key: string, write: () => Promise<(members: ProjectMember[]) => ProjectMember[]>, done: string) => {
    if (pendingRef.current) return false;
    pendingRef.current = true;
    setPendingId(key);
    setError('');
    setNotice('');
    const projectId = project.id;
    try {
      const apply = await write();
      setState((current) => current.projectId === projectId ? { ...current, members: apply(current.members) } : current);
      setNotice(done);
      return true;
    } catch (failure) {
      setError(refusal(failure));
      return false;
    } finally {
      pendingRef.current = false;
      setPendingId(null);
    }
  };

  const nameOf = (userId: string) => state.members.find((member) => member.id === userId)?.name ?? 'Le membre';

  const add = (userId: string, role: ProjectMemberRole, name: string) => run(userId, async () => {
    const members = await addProjectMember(project.id, userId, role);
    return () => members;
  }, `${name} a rejoint l’équipe.`);

  const changeRole = (userId: string, role: ProjectMemberRole) => {
    const name = nameOf(userId);
    return run(userId, async () => {
      const members = await updateProjectMemberRole(project.id, userId, role);
      return () => members;
    }, `Rôle de ${name} mis à jour.`);
  };

  const remove = (userId: string) => {
    const name = nameOf(userId);
    return run(userId, async () => {
      await removeProjectMember(project.id, userId);
      return (members) => members.filter((member) => member.id !== userId);
    }, `${name} a quitté l’équipe.`);
  };

  return { members: state.members, pendingId, error, notice, add, changeRole, remove };
}

export type ProjectMembers = ReturnType<typeof useProjectMembers>;
