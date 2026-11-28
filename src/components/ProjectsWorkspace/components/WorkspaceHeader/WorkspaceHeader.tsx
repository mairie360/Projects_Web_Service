import { Settings } from 'lucide-react';
import { Button, CreateButton, PageHeader } from '@mairie360/lib-components/primitives';

export interface WorkspaceHeaderProps {
  title: string;
  subtitle: string;
  onCreate?: () => void;
  onSettings: () => void;
}

/** The lib PageHeader (MAIR-828): title, subtitle, then « Paramètres » and « Nouveau projet » (when allowed), as in the artifact. */
export const WorkspaceHeader = ({ title, subtitle, onCreate, onSettings }: WorkspaceHeaderProps) => (
  <section className="border-b border-[var(--mairie-border)] pb-6">
    <PageHeader
      title={title}
      subtitle={subtitle}
      actions={(
        <>
          <Button label="Paramètres" variant="outline" tone="neutral" icon={Settings} onClick={onSettings} />
          {onCreate && <CreateButton label="Nouveau projet" onClick={onCreate} />}
        </>
      )}
    />
  </section>
);
