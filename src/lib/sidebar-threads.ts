import type { Project } from "@/types/session";

/**
 * The threads sidebar works like a terminal's tab strip: the user decides
 * which threads are open in it, grouped under the project they run in, with
 * at most one project expanded (the active project) at a time. This module
 * holds that state as pure functions plus a small persisted external store;
 * the React binding lives in hooks/useSidebarThreads.ts.
 */

export type OpenThreadEntry = {
  thread_id: string;
  /** Working directory the thread runs in; resolved to a project at render. */
  directory: string;
  /** Last known display name, so the row survives the thread leaving the
   * recent-threads page without a fetch per entry. */
  name: string;
  origin_host?: string | null;
};

export type SidebarThreadsState = {
  version: typeof SIDEBAR_THREADS_VERSION;
  /** Whether the "Projects" section is expanded. */
  projectsOpen: boolean;
  /** Directory whose project is expanded; null when every project is collapsed. */
  activeDirectory: string | null;
  openThreads: OpenThreadEntry[];
};

export const SIDEBAR_THREADS_VERSION = 1;
export const SIDEBAR_THREADS_STORAGE_PREFIX = "openbase-coder:sidebar-threads:v1";
export const MAX_OPEN_THREADS = 200;

export const initialSidebarThreadsState = (): SidebarThreadsState => ({
  version: SIDEBAR_THREADS_VERSION,
  projectsOpen: true,
  activeDirectory: null,
  openThreads: [],
});

const normalizePath = (path: string) => path.replace(/\/+$/, "") || path;

/**
 * Which top-level project a working directory belongs to. Exact project and
 * worktree paths win, then the longest project (or worktree) path that
 * contains the directory; a directory outside every known project is its own
 * project so nothing opened ever disappears from the sidebar.
 */
export function projectForDirectory(
  projects: Project[],
  directory: string,
): string {
  const target = normalizePath(directory);
  const roots = new Map<string, string>();
  const visit = (node: Project, root: string) => {
    roots.set(normalizePath(node.path), root);
    node.worktrees?.forEach((worktree) => visit(worktree, root));
  };
  projects.forEach((project) => visit(project, normalizePath(project.path)));
  const exact = roots.get(target);
  if (exact) return exact;
  let best: { path: string; root: string } | null = null;
  for (const [path, root] of roots) {
    if (target.startsWith(`${path}/`) && (!best || path.length > best.path.length))
      best = { path, root };
  }
  return best?.root ?? target;
}

export function openThread(
  state: SidebarThreadsState,
  entry: OpenThreadEntry,
  options: { activate?: boolean } = {},
): SidebarThreadsState {
  const activate = options.activate ?? true;
  const normalized: OpenThreadEntry = {
    ...entry,
    origin_host: entry.origin_host ?? null,
  };
  const existing = state.openThreads.find(
    (open) => open.thread_id === entry.thread_id,
  );
  const openThreads = existing
    ? state.openThreads.map((open) =>
        open === existing ? { ...open, ...normalized } : open,
      )
    : [...state.openThreads, normalized].slice(-MAX_OPEN_THREADS);
  return {
    ...state,
    openThreads,
    ...(activate
      ? { activeDirectory: entry.directory, projectsOpen: true }
      : {}),
  };
}

export function updateOpenThread(
  state: SidebarThreadsState,
  threadId: string,
  changes: Partial<Omit<OpenThreadEntry, "thread_id">>,
): SidebarThreadsState {
  let changed = false;
  const openThreads = state.openThreads.map((open) => {
    if (open.thread_id !== threadId) return open;
    const next = { ...open, ...changes };
    if (
      next.directory === open.directory &&
      next.name === open.name &&
      (next.origin_host ?? null) === (open.origin_host ?? null)
    )
      return open;
    changed = true;
    return next;
  });
  return changed ? { ...state, openThreads } : state;
}

export function closeThread(
  state: SidebarThreadsState,
  threadId: string,
): SidebarThreadsState {
  if (!state.openThreads.some((open) => open.thread_id === threadId))
    return state;
  return {
    ...state,
    openThreads: state.openThreads.filter(
      (open) => open.thread_id !== threadId,
    ),
  };
}

/** Expand one project (collapsing the others), or collapse it when it is
 * already the active one. */
export function toggleActiveProject(
  state: SidebarThreadsState,
  projects: Project[],
  path: string,
): SidebarThreadsState {
  const current = activeProjectPath(state, projects);
  const next = current === normalizePath(path) ? null : path;
  return { ...state, activeDirectory: next, projectsOpen: true };
}

export function setActiveDirectory(
  state: SidebarThreadsState,
  directory: string | null,
): SidebarThreadsState {
  return { ...state, activeDirectory: directory };
}

export function setProjectsOpen(
  state: SidebarThreadsState,
  open: boolean,
): SidebarThreadsState {
  return state.projectsOpen === open ? state : { ...state, projectsOpen: open };
}

export function activeProjectPath(
  state: SidebarThreadsState,
  projects: Project[],
): string | null {
  return state.activeDirectory
    ? projectForDirectory(projects, state.activeDirectory)
    : null;
}

export type SidebarProjectGroup = {
  path: string;
  /** Null for a directory the project list does not know about. */
  project: Project | null;
  threads: OpenThreadEntry[];
};

/**
 * Projects in list order, each with its open threads; directories the list
 * does not cover become trailing synthetic groups so their threads stay
 * reachable.
 */
export function groupOpenThreads(
  state: SidebarThreadsState,
  projects: Project[],
): SidebarProjectGroup[] {
  const groups = new Map<string, SidebarProjectGroup>();
  projects.forEach((project) => {
    const path = normalizePath(project.path);
    if (!groups.has(path)) groups.set(path, { path, project, threads: [] });
  });
  state.openThreads.forEach((entry) => {
    const path = projectForDirectory(projects, entry.directory);
    let group = groups.get(path);
    if (!group) {
      group = { path, project: null, threads: [] };
      groups.set(path, group);
    }
    group.threads.push(entry);
  });
  return [...groups.values()];
}

const isEntry = (value: unknown): value is OpenThreadEntry =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as OpenThreadEntry).thread_id === "string" &&
  typeof (value as OpenThreadEntry).directory === "string" &&
  typeof (value as OpenThreadEntry).name === "string";

export function readSidebarThreadsState(
  storage: Pick<Storage, "getItem">,
  key: string,
): SidebarThreadsState {
  try {
    const raw = storage.getItem(key);
    if (!raw) return initialSidebarThreadsState();
    const saved = JSON.parse(raw) as Partial<SidebarThreadsState>;
    if (saved.version !== SIDEBAR_THREADS_VERSION)
      return initialSidebarThreadsState();
    const seen = new Set<string>();
    const openThreads = (Array.isArray(saved.openThreads)
      ? saved.openThreads
      : []
    )
      .filter(isEntry)
      .filter((entry) => {
        if (seen.has(entry.thread_id)) return false;
        seen.add(entry.thread_id);
        return true;
      })
      .slice(-MAX_OPEN_THREADS)
      .map((entry) => ({
        thread_id: entry.thread_id,
        directory: entry.directory,
        name: entry.name,
        origin_host:
          typeof entry.origin_host === "string" ? entry.origin_host : null,
      }));
    return {
      version: SIDEBAR_THREADS_VERSION,
      projectsOpen: saved.projectsOpen !== false,
      activeDirectory:
        typeof saved.activeDirectory === "string" ? saved.activeDirectory : null,
      openThreads,
    };
  } catch {
    // A damaged or incompatible preference falls back to an empty sidebar.
    return initialSidebarThreadsState();
  }
}

export function writeSidebarThreadsState(
  storage: Pick<Storage, "setItem">,
  key: string,
  state: SidebarThreadsState,
): boolean {
  try {
    storage.setItem(key, JSON.stringify(state));
    return true;
  } catch {
    // Storage may be unavailable or full; the in-memory sidebar still works.
    return false;
  }
}

export type SidebarThreadsStore = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => SidebarThreadsState;
  update: (
    recipe: (state: SidebarThreadsState) => SidebarThreadsState,
  ) => void;
};

export function createSidebarThreadsStore(
  storage: Pick<Storage, "getItem" | "setItem"> | null,
  key: string,
): SidebarThreadsStore {
  let state = storage
    ? readSidebarThreadsState(storage, key)
    : initialSidebarThreadsState();
  const listeners = new Set<() => void>();
  return {
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => state,
    update: (recipe) => {
      const next = recipe(state);
      if (next === state) return;
      state = next;
      if (storage) writeSidebarThreadsState(storage, key, state);
      listeners.forEach((listener) => listener());
    },
  };
}
