import DashboardLayout from "@/components/layouts/DashboardLayout";
import { NewThreadDialog } from "@/components/NewThreadDialog";
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
import { apiFetch } from "@/lib/api";
import { extractErrorMessage } from "@/lib/api-errors";
import { setThreadFavorite } from "@/lib/thread-favorites";
import {
  groupThreadsByDay,
  threadListDisplayNames,
  threadRoutePath,
} from "@/lib/thread-display";
import { useProjectsAndThreads } from "@/lib/useProjectsAndThreads";
import { AlertTriangle, Archive, Plus, Terminal } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Sessions = () => {
  const navigate = useNavigate();
  const {
    threads,
    nextThreadsUrl,
    error: listError,
    loading,
    loadingMoreThreads,
    fetchData,
    loadMoreThreads,
  } = useProjectsAndThreads();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [syncConflictCount, setSyncConflictCount] = useState<number | null>(null);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchSyncConflicts = async () => {
      // Deliberately silent: this only decorates the "Sync conflicts" button
      // with a count; the conflicts page itself surfaces load failures.
      try {
        const res = await apiFetch("/api/settings/thread-sync/conflicts/");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setSyncConflictCount(data.conflict_count ?? 0);
        }
      } catch {
        if (!cancelled) {
          setSyncConflictCount(null);
        }
      }
    };
    void fetchSyncConflicts();
    return () => {
      cancelled = true;
    };
  }, []);

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
    try {
      const res = await apiFetch(`/api/threads/${threadId}/`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error(
          await extractErrorMessage(res, "Failed to archive thread"),
        );
      }
      void fetchData();
      toast.success("Thread archived");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to archive thread");
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

          <div className="flex items-center gap-2">
            <Button
              variant={syncConflictCount ? "destructive" : "outline"}
              size="sm"
              className="h-7 px-2.5 text-[12px]"
              onClick={() => navigate("/dashboard/threads/sync-conflicts")}
            >
              <AlertTriangle className="h-3 w-3" />
              Sync conflicts
              {syncConflictCount ? ` · ${syncConflictCount}` : ""}
            </Button>
            <NewThreadDialog
              onOpenChange={setDialogOpen}
              open={dialogOpen}
              trigger={
                <Button size="sm" className="h-7 px-2.5 text-[12px]">
                  <Plus className="h-3 w-3" />
                  New thread
                </Button>
              }
            />
          </div>
        </div>

        {listError ? (
          <div className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
            {listError} — retrying automatically.
          </div>
        ) : null}

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
                          onClick={() => navigate(threadRoutePath(thread))}
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
