import { NextRequest } from 'next/server';
import { proxyPublishedBffRequest } from '@mairie360/lib-components/next';
import contract from '../../contracts/openapi.json';

type RouteContext = { params: Promise<{ path: string[] }> };

export function configuredBffUrl() {
  const value = (process.env.BFF_PROJECT_BASE_URL ??
    process.env.PROJECT_BFF_URL ??
    process.env.NEXT_PUBLIC_BFF_PROJECT_BASE_URL)?.trim();
  if (!value) return '';
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) return '';
    return value.replace(/\/+$/, '');
  } catch {
    return '';
  }
}

/** Both the API entry and the legacy catch-all enforce the published Project contract. */
export async function proxyBffRequest(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyPublishedBffRequest(request, path, {
    baseUrl: configuredBffUrl,
    paths: contract.paths,
    loginUrl: () => process.env.LOGIN_FRONT_URL?.trim() ?? '',
    frontUrl: () => process.env.PROJECT_FRONT_URL?.trim() ?? '',
  });
}
