import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { DockLocation } from "flexlayout-react";
import { WorkspaceController } from "@/lib/workspace/WorkspaceController";
import {
  readWorkspaceLayout,
  saveWorkspaceLayout,
} from "@/lib/workspace/layout-storage";
import { getBackendBaseUrl, getRouterBasename } from "@/lib/runtime-config";
import type { WorkspaceTabTarget } from "@/lib/workspace-tabs";

type WorkspaceContextValue = {
  controller: WorkspaceController;
  host: HTMLDivElement | null;
  setHost: (host: HTMLDivElement | null) => void;
};
const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);
const emptySubscribe = () => () => {};
const emptySnapshot = () => 0;
export const WorkspacePanelContext = createContext<{
  id: string;
  root: HTMLDivElement | null;
} | null>(null);

export function WorkspaceTabsProvider({
  children,
  initialController,
}: {
  children: ReactNode;
  initialController?: WorkspaceController;
}) {
  const storageKey = `openbase:workspace:v1:${getBackendBaseUrl()}:${getRouterBasename()}`;
  const [controller] = useState(
    () =>
      initialController ??
      new WorkspaceController(
        readWorkspaceLayout(window.localStorage, storageKey) ?? undefined,
      ),
  );
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const value = useMemo(
    () => ({ controller, host, setHost }),
    [controller, host],
  );
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const save = () =>
      saveWorkspaceLayout(
        window.localStorage,
        storageKey,
        controller.serialize(),
      );
    const unsubscribe = controller.subscribe(() => {
      clearTimeout(timeout);
      timeout = setTimeout(save, 250);
    });
    const beforeUnload = (event: BeforeUnloadEvent) => {
      save();
      if (controller.tabs.some((tab) => controller.hasDrafts(tab.getId()))) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      clearTimeout(timeout);
      unsubscribe();
      save();
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [controller, storageKey]);
  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("Workspace provider is required");
  useSyncExternalStore(
    context.controller.subscribe,
    context.controller.getSnapshot,
  );
  return context;
}

export function useWorkspacePanel() {
  return useContext(WorkspacePanelContext);
}

export function useWorkspaceTabs() {
  const context = useContext(WorkspaceContext);
  const panel = useWorkspacePanel();
  return context
    ? {
        openTab: (
          target: WorkspaceTabTarget,
          direction = DockLocation.CENTER,
        ) => context.controller.openTab(target, direction, panel?.id),
      }
    : null;
}

export function useWorkspaceTabTitle(title: string | undefined) {
  const context = useContext(WorkspaceContext);
  const panel = useWorkspacePanel();
  useEffect(() => {
    if (title && panel) context?.controller.rename(panel.id, title);
  }, [context?.controller, panel?.id, title]);
}

export function useWorkspaceDraft(key: string, initialValue = "") {
  const context = useContext(WorkspaceContext);
  useSyncExternalStore(
    context?.controller.subscribe ?? emptySubscribe,
    context?.controller.getSnapshot ?? emptySnapshot,
  );
  const panel = useWorkspacePanel();
  const [fallback, setFallback] = useState<Map<string, string>>(
    () => new Map(),
  );
  const runtime =
    context && panel ? context.controller.runtime(panel.id) : null;
  const drafts = runtime?.drafts ?? fallback;
  const setDraft = (
    update: string | undefined | ((current: string) => string),
  ) => {
    const next =
      typeof update === "function"
        ? update(drafts.get(key) ?? initialValue)
        : update;
    if (next === undefined || next === initialValue) drafts.delete(key);
    else drafts.set(key, next);
    if (runtime) context!.controller.changed();
    else setFallback(new Map(drafts));
  };
  return [drafts.get(key) ?? initialValue, setDraft] as const;
}
