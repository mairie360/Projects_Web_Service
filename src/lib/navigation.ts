const pageRoutes: Partial<Record<string, string>> = {
  dashboard: process.env.LOGIN_FRONT_URL,
  projects: process.env.PROJECT_FRONT_URL,
  messages: process.env.MESSAGE_FRONT_URL,
  emails: process.env.EMAIL_FRONT_URL,
  files: process.env.FILES_FRONT_URL,
  training: process.env.ELEARNING_FRONT_URL,
  calendar: process.env.CALENDAR_FRONT_URL,
  admin: process.env.ADMINISTRATION_FRONT_URL,
  profile: "/profile",
};

export function navigateToPage(page: string) {
  const href = pageRoutes[page];

  if (href) {
    window.location.assign(href);
  }
}
