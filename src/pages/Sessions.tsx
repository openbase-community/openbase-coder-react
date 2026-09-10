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
import { Checkbox } from "@/components/ui/checkbox";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTagOptions } from "@/hooks/useTagOptions";
import { apiFetch } from "@/lib/api";
import { extractErrorMessage } from "@/lib/api-errors";
import { setThreadTags } from "@/lib/item-tags";
import { filterThreads } from "@/lib/thread-filters";
import { setThreadFavorite } from "@/lib/thread-favorites";
import {
  groupThreadsByDay,
  threadListDisplayNames,
  threadRoutePath,
} from "@/lib/thread-display";
import { useProjectsAndThreads } from "@/hooks/useProjectsAndThreads";
import {
  AlertTriangle,
  Archive,
  Plus,
  Search,
  Tag,
  Terminal,
  X,
} from "lucide-react";
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
  const { tagOptions, refreshTagOptions } = useTagOptions();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [syncConflictCount, setSyncConflictCount] = useState<number | null>(null);
  const [threadSearch, setThreadSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
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

  const updateThreadTags = async (threadId: string, tags: string[]) => {
    try {
      await setThreadTags(threadId, tags);
      void refreshTagOptions();
      void fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update tags");
    }
  };

  const sortedThreads = useMemo(
    () =>
      [...threads].sort(
        (a, b) => +new Date(b.updated_at) - +new Date(a.updated_at),
      ),
    [threads],
  );
  const displayNames = useMemo(
    () => threadListDisplayNames(sortedThreads),
    [sortedThreads],
  );
  const filteredThreads = useMemo(
    () =>
      filterThreads(
        sortedThreads,
        { search: threadSearch, tags: selectedTags },
        displayNames,
      ),
    [displayNames, selectedTags, sortedThreads, threadSearch],
  );
  const activeCount = filteredThreads.filter(
    (t) => t.status === "running",
  ).length;
  const threadGroups = useMemo(
    () => groupThreadsByDay(filteredThreads),
    [filteredThreads],
  );
  const availableTags = useMemo(() => {
    const labels = new Map<string, string>();
    const remember = (label: string) => {
      const trimmed = label.trim();
      if (trimmed) labels.set(trimmed.toLowerCase(), trimmed);
    };
    tagOptions.forEach((option) => remember(option.label));
    threads.forEach((thread) => (thread.tags ?? []).forEach(remember));
    return Array.from(labels.values()).sort((a, b) => a.localeCompare(b));
  }, [tagOptions, threads]);
  const filtersActive = Boolean(threadSearch.trim() || selectedTags.length > 0);
  const toggleSelectedTag = (tag: string) => {
    const key = tag.toLowerCase();
    setSelectedTags((current) =>
      current.some((item) => item.toLowerCase() === key)
        ? current.filter((item) => item.toLowerCase() !== key)
        : [...current, tag],
    );
  };
  const clearFilters = () => {
    setThreadSearch("");
    setSelectedTags([]);
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold tracking-tight text-foreground">
              Threads
            </h1>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {activeCount} active · {filteredThreads.length}
              {filtersActive ? ` of ${threads.length}` : ""}
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

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={threadSearch}
              onChange={(event) => setThreadSearch(event.target.value)}
              placeholder="Search threads"
              className="h-8 pl-8 text-[12px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={selectedTags.length ? "secondary" : "outline"}
                  size="sm"
                  className="h-8 px-2.5 text-[12px]"
                >
                  <Tag className="h-3.5 w-3.5" />
                  {selectedTags.length
                    ? `Tags · ${selectedTags.length}`
                    : "Tags"}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 p-2">
                <div className="max-h-56 space-y-1 overflow-y-auto">
                  {availableTags.length === 0 ? (
                    <div className="px-2 py-2 text-[12px] text-muted-foreground">
                      No tags
                    </div>
                  ) : (
                    availableTags.map((tag) => {
                      const checked = selectedTags.some(
                        (item) => item.toLowerCase() === tag.toLowerCase(),
                      );
                      return (
                        <label
                          key={tag}
                          className="flex min-w-0 cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[12px] hover:bg-surface-muted"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleSelectedTag(tag)}
                          />
                          <span className="min-w-0 truncate">{tag}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </PopoverContent>
            </Popover>
            {filtersActive ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-[12px]"
                onClick={clearFilters}
              >
                <X className="h-3.5 w-3.5" />
                Clear
              </Button>
            ) : null}
          </div>
        </div>

        {listError ? (
          <ErrorBanner>
            {listError} — retrying automatically.
          </ErrorBanner>
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
        ) : filteredThreads.length === 0 ? (
          <div className="rounded border border-dashed border-border bg-surface px-4 py-6 text-center">
            <Search className="mx-auto h-4 w-4 text-muted-foreground/40" />
            <p className="mt-2 text-[12px] text-muted-foreground">
              No matching threads.
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
                  <Panel>
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
                          tagOptions={tagOptions}
                          onTagsChange={(item, tags) =>
                            updateThreadTags(item.thread_id, tags)
                          }
                          action={
                            isDispatchThread ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100 disabled:cursor-not-allowed"
                                disabled
                                title="Dispatcher threads cannot be archived"
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
                  </Panel>
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
