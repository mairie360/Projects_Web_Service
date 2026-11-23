import { Settings } from 'lucide-react';
import { Button, CreateButton, PageHeader, Tag } from '@mairie360/lib-components/primitives';

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

/** The lib PageHeader (MAIR-828): title, access scope, « Nouveau projet » (when allowed) and « Paramètres ». */
export const WorkspaceHeader = ({ title, subtitle, scope, onCreate, onSettings }: WorkspaceHeaderProps) => (
  <section className="border-b border-[var(--mairie-border)] pb-6">
    <PageHeader
      title={title}
      subtitle={subtitle}
      actions={(
        <>
          {onCreate && <CreateButton label="Nouveau projet" onClick={onCreate} />}
          <Button label="Paramètres" variant="outline" tone="neutral" icon={Settings} onClick={onSettings} />
        </>
      )}
    />
    {scope && <Tag className="mt-3" label={accessScopeLabel(scope)} />}
  </section>
);
