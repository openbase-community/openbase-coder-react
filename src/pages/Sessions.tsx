import DashboardLayout from "@/components/layouts/ExampleLayout";
import { ThreadListItem } from "@/components/ThreadListItem";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api";
import { projectName } from "@/lib/project-display";
import { setThreadFavorite } from "@/lib/thread-favorites";
import { groupThreadsByDay, threadListDisplayNames } from "@/lib/thread-display";
import { useProjectsAndThreads } from "@/lib/useProjectsAndThreads";
import { Archive, FolderOpen, Plus, Terminal } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Sessions = () => {
  const navigate = useNavigate();
  const {
    projects,
    threads,
    nextThreadsUrl,
    nextProjectsUrl,
    loading,
    loadingMoreProjects,
    loadingMoreThreads,
    fetchData,
    loadMoreProjects,
    loadMoreThreads,
  } = useProjectsAndThreads();
  const [dialogOpen, setDialogOpen] = useState(false);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel || !nextThreadsUrl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadMoreThreads();
        }
      },
      { rootMargin: "240px 0px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMoreThreads, nextThreadsUrl]);

  const deleteThread = async (threadId: string) => {
    const res = await apiFetch(`/api/threads/${threadId}/`, {
      method: "DELETE",
    });
    if (res.ok) {
      void fetchData();
      toast.success("Thread archived");
    } else {
      toast.error("Failed to archive thread");
    }
  };

  const createThread = async (directory: string) => {
    const res = await apiFetch("/api/threads/", {
      method: "POST",
      body: JSON.stringify({ directory }),
    });
    if (res.ok) {
      const data = await res.json();
      setDialogOpen(false);
      navigate(`/dashboard/threads/${data.thread_id}`);
    } else {
      toast.error("Failed to create thread");
    }
  };

  const toggleThreadFavorite = async (threadId: string, isFavorite: boolean) => {
    try {
      await setThreadFavorite(threadId, isFavorite);
      void fetchData();
    } catch {
      toast.error("Failed to update favorite");
    }
  };

  const activeCount = threads.filter((t) => t.status === "running").length;
  const sortedThreads = [...threads].sort(
    (a, b) => +new Date(b.updated_at) - +new Date(a.updated_at),
  );
  const displayNames = threadListDisplayNames(sortedThreads);
  const threadGroups = useMemo(
    () => groupThreadsByDay(sortedThreads),
    [sortedThreads],
  );

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold tracking-tight text-foreground">
              Threads
            </h1>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {activeCount} active · {threads.length}
              {nextThreadsUrl ? "+" : ""} loaded
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-7 px-2.5 text-[12px]">
                <Plus className="h-3 w-3" />
                New thread
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-sm font-semibold">
                  Start a new thread
                </DialogTitle>
                <DialogDescription className="text-[12px]">
                  Pick a project to launch a coding session against.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-1 max-h-72 space-y-px overflow-y-auto">
                {projects.length === 0 ? (
                  <p className="py-6 text-center text-[12px] text-muted-foreground">
                    No recent projects
                  </p>
                ) : (
                  projects.map((project) => (
                    <button
                      key={project.path}
                      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition-colors hover:bg-surface-muted"
                      onClick={() => createThread(project.path)}
                    >
                      <FolderOpen className="h-3 w-3 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[12.5px] font-medium">
                          {projectName(project.path)}
                        </div>
                        <div className="truncate font-mono text-[11px] text-muted-foreground">
                          {project.path}
                        </div>
                      </div>
                    </button>
                  ))
                )}
                {nextProjectsUrl ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-1 h-7 w-full text-[12px]"
                    disabled={loadingMoreProjects}
                    onClick={() => void loadMoreProjects()}
                  >
                    {loadingMoreProjects ? "Loading..." : "Load more projects"}
                  </Button>
                ) : null}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-[12px] text-muted-foreground">Loading…</div>
        ) : threads.length === 0 ? (
          <div className="rounded border border-dashed border-border bg-surface px-4 py-6 text-center">
            <Terminal className="mx-auto h-4 w-4 text-muted-foreground/40" />
            <p className="mt-2 text-[12px] text-muted-foreground">
              No threads yet.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {threadGroups.map((group) => (
                <section key={group.key}>
                  <div className="mb-1.5 px-1 text-[11px] font-semibold uppercase text-muted-foreground">
                    {group.label}
                  </div>
                  <div className="overflow-hidden rounded border border-border bg-surface">
                    {group.threads.map((thread, idx) => {
                      const isDispatchThread = thread.voice_route?.role === "dispatcher";

                      return (
                        <ThreadListItem
                          key={thread.thread_id}
                          thread={thread}
                          displayName={displayNames.get(thread.thread_id)}
                          showTopBorder={idx > 0}
                          onClick={() =>
                            navigate(`/dashboard/threads/${thread.thread_id}`)
                          }
                          onToggleFavorite={(item) =>
                            void toggleThreadFavorite(
                              item.thread_id,
                              !item.is_favorite,
                            )
                          }
                          action={
                            isDispatchThread ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100 disabled:cursor-not-allowed"
                                disabled
                                title="Dispatch threads cannot be archived"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Archive className="h-3 w-3 text-muted-foreground" />
                              </Button>
                            ) : (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                                    title="Archive thread"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Archive className="h-3 w-3 text-muted-foreground" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Archive thread?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This hides the thread from active thread
                                      lists. If it is running, the current turn
                                      will be interrupted first.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() =>
                                        deleteThread(thread.thread_id)
                                      }
                                    >
                                      Archive
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )
                          }
                        />
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
            {nextThreadsUrl ? (
              <div
                ref={loadMoreSentinelRef}
                className="flex min-h-8 items-center justify-center text-[12px] text-muted-foreground"
              >
                {loadingMoreThreads ? "Loading..." : null}
              </div>
            ) : null}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Sessions;
