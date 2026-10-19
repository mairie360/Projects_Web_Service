import { Skeleton } from "@mairie360/lib-components/primitives";

export default function LoadingProjects() {
  return <section aria-busy="true" aria-label="Chargement des projets" style={{ padding: '2rem' }}>
    <p role="status" aria-live="polite">Chargement des projets…</p>
    <div className="grid gap-4">{[0, 1, 2].map(row => <Skeleton key={row} className="h-24" />)}</div>
  </section>;
}
