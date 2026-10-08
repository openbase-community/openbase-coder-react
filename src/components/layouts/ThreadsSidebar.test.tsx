// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, useLocation } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { apiFetch } from "@/lib/api";
import {
  createSidebarThreadsStore,
  openThread,
  type SidebarThreadsStore,
} from "@/lib/sidebar-threads";
import { resetSidebarThreadsStore } from "@/hooks/useSidebarThreads";
import type { Project, ThreadInfo } from "@/types/session";
import { ThreadsSidebar } from "./ThreadsSidebar";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));

const projects: Project[] = [
  {
    path: "/code/coder-workspace",
    worktrees: [{ path: "/code/coder-workspace-worktrees/task-a" }],
  },
  { path: "/code/cloud-workspace" },
];

const thread = (
  id: string,
  directory: string,
  name: string,
  status: ThreadInfo["status"] = "idle",
): ThreadInfo => ({
  thread_id: id,
  directory,
  display_name: name,
  created_at: "2026-10-07T00:00:00.000Z",
  updated_at: "2026-10-07T00:00:00.000Z",
  current_turn: null,
  turn_history: [],
  status,
});

const threads = [
  thread("t1", "/code/coder-workspace", "Fix login", "running"),
  thread("t2", "/code/coder-workspace-worktrees/task-a", "Worktree task"),
  thread("t3", "/code/cloud-workspace", "Cloud deploy"),
];

function Location() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
}

let store: SidebarThreadsStore;

function renderSidebar(
  props: Partial<React.ComponentProps<typeof ThreadsSidebar>> = {},
) {
  return render(
    <MemoryRouter initialEntries={["/dashboard/dispatch"]}>
      <SidebarProvider>
        <ThreadsSidebar projects={projects} threads={threads} {...props} />
      </SidebarProvider>
      <Location />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: 1280,
  });
  store = createSidebarThreadsStore(null, "test");
  resetSidebarThreadsStore(store);
  vi.mocked(apiFetch).mockReset();
});

afterEach(() => {
  cleanup();
  resetSidebarThreadsStore(null);
  vi.unstubAllGlobals();
});

describe("ThreadsSidebar", () => {
  it("lists projects and expands exactly one at a time", () => {
    renderSidebar();
    const list = screen.getByRole("list", { name: "Projects" });
    const rows = within(list).getAllByRole("button", { expanded: false });
    expect(rows.map((row) => row.textContent)).toEqual([
      "coder-workspace",
      "cloud-workspace",
    ]);

    fireEvent.click(rows[0]);
    expect(rows[0].getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("No open threads")).toBeTruthy();

    fireEvent.click(rows[1]);
    expect(rows[0].getAttribute("aria-expanded")).toBe("false");
    expect(rows[1].getAttribute("aria-expanded")).toBe("true");

    fireEvent.click(rows[1]);
    expect(rows[1].getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("No open threads")).toBeNull();
  });

  it("shows open threads under their root project, navigates on click, and closes on demand", () => {
    store.update((state) =>
      openThread(
        openThread(state, {
          thread_id: "t2",
          directory: "/code/coder-workspace-worktrees/task-a",
          name: "Stale name",
        }),
        { thread_id: "t3", directory: "/code/cloud-workspace", name: "Cloud deploy" },
        { activate: false },
      ),
    );
    renderSidebar();
    const open = screen.getByRole("list", {
      name: "Open threads in coder-workspace",
    });
    // The polled list wins over the stored snapshot name.
    const row = within(open).getByRole("button", { name: "Worktree task" });
    expect(screen.queryByText("Cloud deploy")).toBeNull();

    fireEvent.click(row);
    expect(screen.getByTestId("location").textContent).toBe(
      "/dashboard/threads/t2",
    );
    expect(row.getAttribute("aria-current")).toBe("page");

    fireEvent.click(within(row).getByRole("button", { name: "Close Worktree task" }));
    expect(store.getSnapshot().openThreads.map((entry) => entry.thread_id)).toEqual(["t3"]);
    expect(screen.getByText("No open threads")).toBeTruthy();
    // Closing a sidebar row never leaves the thread page.
    expect(screen.getByTestId("location").textContent).toBe(
      "/dashboard/threads/t2",
    );
  });

  it("refreshes stored names from the polled list", async () => {
    store.update((state) =>
      openThread(state, {
        thread_id: "t1",
        directory: "/code/coder-workspace",
        name: "Old name",
      }),
    );
    renderSidebar();
    await waitFor(() =>
      expect(store.getSnapshot().openThreads[0].name).toBe("Fix login"),
    );
    expect(screen.getByLabelText("Running")).toBeTruthy();
  });

  it("starts a new thread in the active project and opens it", async () => {
    vi.mocked(apiFetch).mockResolvedValue(
      Response.json({ thread_id: "new-1", directory: "/code/cloud-workspace" }),
    );
    const refresh = vi.fn();
    renderSidebar({ refresh });
    fireEvent.click(screen.getByRole("button", { name: "cloud-workspace" }));
    fireEvent.click(
      within(
        screen.getByRole("list", { name: "Open threads in cloud-workspace" }),
      ).getByRole("button", { name: "New thread" }),
    );
    await waitFor(() =>
      expect(screen.getByTestId("location").textContent).toBe(
        "/dashboard/threads/new-1",
      ),
    );
    expect(apiFetch).toHaveBeenCalledWith("/api/threads/", {
      method: "POST",
      body: JSON.stringify({ directory: "/code/cloud-workspace" }),
    });
    expect(store.getSnapshot().openThreads).toEqual([
      {
        thread_id: "new-1",
        directory: "/code/cloud-workspace",
        name: "New thread",
        origin_host: null,
      },
    ]);
    expect(refresh).toHaveBeenCalled();
  });

  it("reports a failed thread creation without navigating", async () => {
    vi.mocked(apiFetch).mockResolvedValue(
      new Response(JSON.stringify({ error: "Directory missing" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }),
    );
    renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: "cloud-workspace" }));
    fireEvent.click(
      within(
        screen.getByRole("list", { name: "Open threads in cloud-workspace" }),
      ).getByRole("button", { name: "New thread" }),
    );
    await waitFor(() => expect(apiFetch).toHaveBeenCalled());
    await act(async () => {});
    expect(screen.getByTestId("location").textContent).toBe("/dashboard/dispatch");
    expect(store.getSnapshot().openThreads).toEqual([]);
  });

  it("offers recent threads of the project that are not open yet", async () => {
    store.update((state) =>
      openThread(state, {
        thread_id: "t1",
        directory: "/code/coder-workspace",
        name: "Fix login",
      }),
    );
    renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: "Open thread…" }));
    const search = await screen.findByPlaceholderText("Search recent threads");
    // t1 is already open and t3 belongs to another project.
    expect(screen.getByRole("button", { name: "Worktree task" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Cloud deploy" })).toBeNull();
    fireEvent.change(search, { target: { value: "zzz" } });
    expect(
      screen.getByText("No other recent threads in this project"),
    ).toBeTruthy();
    fireEvent.change(search, { target: { value: "work" } });
    fireEvent.click(screen.getByRole("button", { name: "Worktree task" }));
    expect(store.getSnapshot().openThreads.map((entry) => entry.thread_id)).toEqual(["t1", "t2"]);
    expect(screen.getByTestId("location").textContent).toBe(
      "/dashboard/threads/t2",
    );
  });

  it("collapses the Projects section and keeps the choice", () => {
    renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: "Collapse projects" }));
    expect(screen.queryByRole("list", { name: "Projects" })).toBeNull();
    expect(store.getSnapshot().projectsOpen).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Expand projects" }));
    expect(screen.getByRole("list", { name: "Projects" })).toBeTruthy();
  });

  it("keeps threads from directories outside every project reachable", () => {
    store.update((state) =>
      openThread(state, {
        thread_id: "t9",
        directory: "/tmp/scratch",
        name: "Scratch work",
      }),
    );
    renderSidebar();
    const row = screen.getByRole("button", { name: "scratch" });
    expect(row.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("button", { name: "Scratch work" })).toBeTruthy();
  });

  it("links to the project page and the full projects list", () => {
    const loadMoreProjects = vi.fn();
    renderSidebar({ nextProjectsUrl: "/api/projects/recent/?page=2", loadMoreProjects });
    fireEvent.click(screen.getByRole("button", { name: "Open project cloud-workspace" }));
    expect(screen.getByTestId("location").textContent).toBe("/dashboard/project");
    fireEvent.click(screen.getByRole("button", { name: "All projects" }));
    expect(screen.getByTestId("location").textContent).toBe("/dashboard/projects");
    fireEvent.click(screen.getByRole("button", { name: "Show more projects" }));
    expect(loadMoreProjects).toHaveBeenCalled();
  });
});
