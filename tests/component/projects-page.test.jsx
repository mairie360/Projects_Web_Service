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
