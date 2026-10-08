import { describe, expect, it } from "vitest";
import {
  activeProjectPath,
  closeThread,
  createSidebarThreadsStore,
  groupOpenThreads,
  initialSidebarThreadsState,
  MAX_OPEN_THREADS,
  openThread,
  projectForDirectory,
  readSidebarThreadsState,
  setProjectsOpen,
  toggleActiveProject,
  updateOpenThread,
  writeSidebarThreadsState,
} from "../sidebar-threads";
import type { Project } from "@/types/session";

const projects: Project[] = [
  {
    path: "/code/coder-workspace",
    worktrees: [{ path: "/code/coder-workspace-worktrees/task-a" }],
  },
  { path: "/code/cloud-workspace" },
  { path: "/code/cloud-workspace/api" },
];

const entry = (id: string, directory: string, name = id) => ({
  thread_id: id,
  directory,
  name,
});

const memoryStorage = () => {
  const stored = new Map<string, string>();
  return {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => {
      stored.set(key, value);
    },
    stored,
  };
};

describe("projectForDirectory", () => {
  it("matches exact project paths, trailing slashes included", () => {
    expect(projectForDirectory(projects, "/code/cloud-workspace/")).toBe(
      "/code/cloud-workspace",
    );
  });

  it("maps a registered worktree to its root project", () => {
    expect(
      projectForDirectory(projects, "/code/coder-workspace-worktrees/task-a"),
    ).toBe("/code/coder-workspace");
    expect(
      projectForDirectory(
        projects,
        "/code/coder-workspace-worktrees/task-a/cli",
      ),
    ).toBe("/code/coder-workspace");
  });

  it("prefers the most specific containing project", () => {
    expect(
      projectForDirectory(projects, "/code/cloud-workspace/api/openbase_api"),
    ).toBe("/code/cloud-workspace/api");
    expect(projectForDirectory(projects, "/code/cloud-workspace/console")).toBe(
      "/code/cloud-workspace",
    );
  });

  it("treats an unknown directory as its own project", () => {
    expect(projectForDirectory(projects, "/tmp/scratch")).toBe("/tmp/scratch");
    expect(projectForDirectory(projects, "/code/cloud-workspace-2")).toBe(
      "/code/cloud-workspace-2",
    );
  });
});

describe("open threads", () => {
  it("opening a thread adds it once and expands its project", () => {
    let state = initialSidebarThreadsState();
    state = setProjectsOpen(state, false);
    state = openThread(state, entry("t1", "/code/cloud-workspace"));
    state = openThread(state, entry("t1", "/code/cloud-workspace", "renamed"));
    expect(state.openThreads).toEqual([
      { ...entry("t1", "/code/cloud-workspace", "renamed"), origin_host: null },
    ]);
    expect(state.projectsOpen).toBe(true);
    expect(activeProjectPath(state, projects)).toBe("/code/cloud-workspace");
  });

  it("opening a worktree thread activates the root project", () => {
    const state = openThread(
      initialSidebarThreadsState(),
      entry("t1", "/code/coder-workspace-worktrees/task-a"),
    );
    expect(activeProjectPath(state, projects)).toBe("/code/coder-workspace");
  });

  it("can open without changing the active project", () => {
    let state = openThread(
      initialSidebarThreadsState(),
      entry("t1", "/code/cloud-workspace"),
    );
    state = openThread(state, entry("t2", "/code/coder-workspace"), {
      activate: false,
    });
    expect(activeProjectPath(state, projects)).toBe("/code/cloud-workspace");
    expect(state.openThreads.map((open) => open.thread_id)).toEqual([
      "t1",
      "t2",
    ]);
  });

  it("updates only threads that are still open and only when something differs", () => {
    const opened = openThread(
      initialSidebarThreadsState(),
      entry("t1", "/code/cloud-workspace"),
    );
    expect(updateOpenThread(opened, "t1", { name: "t1" })).toBe(opened);
    expect(updateOpenThread(opened, "missing", { name: "x" })).toBe(opened);
    const renamed = updateOpenThread(opened, "t1", { name: "Fix login" });
    expect(renamed.openThreads[0].name).toBe("Fix login");
    expect(renamed.activeDirectory).toBe("/code/cloud-workspace");
  });

  it("closing removes the entry and leaves the project expanded", () => {
    let state = openThread(
      initialSidebarThreadsState(),
      entry("t1", "/code/cloud-workspace"),
    );
    const before = state;
    expect(closeThread(state, "nope")).toBe(before);
    state = closeThread(state, "t1");
    expect(state.openThreads).toEqual([]);
    expect(activeProjectPath(state, projects)).toBe("/code/cloud-workspace");
  });

  it("keeps at most MAX_OPEN_THREADS entries, dropping the oldest", () => {
    let state = initialSidebarThreadsState();
    for (let i = 0; i <= MAX_OPEN_THREADS; i++) {
      state = openThread(state, entry(`t${i}`, "/code/cloud-workspace"));
    }
    expect(state.openThreads).toHaveLength(MAX_OPEN_THREADS);
    expect(state.openThreads[0].thread_id).toBe("t1");
  });
});

describe("active project", () => {
  it("expands exactly one project; toggling the active one collapses it", () => {
    let state = toggleActiveProject(
      initialSidebarThreadsState(),
      projects,
      "/code/cloud-workspace",
    );
    expect(activeProjectPath(state, projects)).toBe("/code/cloud-workspace");
    state = toggleActiveProject(state, projects, "/code/coder-workspace");
    expect(activeProjectPath(state, projects)).toBe("/code/coder-workspace");
    state = toggleActiveProject(state, projects, "/code/coder-workspace");
    expect(activeProjectPath(state, projects)).toBeNull();
  });

  it("toggling a project re-opens a collapsed Projects section", () => {
    const collapsed = setProjectsOpen(initialSidebarThreadsState(), false);
    expect(
      toggleActiveProject(collapsed, projects, "/code/cloud-workspace")
        .projectsOpen,
    ).toBe(true);
  });
});

describe("groupOpenThreads", () => {
  it("lists projects in order with their threads and appends unknown directories", () => {
    let state = initialSidebarThreadsState();
    state = openThread(state, entry("t1", "/code/cloud-workspace/api"));
    state = openThread(
      state,
      entry("t2", "/code/coder-workspace-worktrees/task-a"),
    );
    state = openThread(state, entry("t3", "/tmp/scratch"));
    const groups = groupOpenThreads(state, projects);
    expect(groups.map((group) => group.path)).toEqual([
      "/code/coder-workspace",
      "/code/cloud-workspace",
      "/code/cloud-workspace/api",
      "/tmp/scratch",
    ]);
    expect(groups[0].threads.map((open) => open.thread_id)).toEqual(["t2"]);
    expect(groups[1].threads).toEqual([]);
    expect(groups[2].threads.map((open) => open.thread_id)).toEqual(["t1"]);
    expect(groups[3].project).toBeNull();
    expect(groups[3].threads.map((open) => open.thread_id)).toEqual(["t3"]);
  });
});

describe("persistence", () => {
  it("round-trips through storage", () => {
    const storage = memoryStorage();
    let state = openThread(
      initialSidebarThreadsState(),
      entry("t1", "/code/cloud-workspace"),
    );
    state = setProjectsOpen(state, false);
    expect(writeSidebarThreadsState(storage, "key", state)).toBe(true);
    expect(readSidebarThreadsState(storage, "key")).toEqual(state);
  });

  it("drops malformed, duplicate, and incompatible saved data", () => {
    const storage = memoryStorage();
    storage.setItem("key", "{not json");
    expect(readSidebarThreadsState(storage, "key")).toEqual(
      initialSidebarThreadsState(),
    );
    storage.setItem("key", JSON.stringify({ version: 99, openThreads: [] }));
    expect(readSidebarThreadsState(storage, "key")).toEqual(
      initialSidebarThreadsState(),
    );
    storage.setItem(
      "key",
      JSON.stringify({
        version: 1,
        projectsOpen: "yes",
        activeDirectory: 42,
        openThreads: [
          entry("t1", "/a"),
          { thread_id: "t2" },
          entry("t1", "/b"),
          "junk",
        ],
      }),
    );
    expect(readSidebarThreadsState(storage, "key")).toEqual({
      version: 1,
      projectsOpen: true,
      activeDirectory: null,
      openThreads: [{ ...entry("t1", "/a"), origin_host: null }],
    });
  });

  it("the store notifies subscribers and persists only real changes", () => {
    const storage = memoryStorage();
    const store = createSidebarThreadsStore(storage, "key");
    let notified = 0;
    store.subscribe(() => {
      notified += 1;
    });
    store.update((state) => closeThread(state, "nope"));
    expect(notified).toBe(0);
    expect(storage.stored.has("key")).toBe(false);
    store.update((state) => openThread(state, entry("t1", "/code/x")));
    expect(notified).toBe(1);
    expect(store.getSnapshot().openThreads).toHaveLength(1);
    expect(createSidebarThreadsStore(storage, "key").getSnapshot()).toEqual(
      store.getSnapshot(),
    );
  });

  it("survives a storage that throws", () => {
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    const store = createSidebarThreadsStore(broken, "key");
    expect(store.getSnapshot()).toEqual(initialSidebarThreadsState());
    store.update((state) => openThread(state, entry("t1", "/code/x")));
    expect(store.getSnapshot().openThreads).toHaveLength(1);
  });
});
