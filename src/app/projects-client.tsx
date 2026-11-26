'use client';

import React from 'react';
import { ProjectsWorkspace } from '../components/ProjectsWorkspace';
import { useProjectsController } from '../components/ProjectsWorkspace';

import type { InitialProjectsPage } from '../lib/project-page-receipt';

export default function ProjectsClient({ initial, commune }: { initial?: InitialProjectsPage; commune?: string }) {
  const controller = useProjectsController({ initial });
  return <ProjectsWorkspace {...controller} commune={commune} />;
}
