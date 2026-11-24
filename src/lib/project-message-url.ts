import { parseFrontUrl } from '@/lib/front-url';
import { frontUrl } from '@/lib/front-urls';

const PROJECT_ID = /^(?:project-)?([1-9]\d{0,8})$/;

/**
 * Page of the messaging front that writes a message about a project: `<MESSAGE_FRONT_URL>/?context=project-<n>`.
 * Only the id travels; the messaging front reads the title from its BFF. `undefined` when the messaging front is
 * not configured or the id is not a project id.
 */
export function projectMessageHref(projectId: string): string | undefined {
  const base = parseFrontUrl(frontUrl('MESSAGE_FRONT_URL'));
  const match = PROJECT_ID.exec(projectId);
  if (!base || !match) return undefined;
  const url = new URL(base.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('context', `project-${match[1]}`);
  return url.href;
}
