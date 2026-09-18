"use client";

import { useEffect, useState } from "react";

import { BffProjectError, getProjectsPage, type ProjectsPageResponse } from "./bffProjectClient";

export { logoutAndReload } from "./auth-token";

export type AppRole = ProjectsPageResponse["access"]["role"];
export type ProjectsPageAccess = ProjectsPageResponse["access"];

export type AuthSessionUser = {
  name: string;
  email?: string;
  role?: string;
  service?: string;
  phone?: string;
  status?: string;
  avatar?: string;
  avatarUrl?: string;
  position?: string;
  address?: string;
  city?: string;
  lastConnection?: string;
};

export type AuthSession = {
  user: AuthSessionUser & { role: AppRole };
  role: AppRole;
  access: ProjectsPageAccess | null;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
};

const ROLE_LABELS: Record<AppRole, string> = {
  Admin: "Administrateur",
  Maire: "Maire",
  Responsable: "Responsable",
  User: "Agent",
  Guest: "Invité",
};

/**
 * Session affichée par le shell, dérivée uniquement du contrat de BFF_Project : c'est lui qui résout
 * l'utilisateur auprès de BFF User et renvoie son rôle dans `access`. Le contrat n'expose pas l'identité
 * (nom, e-mail), le shell affiche donc le libellé du rôle.
 */
export function authSessionFromAccess(
  access: ProjectsPageAccess | null,
  state: { loading?: boolean; error?: string | null } = {},
): AuthSession {
  const role = access?.role ?? "Guest";

  return {
    user: { name: access ? ROLE_LABELS[role] : "Chargement…", role },
    role,
    access,
    isAdmin: role === "Admin",
    loading: state.loading ?? access === null,
    error: state.error ?? null,
  };
}

/** Charge la session via `GET /projects-page?limit=1` quand la page n'a pas déjà la réponse du BFF. */
export function useAuthSession() {
  const [session, setSession] = useState<AuthSession>(() => authSessionFromAccess(null));

  useEffect(() => {
    const controller = new AbortController();

    getProjectsPage({ limit: 1 }, controller.signal)
      .then((page) => setSession(authSessionFromAccess(page.access)))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        // Un 401 a déjà déclenché la déconnexion dans le client BFF.
        if (error instanceof BffProjectError && error.status === 401) return;
        setSession((current) => ({
          ...current,
          loading: false,
          error: "Les informations de session sont indisponibles.",
        }));
      });

    return () => controller.abort();
  }, []);

  return session;
}
