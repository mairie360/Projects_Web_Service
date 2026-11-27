import { createBffSearchSource } from '@mairie360/lib-components/shell';

/**
 * Global search of the shared header: same-origin `GET /search`, which the contract proxy forwards to BFF_Project
 * with the session. Created once, so the header does not search again on every render (it is an effect dependency).
 * A result opens in its module through the shell `hrefs`; for this module, `?project=<id>` and `?project=<id>&task=<id>`.
 */
export const globalSearchSource = createBffSearchSource();
