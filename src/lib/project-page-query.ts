import { ProjectStatus, ProjectPriority } from '@mairie360/bff-project-openapi/model';
import { readPageUrlState, urlChoice, urlDate, urlPage, urlText } from './page-url-state';
import type { ProjectsPageQuery } from './bffProjectClient';

export const projectUrlSchema = {
  q: urlText(200), status: urlChoice(['all', ...Object.values(ProjectStatus)], 'all'),
  priority: urlChoice(['all', ...Object.values(ProjectPriority)], 'all'), dueBefore: urlDate,
  view: urlChoice(['kanban', 'grid', 'table'], 'kanban'), page: urlPage,
};
export type ProjectPageUrlState = ReturnType<typeof readPageUrlState>;
export function projectPageQuery(state: ProjectPageUrlState): ProjectsPageQuery {
  return { q: state.q.trim() || undefined, status: state.status as ProjectsPageQuery['status'],
    priority: state.priority as ProjectsPageQuery['priority'], dueBefore: state.dueBefore || undefined,
    view: state.view as ProjectsPageQuery['view'], page: Number(state.page), limit: 50 };
}
export function projectQueryKey(state: ProjectPageUrlState) { return JSON.stringify(projectPageQuery(state)); }
export function searchFromPageParams(params: Record<string, string | string[] | undefined>) {
  const query = new URLSearchParams();
  for (const [key, values] of Object.entries(params)) for (const value of Array.isArray(values) ? values : values === undefined ? [] : [values]) query.append(key, value);
  return query.toString();
}
