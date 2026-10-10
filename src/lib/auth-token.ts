import { frontUrl } from './front-urls';
import { parseFrontUrl } from './front-url';

export const MAIRIE360_AUTH_JWT_STORAGE_KEY = 'mairie360.auth.jwt';

const LEGACY_AUTH_JWT_STORAGE_KEYS = ['mairie360.projects.jwt'];

function normalizeJwtToken(token?: string | null) {
  const normalizedToken = token?.trim();

  return normalizedToken || null;
}

export function formatBearerToken(token: string) {
  return token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`;
}

export function getStoredAuthJwtToken() {
  if (typeof window === 'undefined') return null;

  try {
    const token = normalizeJwtToken(window.localStorage.getItem(MAIRIE360_AUTH_JWT_STORAGE_KEY));
    if (token) return token;

    for (const legacyKey of LEGACY_AUTH_JWT_STORAGE_KEYS) {
      const legacyToken = normalizeJwtToken(window.localStorage.getItem(legacyKey));

      if (legacyToken) {
        window.localStorage.setItem(MAIRIE360_AUTH_JWT_STORAGE_KEY, legacyToken);
        return legacyToken;
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function storeAuthJwtToken(token: string) {
  if (typeof window === 'undefined') return;

  const normalizedToken = normalizeJwtToken(token);

  try {
    if (normalizedToken) {
      window.localStorage.setItem(MAIRIE360_AUTH_JWT_STORAGE_KEY, normalizedToken);
    } else {
      window.localStorage.removeItem(MAIRIE360_AUTH_JWT_STORAGE_KEY);
    }
  } catch {
    // Some browser contexts can deny localStorage access; requests will simply run without the stored JWT.
  }
}

export function clearStoredAuthJwtToken() {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(MAIRIE360_AUTH_JWT_STORAGE_KEY);
    LEGACY_AUTH_JWT_STORAGE_KEYS.forEach((legacyKey) => window.localStorage.removeItem(legacyKey));
  } catch {
    // Ignore storage failures so logout flows do not crash.
  }
}

export function getStoredAuthorizationHeader() {
  const token = getStoredAuthJwtToken();

  return token ? formatBearerToken(token) : null;
}

const navigatingLocations = new WeakSet<Location>();
const logoutFlights = new WeakMap<Location, Promise<void>>();

/** A rejected renewal returns to Login without revoking or replaying a write. */
export function navigateToLogin() {
  if (typeof window === 'undefined' || navigatingLocations.has(window.location)) return;
  const login = parseFrontUrl(frontUrl('LOGIN_FRONT_URL'));
  if (!login) return;
  const own = parseFrontUrl(frontUrl('PROJECT_FRONT_URL'));
  const current = parseFrontUrl(window.location.href);
  if (own && current?.origin === own.origin) login.searchParams.set('returnUrl', current.href);
  navigatingLocations.add(window.location);
  clearStoredAuthJwtToken();
  window.location.assign(login.href);
}

/** Cookies are expired by Login only after its revocation response is received. */
export async function logoutAndReload() {
  if (typeof window === 'undefined') return;
  const location = window.location;
  const running = logoutFlights.get(location);
  if (running) return running;
  const pending = (async () => {
    let response: Response;
    try {
      response = await fetch('/api/auth/logout', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json' }, body: '{}',
      });
    } catch {
      throw new Error('La déconnexion n’a pas abouti. Vérifiez votre connexion et réessayez.');
    }
    if (!response.ok) throw new Error('La déconnexion n’a pas abouti. Veuillez réessayer.');
    let receipt: unknown;
    try { receipt = await response.json(); } catch {
      throw new Error('La déconnexion n’a pas pu être confirmée. Veuillez réessayer.');
    }
    if (typeof receipt !== 'object' || receipt === null || !('session_revoked' in receipt) || typeof receipt.session_revoked !== 'boolean') {
      throw new Error('La déconnexion n’a pas pu être confirmée. Veuillez réessayer.');
    }
    if (!receipt.session_revoked) {
      clearStoredAuthJwtToken();
      throw new Error('La session locale est fermée. La fermeture de la session serveur n’a pas pu être confirmée.');
    }
    let destination = parseFrontUrl(frontUrl('LOGIN_FRONT_URL'));
    if ('logout_url' in receipt) {
      if (typeof receipt.logout_url !== 'string') throw new Error('La destination de déconnexion est invalide.');
      const url = parseFrontUrl(receipt.logout_url);
      if (!url || url.protocol !== 'https:' || url.hash || !/^\/realms\/[^/]+\/protocol\/openid-connect\/logout$/.test(url.pathname)) {
        throw new Error('La destination de déconnexion est invalide.');
      }
      destination = url;
    }
    if (!destination) throw new Error('La connexion partagée n’est pas configurée.');
    clearStoredAuthJwtToken();
    location.assign(destination.href);
  })();
  logoutFlights.set(location, pending);
  try { await pending; } finally { logoutFlights.delete(location); }
}
