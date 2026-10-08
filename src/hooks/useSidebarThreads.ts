import { useCallback, useMemo, useSyncExternalStore } from "react";
import {
  closeThread,
  createSidebarThreadsStore,
  openThread,
  setActiveDirectory,
  setProjectsOpen,
  SIDEBAR_THREADS_STORAGE_PREFIX,
  toggleActiveProject,
  updateOpenThread,
  type OpenThreadEntry,
  type SidebarThreadsStore,
} from "@/lib/sidebar-threads";
import { getBackendBaseUrl, getRouterBasename } from "@/lib/runtime-config";
import type { Project } from "@/types/session";

let store: SidebarThreadsStore | null = null;

function safeStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** One store per backend, like the pane layout, so two consoles pointed at
 * different runtimes do not share which threads are open. */
export function getSidebarThreadsStore(): SidebarThreadsStore {
  if (!store) {
    store = createSidebarThreadsStore(
      safeStorage(),
      `${SIDEBAR_THREADS_STORAGE_PREFIX}:${getBackendBaseUrl()}:${getRouterBasename()}`,
    );
  }
  return store;
}

/** Tests swap the storage-backed singleton for a fresh one. */
export function resetSidebarThreadsStore(next: SidebarThreadsStore | null = null) {
  store = next;
}

export function useSidebarThreads() {
  const current = getSidebarThreadsStore();
  const state = useSyncExternalStore(
    current.subscribe,
    current.getSnapshot,
    current.getSnapshot,
  );
  const open = useCallback(
    (entry: OpenThreadEntry, options?: { activate?: boolean }) =>
      current.update((state) => openThread(state, entry, options)),
    [current],
  );
  const update = useCallback(
    (
      threadId: string,
      changes: Partial<Omit<OpenThreadEntry, "thread_id">>,
    ) => current.update((state) => updateOpenThread(state, threadId, changes)),
    [current],
  );
  const close = useCallback(
    (threadId: string) =>
      current.update((state) => closeThread(state, threadId)),
    [current],
  );
  const toggleProject = useCallback(
    (projects: Project[], path: string) =>
      current.update((state) => toggleActiveProject(state, projects, path)),
    [current],
  );
  const activate = useCallback(
    (directory: string | null) =>
      current.update((state) => setActiveDirectory(state, directory)),
    [current],
  );
  const setProjectsExpanded = useCallback(
    (open: boolean) => current.update((state) => setProjectsOpen(state, open)),
    [current],
  );
  return useMemo(
    () => ({
      state,
      openThread: open,
      updateThread: update,
      closeThread: close,
      toggleProject,
      activate,
      setProjectsExpanded,
    }),
    [state, open, update, close, toggleProject, activate, setProjectsExpanded],
  );
}

export const THREADS_SIDEBAR_OPEN_KEY = "openbase-coder:threads-sidebar-open";
const sidebarOpenEvent = "openbase-coder:threads-sidebar-open-changed";

function readSidebarOpen(): boolean {
  try {
    return window.localStorage.getItem(THREADS_SIDEBAR_OPEN_KEY) !== "false";
  } catch {
    return true;
  }
}

function subscribeSidebarOpen(listener: () => void) {
  window.addEventListener(sidebarOpenEvent, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(sidebarOpenEvent, listener);
    window.removeEventListener("storage", listener);
  };
}

function writeSidebarOpen(open: boolean) {
  try {
    window.localStorage.setItem(THREADS_SIDEBAR_OPEN_KEY, String(open));
  } catch {
    // Preference is a convenience; the session state still toggles below.
  }
  window.dispatchEvent(new Event(sidebarOpenEvent));
}

/** Whether the threads sidebar is shown beside the rail on wide windows. */
export function useThreadsSidebarOpen() {
  return [
    useSyncExternalStore(subscribeSidebarOpen, readSidebarOpen, () => true),
    writeSidebarOpen,
  ] as const;
}
