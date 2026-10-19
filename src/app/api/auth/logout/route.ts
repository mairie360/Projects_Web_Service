import { createSessionLogoutProxy } from '@mairie360/lib-components/next';

/** Explicit logout uses the same Login owner as session renewal. */
export const POST = createSessionLogoutProxy({
  loginUrl: () => process.env.LOGIN_FRONT_URL?.trim() ?? '',
  frontUrl: () => process.env.PROJECT_FRONT_URL?.trim() ?? '',
});
