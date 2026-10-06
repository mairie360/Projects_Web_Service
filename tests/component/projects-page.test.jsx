import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProjectsPage from "@/app/page";
import { getProjectDetails, getProjectsPage } from "@/lib/bffProjectClient";
import fixtures from "../support/bff-fixtures.cjs";

vi.mock("@/lib/bffProjectClient", async (importOriginal) => ({
  ...(await importOriginal()),
  getProjectDetails: vi.fn(),
  getProjectsPage: vi.fn(),
}));

beforeEach(() => {
  window.history.replaceState({}, "", "/");
  vi.mocked(getProjectsPage).mockResolvedValue(fixtures.projectsPage([]));
  vi.mocked(getProjectDetails).mockResolvedValue(fixtures.projectDetails());
});

describe("Projects page", () => {
  it("paginates the real page by keyboard using confirmed BFF metadata", async () => {
    const user = userEvent.setup();
    vi.mocked(getProjectsPage).mockImplementation(async ({ page }) => fixtures.projectsPage([
      fixtures.projectListItem({ id: `project-${page}`, title: `Projet page ${page}` }),
    ], { pagination: { page, limit: 50, total: 85, hasNextPage: page === 1 } }));
    render(<ProjectsPage />);
    expect(await screen.findByText("Page 1 · 85 projets")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Page précédente" }).disabled).toBe(true);
    screen.getByRole("button", { name: "Page suivante" }).focus();
    await user.keyboard("{Enter}");
    expect(await screen.findByText("Page 2 · 85 projets")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Page suivante" }).disabled).toBe(true);
    expect(screen.getByRole("button", { name: "Page précédente" }).disabled).toBe(false);
    expect(screen.queryByText("Projet page 1")).toBeNull();
    expect(getProjectsPage.mock.calls.map(([query]) => query.page)).toEqual([1, 2]);
    await user.click(screen.getByRole("button", { name: "Page précédente" }));
    expect(await screen.findByText("Page 1 · 85 projets")).toBeTruthy();
    expect(getProjectsPage.mock.calls.map(([query]) => query.page)).toEqual([1, 2, 1]);
  });

  it("guards pending paging, keeps the last confirmed page on refusal and retries only that GET", async () => {
    const user = userEvent.setup();
    let rejectRead;
    vi.mocked(getProjectsPage)
      .mockResolvedValueOnce(fixtures.projectsPage([fixtures.projectListItem()], {
        pagination: { page: 1, limit: 50, total: 85, hasNextPage: true },
      }))
      .mockImplementationOnce(() => new Promise((resolve, reject) => { rejectRead = reject; }));
    render(<ProjectsPage />);
    expect(await screen.findByText("Page 1 · 85 projets")).toBeTruthy();
    await user.dblClick(screen.getByRole("button", { name: "Page suivante" }));
    await waitFor(() => expect(getProjectsPage).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("button", { name: "Page suivante" }).disabled).toBe(true);
    rejectRead(new Error("Page suivante indisponible"));
    expect(await screen.findByText("Page suivante indisponible")).toBeTruthy();
    expect(screen.getByText("Page 1 · 85 projets")).toBeTruthy();
    expect(screen.getByRole("button", { name: `Ouvrir la fiche du projet ${fixtures.projectListItem().title}` })).toBeTruthy();
    vi.mocked(getProjectsPage).mockResolvedValueOnce(fixtures.projectsPage([], {
      pagination: { page: 2, limit: 50, total: 85, hasNextPage: false },
    }));
    await user.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(await screen.findByText("Page 2 · 85 projets")).toBeTruthy();
    expect(getProjectsPage.mock.calls.map(([query]) => query.page)).toEqual([1, 2, 2]);
    expect(screen.queryByText("Page suivante indisponible")).toBeNull();
  });

  it.each([
    { page: 0, limit: 50, total: -1, hasNextPage: true },
    null,
    { page: 1, limit: 50, total: 85, hasNextPage: false },
  ])("rejects inconsistent paging metadata %j without fabricating a total and can recover", async (pagination) => {
    const user = userEvent.setup();
    vi.mocked(getProjectsPage).mockResolvedValueOnce(fixtures.projectsPage([], {
      pagination,
    }));
    render(<ProjectsPage />);
    expect(await screen.findByText("La pagination reçue est incohérente. Réessayez le chargement des projets.")).toBeTruthy();
    expect(screen.queryByRole("navigation", { name: "Pagination des projets" })).toBeNull();
    vi.mocked(getProjectsPage).mockResolvedValueOnce(fixtures.projectsPage([]));
    await user.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(await screen.findByText("Page 1 · 0 projets")).toBeTruthy();
  });

  it("shows loading and then an empty BFF-backed board without inventing a project", async () => {
    render(<ProjectsPage />);

    expect(screen.getByText("Chargement des projets...")).toBeTruthy();
    await waitFor(() => expect(screen.queryByText("Chargement des projets...")).toBeNull());
    expect(getProjectsPage).toHaveBeenCalledOnce();
    expect(screen.getByRole("heading", { name: "Projets", level: 1 })).toBeTruthy();
    expect(screen.queryByRole("group", { name: fixtures.projectListItem().title })).toBeNull();
  });

  it("shows a BFF failure without rendering a fabricated project", async () => {
    vi.mocked(getProjectsPage).mockRejectedValue(new Error("Service projets indisponible"));
    render(<ProjectsPage />);

    expect(await screen.findByText("Service projets indisponible")).toBeTruthy();
    expect(screen.queryByRole("group", { name: fixtures.projectListItem().title })).toBeNull();
  });

  it("keeps the search and filter toolbar stacked until enough width is available", async () => {
    render(<ProjectsPage />);
    await waitFor(() => expect(screen.queryByText("Chargement des projets...")).toBeNull());

    const search = screen.getByPlaceholderText("Rechercher des projets...");
    const searchContainer = search.parentElement.parentElement;
    const controls = search.parentElement.parentElement.parentElement;
    const toolbar = controls.parentElement;

    expect(controls.classList.contains("w-full")).toBe(true);
    expect(controls.classList.contains("xl:flex-row")).toBe(true);
    expect(controls.classList.contains("md:flex-row")).toBe(false);
    expect(toolbar.classList.contains("items-start")).toBe(true);
    expect(toolbar.classList.contains("2xl:flex-row")).toBe(true);
    expect(toolbar.classList.contains("2xl:flex-wrap")).toBe(true);
    expect(controls.classList.contains("2xl:basis-[50rem]")).toBe(true);
    expect(toolbar.classList.contains("xl:flex-row")).toBe(false);
    expect(searchContainer.classList.contains("md:min-w-[280px]")).toBe(true);
    expect(searchContainer.classList.contains("2xl:min-w-[240px]")).toBe(true);
    expect(searchContainer.classList.contains("md:flex-1")).toBe(true);
    expect(screen.getByRole("tablist", { name: "Vue des projets" })).toBeTruthy();
  });

  it("opens the requested BFF-backed project and highlights its task", async () => {
    const project = fixtures.projectListItem();
    const task = fixtures.projectTask();
    vi.mocked(getProjectsPage).mockResolvedValue(fixtures.projectsPage([project]));
    vi.mocked(getProjectDetails).mockResolvedValue(fixtures.projectDetails(project, [task]));
    window.history.replaceState({}, "", `/?source=dashboard&project=${project.id}&task=${task.id}`);

    const { container } = render(<ProjectsPage />);

    expect(await screen.findByRole("heading", { name: project.title, level: 2 })).toBeTruthy();
    expect(getProjectDetails).toHaveBeenCalledExactlyOnceWith(project.id);
    expect(container.querySelector(`[data-linked-task="${task.id}"]`)).toBeTruthy();
    expect(screen.getByText(task.title)).toBeTruthy();
    expect(screen.getByRole("dialog", { name: project.title })).toBeTruthy();
    await waitFor(() => {
      expect(document.activeElement).toBe(container.querySelector(`[data-linked-task="${task.id}"]`));
    });
  });

  it("keeps keyboard focus inside a named project dialog and returns it to the opener", async () => {
    const user = userEvent.setup();
    const project = fixtures.projectListItem();
    vi.mocked(getProjectsPage).mockResolvedValue(fixtures.projectsPage([project]));
    vi.mocked(getProjectDetails).mockResolvedValue(fixtures.projectDetails(project));
    render(<ProjectsPage />);

    const opener = await screen.findByRole("button", { name: `Ouvrir la fiche du projet ${project.title}` });
    await user.click(opener);
    const dialog = await screen.findByRole("dialog", { name: project.title });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(document.activeElement).toBe(dialog);

    const focusable = Array.from(dialog.querySelectorAll("button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])"))
      .filter((element) => element.tabIndex >= 0 && element.getAttribute("aria-hidden") !== "true");
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    expect(first).toBeTruthy();
    expect(last).toBeTruthy();
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(last);
    await user.tab();
    expect(document.activeElement).toBe(first);

    const results = await axe(dialog);
    expect(results.violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual([]);

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog", { name: project.title })).toBeNull());
    expect(document.activeElement).toBe(opener);

    await user.click(opener);
    expect(await screen.findByRole("dialog", { name: project.title })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Fermer la fiche projet" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: project.title })).toBeNull());
    expect(document.activeElement).toBe(opener);
  });

  it("rejects an incomplete task link without requesting a project detail", async () => {
    window.history.replaceState({}, "", "/?task=task-1");
    render(<ProjectsPage />);

    expect(await screen.findByText("Lien de projet invalide.")).toBeTruthy();
    expect(getProjectDetails).not.toHaveBeenCalled();
  });

  it("keeps controls keyboard reachable and has no serious or critical axe violation", async () => {
    const user = userEvent.setup();
    render(<ProjectsPage />);
    await waitFor(() => expect(screen.queryByText("Chargement des projets...")).toBeNull());

    await user.tab();
    expect(document.activeElement?.matches("button, input, a")).toBe(true);
    expect(screen.getByRole("main")).toBeTruthy();

    const results = await axe(document.body);
    expect(results.violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual([]);
  });
});
