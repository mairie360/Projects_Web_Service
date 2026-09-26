import type { LucideIcon } from 'lucide-react';
import {
  BriefcaseBusiness,
  CalendarDays,
  GraduationCap,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Shield,
} from 'lucide-react';

export { getNavigationHref } from './navigation';

export type AppNavigationItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  badge?: string;
};

export const appSidebarItems: AppNavigationItem[] = [
  { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { id: 'projects', label: 'Projets', icon: BriefcaseBusiness },
  { id: 'messages', label: 'Messagerie', icon: MessageSquare },
  { id: 'training', label: 'Formation', icon: GraduationCap },
  { id: 'calendar', label: 'Calendrier', icon: CalendarDays },
  { id: 'admin', label: 'Administration', icon: Shield, adminOnly: true, badge: 'Admin' },
  { id: 'settings', label: 'Paramètres', icon: Settings },
];
