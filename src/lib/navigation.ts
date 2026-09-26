import { frontUrl } from "@/lib/front-urls";
import { settingsProfileUrl } from "@/lib/settings-profile";
const pageRoutes: Partial<Record<string, string>> = {
  get dashboard() { return frontUrl("DASHBOARD_FRONT_URL"); },
  get projects() { return frontUrl("PROJECT_FRONT_URL"); },
  get messages() { return frontUrl("MESSAGE_FRONT_URL"); },
  get emails() { return frontUrl("EMAIL_FRONT_URL"); },
  get files() { return frontUrl("FILES_FRONT_URL"); },
  get training() { return frontUrl("ELEARNING_FRONT_URL"); },
  get calendar() { return frontUrl("CALENDAR_FRONT_URL"); },
  get admin() { return frontUrl("ADMINISTRATION_FRONT_URL"); },
  get settings() { return frontUrl("SETTINGS_FRONT_URL"); },
  get profile() { return settingsProfileUrl(frontUrl("SETTINGS_FRONT_URL")) ?? "/profile"; },
};

export function getNavigationHref(page: string) {
  return pageRoutes[page] ?? null;
}

export function navigateToPage(page: string) {
  const href = getNavigationHref(page);

  if (href) {
    window.location.assign(href);
  }
}
