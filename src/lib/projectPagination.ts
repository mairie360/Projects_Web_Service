import type { ProjectsPageResponse } from './bffProjectClient';

export function isProjectPaginationValid(
  value: unknown,
  requestedPage: number
): value is ProjectsPageResponse['pagination'] {
  if (!value || typeof value !== 'object' || !Number.isSafeInteger(requestedPage) || requestedPage < 1) return false;
  const pagination = value as Record<string, unknown>;
  return Number.isSafeInteger(pagination.page) && pagination.page === requestedPage &&
    Number.isSafeInteger(pagination.limit) && (pagination.limit as number) > 0 &&
    Number.isSafeInteger(pagination.total) && (pagination.total as number) >= 0 &&
    typeof pagination.hasNextPage === 'boolean' &&
    pagination.hasNextPage === ((pagination.total as number) / (pagination.limit as number) > requestedPage);
}
