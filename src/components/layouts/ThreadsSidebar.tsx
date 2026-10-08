import { NewThreadDialog } from "@/components/NewThreadDialog";
import { ThreadGlyph } from "@/components/ThreadGlyph";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useSidebar } from "@/components/ui/sidebar";
import { OpenInNewTabMenu } from "@/components/workspace/OpenInNewTabMenu";
import { useSidebarThreads } from "@/hooks/useSidebarThreads";
import { apiFetch } from "@/lib/api";
import { extractErrorMessage } from "@/lib/api-errors";
import { projectName } from "@/lib/project-display";
import {
  activeProjectPath,
  groupOpenThreads,
  projectForDirectory,
  type OpenThreadEntry,
  type SidebarProjectGroup,
} from "@/lib/sidebar-threads";
import {
  isDispatcherThread,
  threadDisplayName,
  threadRoutePath,
} from "@/lib/thread-display";
import { cn } from "@/lib/utils";
import { projectTabTarget } from "@/lib/workspace-tabs";
import type { Project, ThreadInfo } from "@/types/session";
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  History,
  LoaderCircle,
  Plus,
  Search,
  SquarePen,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

export type ThreadsSidebarProps = {
  projects: Project[];
  threads: ThreadInfo[];
  projectsLoading?: boolean;
  nextProjectsUrl?: string | null;
  loadingMoreProjects?: boolean;
  loadMoreProjects?: () => void;
  /** Re-fetch projects and threads after a thread is created. */
  refresh?: () => void;
};

const rowClass =
  "group flex h-7 w-full min-w-0 items-center gap-2 rounded-md px-2 text-left text-[12.5px] text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring";

const iconButtonClass =
  "flex h-5 w-5 shrink-0 items-center justify-center rounded text-sidebar-foreground/60 hover:bg-sidebar-accent-foreground/10 hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring";

export const threadIdFromPathname = (pathname: string): string | null => {
  const match = /^\/dashboard\/threads\/([^/]+)$/.exec(pathname);
  return match ? decodeURIComponent(match[1]) : null;
};

async function createThread(directory: string): Promise<string> {
  const response = await apiFetch("/api/threads/", {
    method: "POST",
    body: JSON.stringify({ directory }),
  });
  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(response, "Failed to create thread"),
    );
  }
  const data = await response.json();
  return String(data.thread_id);
}

function ThreadRow({
  entry,
  live,
  active,
  onOpen,
  onClose,
}: {
  entry: OpenThreadEntry;
  live: ThreadInfo | undefined;
  active: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  const name = live ? threadDisplayName(live) : entry.name;
  const running = live?.status === "running";
  const path = live
    ? threadRoutePath(live)
    : `/dashboard/threads/${encodeURIComponent(entry.thread_id)}`;
  return (
    <OpenInNewTabMenu target={{ path, title: name }}>
      <div
        role="button"
        tabIndex={0}
        data-active={active}
        data-thread-id={entry.thread_id}
        aria-label={name}
        aria-current={active ? "page" : undefined}
        onClick={onOpen}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpen();
          }
        }}
        className={cn(
          rowClass,
          "cursor-pointer pl-7 data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-primary",
        )}
        title={name}
      >
        {live ? (
          <ThreadGlyph thread={live} className="text-sidebar-foreground/60" />
        ) : (
          <span className="h-3 w-3 shrink-0 rounded-full border border-sidebar-foreground/30" />
        )}
        <span className="min-w-0 flex-1 truncate">{name}</span>
        {running ? (
          <span
            aria-label="Running"
            title="Running"
            className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-success"
          />
        ) : null}
        <button
          type="button"
          aria-label={`Close ${name}`}
          title="Close (keeps the thread)"
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
          className={cn(
            iconButtonClass,
            "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
          )}
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </OpenInNewTabMenu>
  );
}

function OpenExistingThread({
  projectPath,
  projects,
  threads,
  openIds,
  onPick,
}: {
  projectPath: string;
  projects: Project[];
  threads: ThreadInfo[];
  openIds: Set<string>;
  onPick: (thread: ThreadInfo) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const candidates = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return threads.filter(
      (thread) =>
        !isDispatcherThread(thread) &&
        !openIds.has(thread.thread_id) &&
        projectForDirectory(projects, thread.directory) === projectPath &&
        (!normalized ||
          threadDisplayName(thread).toLowerCase().includes(normalized)),
    );
  }, [openIds, projectPath, projects, query, threads]);
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <button type="button" className={cn(rowClass, "pl-7 text-sidebar-foreground/75")}>
          <History className="h-3.5 w-3.5 shrink-0" strokeWidth={1.9} />
          <span className="truncate">Open thread…</span>
        </button>
      </PopoverTrigger>
      <PopoverContent side="right" align="start" className="w-72 p-0">
        <div className="border-b border-border p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              className="h-8 pl-7 text-[12px]"
              placeholder="Search recent threads"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {candidates.length === 0 ? (
            <p className="px-2 py-3 text-center text-[12px] text-muted-foreground">
              {threads.length === 0
                ? "No recent threads"
                : "No other recent threads in this project"}
            </p>
          ) : (
            candidates.map((thread) => (
              <button
                key={thread.thread_id}
                type="button"
                onClick={() => {
                  setOpen(false);
                  onPick(thread);
                }}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-[12.5px] hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ThreadGlyph thread={thread} />
                <span className="min-w-0 flex-1 truncate">
                  {threadDisplayName(thread)}
                </span>
                {thread.status === "running" ? (
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
                ) : null}
              </button>
            ))
          )}
        </div>
        <div className="border-t border-border p-1">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate("/dashboard/threads");
            }}
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-[12px] text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            All threads
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ProjectRow({
  group,
  active,
  activeThreadId,
  liveThreads,
  projects,
  threads,
  openIds,
  onToggle,
  onOpenProject,
  onOpenThread,
  onCloseThread,
  onNewThread,
  onPickThread,
  creating,
}: {
  group: SidebarProjectGroup;
  active: boolean;
  activeThreadId: string | null;
  liveThreads: Map<string, ThreadInfo>;
  projects: Project[];
  threads: ThreadInfo[];
  openIds: Set<string>;
  onToggle: () => void;
  onOpenProject: () => void;
  onOpenThread: (entry: OpenThreadEntry) => void;
  onCloseThread: (entry: OpenThreadEntry) => void;
  onNewThread: () => void;
  onPickThread: (thread: ThreadInfo) => void;
  creating: boolean;
}) {
  const name = projectName(group.path);
  const Chevron = active ? ChevronDown : ChevronRight;
  const FolderIcon = active ? FolderOpen : Folder;
  return (
    <li data-project={group.path} data-active={active}>
      <OpenInNewTabMenu target={projectTabTarget(group.path)}>
        <div
          role="button"
          tabIndex={0}
          aria-expanded={active}
          onClick={onToggle}
          onKeyDown={(event) => {
            if (event.target !== event.currentTarget) return;
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onToggle();
            }
          }}
          className={cn(
            rowClass,
            "cursor-pointer font-medium",
            active && "text-sidebar-primary",
          )}
          title={group.path}
        >
          <Chevron className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/50" />
          <FolderIcon className="h-4 w-4 shrink-0" strokeWidth={1.8} />
          <span className="min-w-0 flex-1 truncate">{name}</span>
          {group.threads.length > 0 && !active ? (
            <span className="shrink-0 rounded-full bg-sidebar-accent px-1.5 font-mono text-[10px] text-sidebar-foreground/70">
              {group.threads.length}
            </span>
          ) : null}
          <button
            type="button"
            aria-label={`Open project ${name}`}
            title="Open project page"
            onClick={(event) => {
              event.stopPropagation();
              onOpenProject();
            }}
            className={cn(
              iconButtonClass,
              "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
            )}
          >
            <FolderOpen className="h-3 w-3" />
          </button>
        </div>
      </OpenInNewTabMenu>
      {active ? (
        <ul className="mt-0.5 space-y-px" aria-label={`Open threads in ${name}`}>
          {group.threads.map((entry) => (
            <li key={entry.thread_id}>
              <ThreadRow
                entry={entry}
                live={liveThreads.get(entry.thread_id)}
                active={entry.thread_id === activeThreadId}
                onOpen={() => onOpenThread(entry)}
                onClose={() => onCloseThread(entry)}
              />
            </li>
          ))}
          {group.threads.length === 0 ? (
            <li className="px-2 pl-7 py-1 text-[11.5px] text-sidebar-foreground/50">
              No open threads
            </li>
          ) : null}
          <li>
            <button
              type="button"
              onClick={onNewThread}
              disabled={creating}
              className={cn(rowClass, "pl-7 text-sidebar-foreground/75 disabled:opacity-60")}
            >
              {creating ? (
                <LoaderCircle className="h-3.5 w-3.5 shrink-0 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
              )}
              <span className="truncate">New thread</span>
            </button>
          </li>
          <li>
            <OpenExistingThread
              projectPath={group.path}
              projects={projects}
              threads={threads}
              openIds={openIds}
              onPick={onPickThread}
            />
          </li>
        </ul>
      ) : null}
    </li>
  );
}

/**
 * Codex-style threads sidebar: a "New thread" entry, then a collapsible
 * Projects section listing every project. Exactly one project is expanded
 * (the active project); under it are the threads the user chose to keep open
 * in the sidebar, like tabs in a terminal.
 */
export function ThreadsSidebar({
  projects,
  threads,
  projectsLoading = false,
  nextProjectsUrl = null,
  loadingMoreProjects = false,
  loadMoreProjects,
  refresh,
}: ThreadsSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();
  const sidebar = useSidebarThreads();
  const { state } = sidebar;
  const [newThreadOpen, setNewThreadOpen] = useState(false);
  const [creatingIn, setCreatingIn] = useState<string | null>(null);

  const liveThreads = useMemo(
    () => new Map(threads.map((thread) => [thread.thread_id, thread])),
    [threads],
  );
  const openIds = useMemo(
    () => new Set(state.openThreads.map((entry) => entry.thread_id)),
    [state.openThreads],
  );
  const groups = useMemo(
    () => groupOpenThreads(state, projects),
    [state, projects],
  );
  const activePath = activeProjectPath(state, projects);
  const activeThreadId = threadIdFromPathname(location.pathname);

  // Renames and moves made elsewhere reach the stored rows through the
  // polled list; updateThread is a no-op when nothing differs.
  useEffect(() => {
    state.openThreads.forEach((entry) => {
      const live = liveThreads.get(entry.thread_id);
      if (!live) return;
      sidebar.updateThread(entry.thread_id, {
        name: threadDisplayName(live),
        directory: live.directory,
        origin_host: live.origin_host ?? null,
      });
    });
    // Only the polled list should trigger this pass.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveThreads]);

  const closeMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  const go = (path: string) => {
    navigate(path);
    closeMobile();
  };

  const startThread = async (directory: string) => {
    setCreatingIn(directory);
    try {
      const threadId = await createThread(directory);
      sidebar.openThread({
        thread_id: threadId,
        directory,
        name: "New thread",
      });
      refresh?.();
      go(`/dashboard/threads/${encodeURIComponent(threadId)}`);
    } catch (caught) {
      toast.error(
        caught instanceof Error ? caught.message : "Failed to create thread",
      );
    } finally {
      setCreatingIn(null);
    }
  };

  const pickThread = (thread: ThreadInfo) => {
    sidebar.openThread({
      thread_id: thread.thread_id,
      directory: thread.directory,
      name: threadDisplayName(thread),
      origin_host: thread.origin_host ?? null,
    });
    go(threadRoutePath(thread));
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-2 pt-2">
        <button
          type="button"
          onClick={() => setNewThreadOpen(true)}
          className={cn(rowClass, "font-medium")}
        >
          <SquarePen className="h-4 w-4 shrink-0" strokeWidth={1.8} />
          <span>New thread</span>
        </button>
        <NewThreadDialog open={newThreadOpen} onOpenChange={setNewThreadOpen} />
      </div>

      <div className="mt-2 flex min-h-0 flex-1 flex-col px-2">
        <div className="flex h-7 items-center gap-1 px-2">
          <button
            type="button"
            aria-expanded={state.projectsOpen}
            aria-label={
              state.projectsOpen ? "Collapse projects" : "Expand projects"
            }
            onClick={() => sidebar.setProjectsExpanded(!state.projectsOpen)}
            className="flex min-w-0 flex-1 items-center gap-1 rounded text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/70 hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            <span>Projects</span>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                state.projectsOpen ? "" : "-rotate-90",
              )}
            />
          </button>
          <button
            type="button"
            aria-label="All projects"
            title="All projects"
            onClick={() => go("/dashboard/projects")}
            className={iconButtonClass}
          >
            <FolderOpen className="h-3.5 w-3.5" />
          </button>
        </div>

        {state.projectsOpen ? (
          <div className="min-h-0 flex-1 overflow-y-auto pb-2">
            {projectsLoading && groups.length === 0 ? (
              <p className="flex items-center gap-2 px-2 py-2 text-[12px] text-sidebar-foreground/60">
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                Loading projects
              </p>
            ) : groups.length === 0 ? (
              <p className="px-2 py-2 text-[12px] text-sidebar-foreground/60">
                No projects yet.{" "}
                <button
                  type="button"
                  onClick={() => go("/dashboard/projects")}
                  className="underline-offset-2 hover:underline"
                >
                  Add one
                </button>
              </p>
            ) : (
              <ul className="space-y-px" aria-label="Projects">
                {groups.map((group) => (
                  <ProjectRow
                    key={group.path}
                    group={group}
                    active={group.path === activePath}
                    activeThreadId={activeThreadId}
                    liveThreads={liveThreads}
                    projects={projects}
                    threads={threads}
                    openIds={openIds}
                    creating={creatingIn === group.path}
                    onToggle={() => sidebar.toggleProject(projects, group.path)}
                    onOpenProject={() => go(projectTabTarget(group.path).path)}
                    onOpenThread={(entry) => {
                      const live = liveThreads.get(entry.thread_id);
                      go(
                        live
                          ? threadRoutePath(live)
                          : `/dashboard/threads/${encodeURIComponent(entry.thread_id)}`,
                      );
                    }}
                    onCloseThread={(entry) => sidebar.closeThread(entry.thread_id)}
                    onNewThread={() => void startThread(group.path)}
                    onPickThread={pickThread}
                  />
                ))}
              </ul>
            )}
            {nextProjectsUrl && loadMoreProjects ? (
              <button
                type="button"
                onClick={loadMoreProjects}
                disabled={loadingMoreProjects}
                className={cn(rowClass, "mt-1 text-sidebar-foreground/60")}
              >
                {loadingMoreProjects ? (
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                ) : null}
                Show more projects
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default ThreadsSidebar;
