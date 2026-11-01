import http from 'k6/http';
import { check, sleep, group } from 'k6';
import crypto from 'k6/crypto';
import encoding from 'k6/encoding';

// ---------------------------------------------------------------------------
// k6 load test of the Projects front (Projects_Web_Service).
// Two scenarios run side by side against the routes the Next.js server really serves:
//   * `reads`: the page (Next.js render behind the authentication middleware), /health, then the
//     /projects-page read the page fetches, relayed by the same-origin proxy to BFF Project,
//     the only BFF of this front (the shell session also comes from /projects-page);
//   * `writes` (MAIR-516): the project creation and deletion a user performs from the page,
//     POST then DELETE /projects (-> BFF Project -> Project API).
// Authentication goes through the accessToken cookie, like in the browser: the proxy turns it
// into Authorization: Bearer for the BFF.
// ---------------------------------------------------------------------------

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5001';
// Must match the JWT_SECRET of the core-api / bff-user / API services of the test stack.
const JWT_SECRET = __ENV.JWT_SECRET || 'b"secret"';
// User inserted by init-test.sql (token `sub`).
const USER_ID = __ENV.PERF_USER_ID || '2';

const STAGES = [
  { duration: '30s', target: 20 }, // ramp up
  { duration: '1m', target: 20 }, // plateau
  { duration: '10s', target: 0 }, // ramp down
];

export const options = {
  scenarios: {
    reads: { executor: 'ramping-vus', startVUs: 0, stages: STAGES, exec: 'reads', gracefulRampDown: '5s' },
    // Few VUs on purpose: every iteration writes twice in the Project API database.
    writes: { executor: 'constant-vus', vus: 3, duration: '1m40s', exec: 'writes' },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'], // < 1% of HTTP errors
    checks: ['rate>0.99'], // a redirect (307) is not an HTTP error: the checks catch it
    'http_req_duration{endpoint:page}': ['p(95)<800'],     // Next.js page render
    'http_req_duration{endpoint:health}': ['p(95)<150'],   // same-origin proxy -> BFF /health
    'http_req_duration{endpoint:projects}': ['p(95)<700'], // proxy + BFF aggregation + upstream
    'http_req_duration{endpoint:project-create}': ['p(95)<1000'], // proxy -> BFF Project -> Project API insert
    'http_req_duration{endpoint:project-delete}': ['p(95)<1000'], // proxy -> BFF Project -> Project API delete
  },
};

function b64url(value) {
  return encoding.b64encode(value, 'rawurl');
}

// JWT HS256 minimal accepté par Core API / BFF User (claims sub + role + exp).
function mintJwt() {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  // BFF Project reads the caller's role from this claim (MAIR-529) and only lets Responsable, Maire or
  // Admin create projects: sign the Admin role init-test.sql gives the user, or every POST answers 403.
  const payload = b64url(JSON.stringify({ sub: USER_ID, role: 'Admin', exp: now + 3600 }));
  const signingInput = `${header}.${payload}`;
  const signature = crypto.hmac('sha256', JWT_SECRET, signingInput, 'base64rawurl');
  return `${signingInput}.${signature}`;
}

export function setup() {
  return { token: mintJwt() };
}

export function reads(data) {
  const cookie = { Cookie: `accessToken=${data.token}` };
  // redirects: 0 : a redirect (e.g. to the Login front when the cookie is refused)
  // must fail the check instead of being followed outside the stack.
  const pageParams = { headers: cookie, redirects: 0, tags: { endpoint: 'page' } };
  const dataParams = { headers: { ...cookie, Accept: 'application/json' }, redirects: 0, tags: { endpoint: 'projects' } };

  group('pages', () => {
    const home = http.get(`${BASE_URL}/`, pageParams);
    check(home, { 'page / 200': (r) => r.status === 200 });
  });

  group('health', () => {
    const res = http.get(`${BASE_URL}/health`, { headers: cookie, redirects: 0, tags: { endpoint: 'health' } });
    check(res, { 'health 200': (r) => r.status === 200 });
  });

  group('projects reads', () => {
    // Browser path of the page (src/lib/bffProjectClient.ts calls the BFF path as is), not the root catch-all.
    const projectsPage = http.get(`${BASE_URL}/projects-page`, dataParams);
    check(projectsPage, { '/projects-page 200': (r) => r.status === 200 });
  });

  sleep(1);
}

function createdProjectId(response) {
  try {
    const body = response.json();
    const id = body && body.project && body.project.id;
    return id === undefined || id === null ? null : String(id);
  } catch {
    return null;
  }
}

export function writes(data) {
  const headers = { Cookie: `accessToken=${data.token}`, Accept: 'application/json', 'Content-Type': 'application/json' };

  group('project lifecycle', () => {
    const dueDate = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const created = http.post(
      `${BASE_URL}/projects`,
      JSON.stringify({
        title: `k6 ${__VU}-${__ITER}-${Date.now()}`,
        description: 'Temporary project of the k6 load test',
        dueDate,
        labels: ['k6'],
        priority: 'medium',
        responsibleId: `user-${USER_ID}`,
        assigneeIds: [`user-${USER_ID}`],
        status: 'todo',
      }),
      { headers, redirects: 0, tags: { endpoint: 'project-create' } },
    );
    const id = createdProjectId(created);
    const ok = check(created, {
      'POST /projects 200 or 201': (r) => r.status === 200 || r.status === 201,
      'POST /projects returns the project id': () => id !== null,
    });
    if (!ok) return;

    const deleted = http.del(`${BASE_URL}/projects/${id}`, null, {
      headers: { Cookie: headers.Cookie, Accept: 'application/json' },
      redirects: 0,
      tags: { endpoint: 'project-delete' },
    });
    check(deleted, { 'DELETE /projects/{id} 200 or 204': (r) => r.status === 200 || r.status === 204 });
  });

  sleep(1);
}
