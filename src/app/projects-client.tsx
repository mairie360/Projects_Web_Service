'use client';

import React from 'react';
import { ProjectsWorkspace } from '../components/project/ProjectsWorkspace';
import { useProjectsController } from '../components/project/useProjectsController';

import type { InitialProjectsPage } from '../lib/project-page-receipt';

export default function ProjectsClient({ initial }: { initial?: InitialProjectsPage }) {
  const controller = useProjectsController({ initial });
  return <ProjectsWorkspace {...controller} />;
}
