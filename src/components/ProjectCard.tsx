
'use client';

import React from 'react';
import { Project } from '../types/project';
// import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { Button } from 'lib-components/button';
import { Progress } from './ui/progress';
import { Calendar, CheckCircle2, MoreHorizontal } from 'lucide-react';
import { useDrag } from 'react-dnd';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from './ui/dropdown-menu';

interface ProjectCardProps {
    project: Project;
    moveProject: (projectId: string, newStatus: Project['status']) => void;
    viewMode: 'kanban' | 'table' | 'grid';
    labelColors: string[];
    priorityConfig: {
      [key in Project['priority']]: {
        label: string;
        color: string;
        bg: string;
        border: string;
      };
    };
}

const ProjectCard = ({ project, moveProject, viewMode, labelColors, priorityConfig }: ProjectCardProps) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'project',
    item: { id: project.id, status: project.status },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntilDue = getDaysUntilDue(project.dueDate);
  const isOverdue = daysUntilDue < 0;
  const isDueSoon = daysUntilDue <= 7 && daysUntilDue >= 0;

  if (viewMode === 'kanban') {
    return (
      <div
        ref={drag}
        className={`bg-white border-2 border-[#d9d5d0] rounded-lg p-4 shadow-sm hover:shadow-lg hover:border-[#1256a6] transition-all duration-200 cursor-move ${
          isDragging ? 'opacity-50 rotate-2 scale-105 border-[#4b908d]' : ''
        }`}
      >
        <div className="flex items-start justify-between mb-3">
          <h4 className="font-medium text-sm leading-tight text-gray-900 pr-2">{project.title}</h4>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Modifier</DropdownMenuItem>
              <DropdownMenuItem>Dupliquer</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">Supprimer</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <p className="text-xs text-gray-600 mb-3 line-clamp-2">{project.description}</p>

        {/* Labels */}
        {project.labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {project.labels.slice(0, 2).map((label, index) => (
              <Badge
                key={label}
                variant="secondary"
                className={`text-xs px-2 py-0.5 ${labelColors[index % labelColors.length]}`}
              >
                {label}
              </Badge>
            ))}
            {project.labels.length > 2 && (
              <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600">
                +{project.labels.length - 2}
              </Badge>
            )}
          </div>
        )}

        {/* Progress */}
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-600">Progression</span>
            <span className="font-medium">{project.progress}%</span>
          </div>
          <Progress value={project.progress} className="h-1.5" />
        </div>

        {/* Tasks */}
        <div className="flex items-center justify-between text-xs text-gray-600 mb-3">
          <div className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            <span>{project.tasks.completed}/{project.tasks.total} tâches</span>
          </div>
          <div className={`flex items-center gap-1 ${priorityConfig[project.priority].color}`}>
            <div className={`w-2 h-2 rounded-full ${priorityConfig[project.priority].bg} ${priorityConfig[project.priority].border} border`} />
            <span className="font-medium">{priorityConfig[project.priority].label}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex -space-x-1">
            {/* {project.assignees.slice(0, 3).map((assignee, index) => (
              <Avatar key={index} className="h-6 w-6 border-2 border-white">
                <AvatarFallback className="text-xs bg-[#1256a6] text-white">
                  {assignee.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
            ))} */}
            {project.assignees.length > 3 && (
              <div className="h-6 w-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center">
                <span className="text-xs text-gray-600">+{project.assignees.length - 3}</span>
              </div>
            )}
          </div>
          <div className={`flex items-center gap-1 text-xs ${
            isOverdue ? 'text-red-600' : isDueSoon ? 'text-orange-600' : 'text-gray-500'
          }`}>
            <Calendar className="h-3 w-3" />
            <span>{new Date(project.dueDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</span>
          </div>
        </div>
      </div>
    );
  }