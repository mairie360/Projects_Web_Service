'use client';

import * as React from 'react';
import { useDrop } from 'react-dnd';
import { AlertCircle, CheckCircle2, Clock, Eye, Plus } from 'lucide-react';

import { Project } from '../types/project';
import { Badge } from './ui/badge';
import { Button } from '@mairie360/lib-components/button';
import { ProjectCard } from './ProjectCard';
import { statusConfig } from '../types/project';

interface KanbanColumnProps {
  status: Project['status'];
  projects: Project[];
  moveProject: (projectId: string, newStatus: Project['status']) => void;
}

const KanbanColumn = ({ status, projects, moveProject }: KanbanColumnProps) => {
  const [{ isOver }, drop] = useDrop({
    accept: 'project',
    drop: (item: { id: string; status: Project['status'] }) => {
      if (item.status !== status) {
        moveProject(item.id, status);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  const config = statusConfig[status];
  
  return (
    <div
      ref={drop}
      className={`flex-1 min-w-80 ${isOver ? 'bg-blue-50' : ''} transition-colors rounded-lg`}
    >
      <div className={`rounded-lg border-2 border-dashed ${isOver ? 'border-blue-300' : 'border-transparent'} p-1`}>
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`${config.color}`}>
                {config.icon}
              </div>
              <h3 className="font-medium text-gray-900">{config.label}</h3>
              <Badge variant="secondary" className="text-xs">
                {projects.length}
              </Badge>
            </div>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        <div className="space-y-3 px-2">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              moveProject={moveProject}
              viewMode="kanban"
            />
          ))}
        </div>
      </div>
    </div>
  );
};