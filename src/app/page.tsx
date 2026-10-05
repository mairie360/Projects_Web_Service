'use client';

import React from 'react';
import { ProjectsWorkspace } from '../components/project/ProjectsWorkspace';
import { useProjectsController } from '../components/project/useProjectsController';

export default function ProjectsPage() {
  const controller = useProjectsController();
  return <ProjectsWorkspace {...controller} />;
}
