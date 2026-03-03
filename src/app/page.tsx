'use client';

import React, { useState } from 'react';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  InputManager,
  ItemContainer,
  MiniCard,
  Paragraph,
  ProgressBar,
  Title,
} from '@mairie360/lib-components';
import { Calendar } from 'lucide-react';

import { Project, mockProjects, statusConfig, priorityConfig } from '../types/project';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [viewMode, setViewMode] = useState<'kanban' | 'table' | 'grid'>('kanban');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [alert, setAlert] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const moveProject = (projectId: string, newStatus: Project['status']) => {
    setProjects(prev =>
      prev.map(project =>
        project.id === projectId ? { ...project, status: newStatus } : project
      )
    );
  };

  const filteredProjects = projects.filter(project => {
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || project.priority === priorityFilter;
    const matchesSearch =
      project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesPriority && matchesSearch;
  });

  const groupedProjects: Record<Project['status'], Project[]> = {
    'todo': filteredProjects.filter(p => p.status === 'todo'),
    'in-progress': filteredProjects.filter(p => p.status === 'in-progress'),
    'review': filteredProjects.filter(p => p.status === 'review'),
    'done': filteredProjects.filter(p => p.status === 'done'),
  };

  const statusOptions = [
    { label: 'Tous les statuts', value: 'all' },
    { label: 'À faire', value: 'todo' },
    { label: 'En cours', value: 'in-progress' },
    { label: 'En révision', value: 'review' },
    { label: 'Terminé', value: 'done' },
  ];

  const priorityOptions = [
    { label: 'Toutes les priorités', value: 'all' },
    { label: 'Haute', value: 'high' },
    { label: 'Moyenne', value: 'medium' },
    { label: 'Basse', value: 'low' },
  ];

  const getBadgeVariant = (status: Project['status']): 'green' | 'red' | 'blue' | 'default' => {
    if (status === 'done') return 'green';
    if (status === 'todo') return 'red';
    return 'blue';
  };

  const getPriorityVariant = (priority: Project['priority']): 'red' | 'blue' | 'dark' => {
    if (priority === 'high') return 'red';
    if (priority === 'medium') return 'blue';
    return 'dark';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Alert */}
      {alert && (
        <div className="px-4 pt-4">
          <Alert
            type={alert.type}
            message={alert.message}
            closable
            onClose={() => setAlert(null)}
            autoDismiss={3000}
          />
        </div>
      )}

      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-gray-200">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <Title
            title="Projets"
            subtitle="Gérez vos projets municipaux avec des vues Kanban, tableau et grille"
          />
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              label="Nouveau projet"
              primary
              onClick={() => setAlert({ message: 'Fonctionnalité à venir.', type: 'info' })}
            />
            <Button
              label="Paramètres"
              onClick={() => setAlert({ message: 'Paramètres en cours de développement.', type: 'info' })}
            />
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="p-4 sm:p-6 border-b border-gray-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <div className="flex-1 max-w-md">
              <InputManager
                label="Rechercher"
                name="search"
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <InputManager
                label="Statut"
                name="statusFilter"
                type="select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={statusOptions}
              />
              <InputManager
                label="Priorité"
                name="priorityFilter"
                type="select"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                options={priorityOptions}
              />
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex gap-2">
            <Button
              label="Kanban"
              primary={viewMode === 'kanban'}
              size="btn-sm"
              onClick={() => setViewMode('kanban')}
            />
            <Button
              label="Grille"
              primary={viewMode === 'grid'}
              size="btn-sm"
              onClick={() => setViewMode('grid')}
            />
            <Button
              label="Table"
              primary={viewMode === 'table'}
              size="btn-sm"
              onClick={() => setViewMode('table')}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden bg-[#f5f3f0]">

        {/* Kanban View */}
        {viewMode === 'kanban' && (
          <div className="h-full p-4 sm:p-6">
            <div className="flex gap-6 h-full overflow-x-auto pb-6">
              {(Object.entries(groupedProjects) as [Project['status'], Project[]][]).map(([status, statusProjects]) => (
                <div key={status} className="flex-1 min-w-80">
                  <ItemContainer
                    title={statusConfig[status].label}
                    items={statusProjects.map(p => ({
                      id: p.id,
                      title: p.title,
                      description: `${priorityConfig[p.priority].label} · ${p.progress}% · ${p.tasks.completed}/${p.tasks.total} tâches`,
                    }))}
                    onAddItem={() =>
                      setAlert({ message: `Nouveau projet dans "${statusConfig[status].label}".`, type: 'success' })
                    }
                    onItemClick={(id) => {
                      const project = projects.find(p => p.id === id);
                      if (project) setAlert({ message: `Projet : ${project.title}`, type: 'info' });
                    }}
                    onItemDelete={(id) => {
                      setProjects(prev => prev.filter(p => p.id !== id));
                      setAlert({ message: 'Projet supprimé.', type: 'success' });
                    }}
                    onItemEdit={(id) =>
                      setAlert({ message: 'Modification en cours de développement.', type: 'info' })
                    }
                    onItemReorder={(newItems) => {
                      const reorderedIds = newItems.map(i => i.id);
                      setProjects(prev => {
                        const others = prev.filter(p => p.status !== status);
                        const reordered = reorderedIds
                          .map(id => prev.find(p => p.id === id)!)
                          .filter(Boolean);
                        return [...others, ...reordered];
                      });
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Grid View */}
        {viewMode === 'grid' && (
          <div className="p-4 sm:p-6 overflow-y-auto">
            {filteredProjects.length === 0 ? (
              <div className="text-center py-12">
                <Paragraph text="Aucun projet ne correspond aux filtres sélectionnés." textColor="#6b6b6b" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredProjects.map((project) => (
                  <div key={project.id} className="flex flex-col gap-2">
                    <MiniCard
                      title={project.title}
                      description={project.description}
                      label={priorityConfig[project.priority].label}
                      onClick={() => setAlert({ message: `Projet : ${project.title}`, type: 'info' })}
                      onDelete={() => {
                        setProjects(prev => prev.filter(p => p.id !== project.id));
                        setAlert({ message: 'Projet supprimé.', type: 'success' });
                      }}
                      onEdit={() => setAlert({ message: 'Modification en cours de développement.', type: 'info' })}
                    />
                    <div className="px-1 flex items-center gap-3">
                      <div className="flex-1">
                        <ProgressBar value={project.progress} />
                      </div>
                      <span className="text-xs font-medium text-[#3c3c3c]">{project.progress}%</span>
                      <Badge
                        text={statusConfig[project.status].label}
                        variant={getBadgeVariant(project.status)}
                        rounded
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Table View */}
        {viewMode === 'table' && (
          <div className="p-4 sm:p-6 overflow-y-auto">
            <div className="border-2 border-[#d9d5d0] rounded-lg overflow-hidden shadow-sm bg-white">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#f5f3f0] border-b-2 border-[#d9d5d0]">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-[#3c3c3c]">Projet</th>
                      <th className="text-left py-3 px-4 font-medium text-[#3c3c3c]">Statut</th>
                      <th className="text-left py-3 px-4 font-medium text-[#3c3c3c]">Responsable</th>
                      <th className="text-left py-3 px-4 font-medium text-[#3c3c3c]">Priorité</th>
                      <th className="text-left py-3 px-4 font-medium text-[#3c3c3c]">Progression</th>
                      <th className="text-left py-3 px-4 font-medium text-[#3c3c3c]">Échéance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-[#e8e6e3]">
                    {filteredProjects.map((project) => (
                      <tr
                        key={project.id}
                        className="hover:bg-[#f5f3f0] transition-colors cursor-pointer"
                        onClick={() => setAlert({ message: `Projet : ${project.title}`, type: 'info' })}
                      >
                        <td className="py-4 px-4">
                          <div className="font-medium text-[#3c3c3c]">{project.title}</div>
                          <div className="text-sm text-[#6b6b6b] truncate max-w-xs">{project.description}</div>
                        </td>
                        <td className="py-4 px-4">
                          <Badge
                            text={statusConfig[project.status].label}
                            variant={getBadgeVariant(project.status)}
                            rounded
                          />
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <Avatar
                              fallback={project.responsible.name.split(' ').map(n => n[0]).join('')}
                              className="h-7 w-7"
                            />
                            <span className="text-sm text-[#3c3c3c]">{project.responsible.name}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <Badge
                            text={priorityConfig[project.priority].label}
                            variant={getPriorityVariant(project.priority)}
                            rounded
                          />
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-20">
                              <ProgressBar value={project.progress} />
                            </div>
                            <span className="text-sm font-medium text-[#3c3c3c]">{project.progress}%</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1 text-sm text-[#6b6b6b]">
                            <Calendar className="h-3 w-3" />
                            {new Date(project.dueDate).toLocaleDateString('fr-FR')}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredProjects.length === 0 && (
                  <div className="text-center py-12">
                    <Paragraph text="Aucun projet ne correspond aux filtres sélectionnés." textColor="#6b6b6b" />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
