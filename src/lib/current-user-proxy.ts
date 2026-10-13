import type { NextRequest } from 'next/server';
import type { SessionResponse } from '@mairie360/bff-user-openapi/model/sessionResponse';
import { validSessionToken } from '@mairie360/lib-components/next';

const unavailable = (status: number) => Response.json({ id: null }, { status, headers: { 'Cache-Control': 'no-store' } });

function trustedFront(value: string | undefined) {
  try {
    const url = new URL(value ?? '');
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password && !url.search && !url.hash ? url : null;
  } catch { return null; }
}

/** A frontend adapter for User 0.5's existing GET /me, owned by Login.
 * No names, roles or credentials are exposed as task-assignee guesses. */
export async function currentUser(request: NextRequest) {
  const front = trustedFront(process.env.PROJECT_FRONT_URL);
  const login = trustedFront(process.env.LOGIN_FRONT_URL);
  if (!front || !login) return unavailable(503);
  if (request.headers.get('sec-fetch-site') === 'cross-site' ||
    (request.headers.get('origin') && request.headers.get('origin') !== front.origin)) return unavailable(403);
  const target = new URL('/me', login);
  if (process.env.NODE_ENV === 'production' && target.protocol !== 'https:') return unavailable(503);
  const cookies = ['accessToken', 'refreshToken'].flatMap(name => {
    const value = request.cookies.get(name)?.value;
    return validSessionToken(value) ? [`${name}=${encodeURIComponent(value)}`] : [];
  });
  if (!cookies.length) return unavailable(401);
  try {
    const response = await fetch(target, {
      headers: { Accept: 'application/json', 'Sec-Fetch-Site': 'same-site', Cookie: cookies.join('; ') },
      cache: 'no-store', redirect: 'manual', signal: AbortSignal.any([request.signal, AbortSignal.timeout(10_000)]),
    });
    request.signal.throwIfAborted();
    if (response.status !== 200) return unavailable(response.status >= 400 && response.status < 600 ? response.status : 502);
    const body: unknown = await response.json();
    request.signal.throwIfAborted();
    if (!body || typeof body !== 'object' || !('user' in body) || !body.user || typeof body.user !== 'object' ||
      !('groups' in body) || !Array.isArray(body.groups) || !('roles' in body) || !Array.isArray(body.roles)) return unavailable(502);
    const user = body.user as Partial<SessionResponse['user']>;
    if (typeof user.first_name !== 'string' || typeof user.last_name !== 'string' || typeof user.email !== 'string' || typeof user.status !== 'string') return unavailable(502);
    // The ID is optional in the actual SDK. Absent/unsupported IDs keep manual selection.
    const id = typeof user.id === 'number' && Number.isSafeInteger(user.id) && user.id > 0 ? String(user.id)
      : typeof user.id === 'string' && /^[1-9]\d*$/.test(user.id) && Number.isSafeInteger(Number(user.id)) ? user.id : null;
    const headers = new Headers({ 'Cache-Control': 'no-store' });
    for (const cookie of response.headers.getSetCookie()) headers.append('Set-Cookie', cookie);
    return Response.json({ id }, { headers });
  } catch { return unavailable(502); }
}
