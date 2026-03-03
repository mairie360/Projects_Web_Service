import { AlertCircle, CheckCircle2, Clock, Eye } from 'lucide-react';

export interface Project {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'review' | 'done';
  responsible: {
    name: string;
    avatar?: string;
  };
  assignees: {
    name: string;
    avatar?: string;
  }[];
  progress: number;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  labels: string[];
  tasks: {
    total: number;
    completed: number;
  };
  createdAt: string;
}

export const mockProjects: Project[] = [
  {
    id: '1',
    title: 'Rénovation de la bibliothèque municipale',
    description: 'Modernisation de l\'espace lecture et installation de nouveaux équipements numériques',
    status: 'in-progress',
    responsible: { name: 'Marie Dubois' },
    assignees: [
      { name: 'Marie Dubois' },
      { name: 'Pierre Martin' },
      { name: 'Sophie Leroy' }
    ],
    progress: 65,
    dueDate: '2024-12-15',
    priority: 'high',
    labels: ['Infrastructure', 'Urgent'],
    tasks: { total: 12, completed: 8 },
    createdAt: '2024-09-01'
  },
  {
    id: '2',
    title: 'Aménagement du parc central',
    description: 'Installation de nouveaux jeux pour enfants et création d\'un parcours santé',
    status: 'todo',
    responsible: { name: 'Pierre Martin' },
    assignees: [
      { name: 'Pierre Martin' },
      { name: 'Thomas Bernard' }
    ],
    progress: 20,
    dueDate: '2025-03-20',
    priority: 'medium',
    labels: ['Espaces verts', 'Loisirs'],
    tasks: { total: 8, completed: 2 },
    createdAt: '2024-08-15'
  },
  {
    id: '3',
    title: 'Digitalisation des archives',
    description: 'Numérisation des documents administratifs historiques',
    status: 'done',
    responsible: { name: 'Sophie Leroy' },
    assignees: [
      { name: 'Sophie Leroy' }
    ],
    progress: 100,
    dueDate: '2024-09-30',
    priority: 'low',
    labels: ['Numérique', 'Archives'],
    tasks: { total: 5, completed: 5 },
    createdAt: '2024-07-01'
  },
  {
    id: '4',
    title: 'Installation système éclairage LED',
    description: 'Remplacement de l\'éclairage public par des LED économiques',
    status: 'review',
    responsible: { name: 'Thomas Bernard' },
    assignees: [
      { name: 'Thomas Bernard' },
      { name: 'Marie Dubois' }
    ],
    progress: 85,
    dueDate: '2024-11-30',
    priority: 'high',
    labels: ['Énergie', 'Environnement'],
    tasks: { total: 15, completed: 13 },
    createdAt: '2024-06-20'
  },
  {
    id: '5',
    title: 'Création site web municipal',
    description: 'Développement d\'un nouveau site web moderne et accessible',
    status: 'in-progress',
    responsible: { name: 'Alex Moreau' },
    assignees: [
      { name: 'Alex Moreau' },
      { name: 'Sophie Leroy' }
    ],
    progress: 40,
    dueDate: '2024-12-31',
    priority: 'medium',
    labels: ['Numérique', 'Communication'],
    tasks: { total: 10, completed: 4 },
    createdAt: '2024-08-01'
  },
  {
    id: '6',
    title: 'Réfection des routes du centre-ville',
    description: 'Travaux de rénovation des principales artères du centre historique',
    status: 'todo',
    responsible: { name: 'Jean Dupont' },
    assignees: [
      { name: 'Jean Dupont' },
      { name: 'Pierre Martin' },
      { name: 'Thomas Bernard' }
    ],
    progress: 5,
    dueDate: '2025-05-15',
    priority: 'high',
    labels: ['Voirie', 'Travaux'],
    tasks: { total: 20, completed: 1 },
    createdAt: '2024-09-10'
  }
];

export const statusConfig = {
  'todo': {
    label: 'À faire',
    icon: <AlertCircle className="h-4 w-4" />,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-300'
  },
  'in-progress': {
    label: 'En cours',
    icon: <Clock className="h-4 w-4" />,
    color: 'text-[#1256a6]',
    bg: 'bg-[#d4e8e7]',
    border: 'border-[#1256a6]'
  },
  'review': {
    label: 'En révision',
    icon: <Eye className="h-4 w-4" />,
    color: 'text-[#1256a6]',
    bg: 'bg-[#d4e8e7]',
    border: 'border-[#1256a6]'
  },
  'done': {
    label: 'Terminé',
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-300'
  }
};

export const priorityConfig = {
  'high': { label: 'Haute', color: 'text-[#c53030]', bg: 'bg-red-50', border: 'border-[#c53030]' },
  'medium': { label: 'Moyenne', color: 'text-[#4b908d]', bg: 'bg-[#d4e8e7]', border: 'border-[#4b908d]' },
  'low': { label: 'Basse', color: 'text-[#6b6b6b]', bg: 'bg-[#e8e6e3]', border: 'border-[#d9d5d0]' }
};

export const labelColors = [
  'bg-[#1256a6] text-white',
  'bg-[#4b908d] text-white',
  'bg-[#3c3c3c] text-white',
  'bg-[#6aada9] text-white',
  'bg-[#c53030] text-white',
  'bg-[#0d3d6f] text-white'
];