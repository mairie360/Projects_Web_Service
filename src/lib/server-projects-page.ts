import axios, { type AxiosAdapter } from 'axios';
import { NextRequest } from 'next/server';
import { getBffProject } from '@mairie360/bff-project-openapi/endpoints/bffProject';
import { isExpiredJwt, publicOrigin } from '@mairie360/lib-components/shared';
import { proxyBffRequest } from './bff-proxy';
import { parseProjectsPageReceipt, PROJECT_INITIAL_UNAVAILABLE, type InitialProjectsPage } from './project-page-receipt';
import { projectPageQuery, type ProjectPageUrlState } from './project-page-query';

/** Request-local SDK transport; the existing proxy owns published paths and session handling. */
export async function loadInitialProjectsPage(accessToken: string | undefined, query: ProjectPageUrlState): Promise<InitialProjectsPage> {
  const unavailable = { status: 'unavailable' as const, message: PROJECT_INITIAL_UNAVAILABLE };
  const origin = publicOrigin(process.env.PROJECT_FRONT_URL);
  if (!origin || isExpiredJwt(accessToken)) return unavailable;
  const adapter: AxiosAdapter = async config => {
    const target = new URL(axios.getUri(config), origin);
    if (config.method?.toUpperCase() !== 'GET' || target.origin !== origin) throw new Error(PROJECT_INITIAL_UNAVAILABLE);
    // Only accessToken is available to a document render. Never forward refresh cookies or browser headers.
    const request = new NextRequest(target, { method: 'GET', headers: { Accept: 'application/json', Cookie: `accessToken=${encodeURIComponent(accessToken!)}` } });
    const response = await proxyBffRequest(request, { params: Promise.resolve({ path: target.pathname.split('/').filter(Boolean).map(decodeURIComponent) }) });
    if (!response.ok) { await response.body?.cancel(); throw new Error(PROJECT_INITIAL_UNAVAILABLE); }
    return { data: await response.json(), status: response.status, statusText: response.statusText, headers: {}, config };
  };
  try {
    const api = getBffProject(axios.create({ adapter }));
    const { data } = await api.getProjectsPage(projectPageQuery(query));
    return { status: 'confirmed', query, data: parseProjectsPageReceipt(data, Number(query.page)) };
  } catch { return unavailable; }
}
