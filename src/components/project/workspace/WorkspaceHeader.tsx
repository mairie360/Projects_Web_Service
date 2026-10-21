import { Plus, Settings } from 'lucide-react';

import { ActionButton } from '../ProjectFormControls';

export type ProjectAccessScope = 'all' | 'team' | 'assigned' | string;

export const accessScopeLabel = (scope: ProjectAccessScope) =>
  scope === 'all' ? 'Tous les projets municipaux' : scope === 'team' ? 'Projets de mon équipe' : 'Mes projets assignés';

export interface WorkspaceHeaderProps {
  title: string;
  subtitle: string;
  scope?: ProjectAccessScope;
  onCreate?: () => void;
  onSettings: () => void;
}

/** Page title, access scope, "Nouveau projet" (when allowed) and "Paramètres". */
export const WorkspaceHeader = ({ title, subtitle, scope, onCreate, onSettings }: WorkspaceHeaderProps) => (
  <section className="border-b border-[#dedbd6] pb-8">
    <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-bold leading-tight text-[#172033]">{title}</h1>
        <p className="mt-2 text-sm text-[#536171]">{subtitle}</p>
        {scope && (
          <span className="mt-3 inline-flex rounded-full border border-[#b9d6d5] bg-[#d4eeee] px-3 py-1 text-xs font-semibold text-[#2b706c]">
            {accessScopeLabel(scope)}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        {onCreate && <ActionButton label="Nouveau projet" icon={Plus} primary onClick={onCreate} />}
        <ActionButton label="Paramètres" icon={Settings} onClick={onSettings} />
      </div>
    </div>
  </section>
);
