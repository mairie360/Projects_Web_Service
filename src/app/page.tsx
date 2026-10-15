import React from 'react';
import { cookies } from 'next/headers';
import { createNonce } from '@mairie360/front-kit/shared';
import { readPageUrlState } from '@/lib/page-url-state';
import { projectUrlSchema, searchFromPageParams } from '@/lib/project-page-query';
import { loadInitialProjectsPage } from '@/lib/server-projects-page';
import ProjectsClient from './projects-client';

export const dynamic = 'force-dynamic';
export default async function ProjectsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const query = readPageUrlState(searchFromPageParams(await searchParams ?? {}), projectUrlSchema);
  const initial = await loadInitialProjectsPage((await cookies()).get('accessToken')?.value, query);
  return <ProjectsClient key={createNonce()} initial={initial} />;
}
