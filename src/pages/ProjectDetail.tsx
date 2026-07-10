import DashboardLayout from "@/components/layouts/DashboardLayout";
import {
  ReportFileDetailView,
  ReportFileListRow,
} from "@/components/reports/ReportFileRow";
import { StatusBadge } from "@/components/StatusBadge";
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
import { extractErrorMessage, readJson } from "@/lib/api-errors";
import { setReportTags } from "@/lib/item-tags";
import { GIT_STATUS, projectName } from "@/lib/project-display";
import { groupReportItems } from "@/lib/reportGroups";
import { formatReportBytes, formatReportDate } from "@/lib/reportFormatting";
import { setThreadFavorite } from "@/lib/thread-favorites";
import {
  groupThreadsByDay,
  shouldDeemphasizeThread,
  threadRoutePath,
  threadVoiceLabel,
} from "@/lib/thread-display";
import { useReportBrowser } from "@/lib/useReportBrowser";
import type { ReportFileTarget } from "@/lib/useReportFileActions";
import { useTagOptions } from "@/lib/useTagOptions";
import { useProjectsAndThreads } from "@/lib/useProjectsAndThreads";
import { cn } from "@/lib/utils";
import type { ReportsFile, ThreadInfo } from "@/types/session";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Folder,
  GitBranch,
  Plus,
  Star,
  Terminal,
  Trash2,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

const ProjectDetail = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectPath = searchParams.get("path") || "";
  const {
    projects,
    threads,
    nextThreadsUrl,
    error: listError,
    loading,
    loadingMoreThreads,
    fetchThreads,
    loadMoreThreads,
  } = useProjectsAndThreads();
  const [reportsFiles, setReportsFiles] = useState<ReportsFile[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [removingProject, setRemovingProject] = useState(false);
  const threadsRef = useRef<HTMLDivElement | null>(null);
  const { tagOptions, refreshTagOptions } = useTagOptions();

  const getReportKey = useCallback((file: ReportsFile) => file.path, []);
  const getReportTarget = useCallback(
    (file: ReportsFile): ReportFileTarget => ({
      key: file.path,
      projectPath,
      file,
    }),
    [projectPath],
  );
  const applyReportParams = useCallback(
    (params: URLSearchParams, file: ReportsFile) => {
      params.set("path", projectPath);
      params.set("report", file.path);
    },
    [projectPath],
  );
  const clearReportParams = useCallback(
    (params: URLSearchParams) => {
      params.set("path", projectPath);
      params.delete("report");
    },
    [projectPath],
  );
  const isReportRequested = useCallback(
    (params: URLSearchParams) => Boolean(params.get("report")),
    [],
  );
  const findRequestedReport = useCallback(
    (params: URLSearchParams) => {
      const reportPath = params.get("report");
      return (
        reportsFiles.find((candidate) => candidate.path === reportPath) ?? null
      );
    },
    [reportsFiles],
  );
  const handleReportDeleted = useCallback(({ key }: ReportFileTarget) => {
    setReportsFiles((current) =>
      current.filter((currentFile) => currentFile.path !== key),
    );
  }, []);

  const {
    payloads: reportsPayloads,
    fileLoadingKey: reportsFileLoadingKey,
    deletingKey: deletingReportKey,
    downloadingKey: downloadingReportKey,
    savingKey: savingReportKey,
    actioningKey: actioningReportKey,
    followUpSendingKey: followUpSendingReportKey,
    saveReportFile,
    sendReportFollowUp,
    setPayloads: setReportsPayloads,
    activeKey: activeReportKey,
    setActiveKey: setActiveReportKey,
    activeItem: activeReportFile,
    hasPrevious: hasPreviousReport,
    hasNext: hasNextReport,
    expandedGroups: expandedReportGroups,
    toggleGroup: toggleReportGroup,
    getScrollTop: getReportScrollTop,
    setScrollTop: setReportScrollTop,
    openItem: openReport,
    closeItem: closeReport,
    openAdjacentItem: openAdjacentReport,
    deleteItem: deleteReportFile,
    downloadItem: downloadReport,
    deleteActiveItem: deleteActiveReportFile,
    startItemAction: startReportActionTurn,
  } = useReportBrowser<ReportsFile>({
    items: reportsFiles,
    getKey: getReportKey,
    getTarget: getReportTarget,
    pathname: "/dashboard/project",
    applyItemParams: applyReportParams,
    clearItemParams: clearReportParams,
    isItemRequested: isReportRequested,
    findRequestedItem: findRequestedReport,
    loadErrorMessage: "Unable to load this file. The local API may need to restart.",
    onItemDeleted: handleReportDeleted,
  });

  const project = useMemo(
    () => projects.find((item) => item.path === projectPath) ?? null,
    [projectPath, projects],
  );
  const projectThreads = useMemo(
    () =>
      threads
        .filter((thread) => thread.directory === projectPath)
        .sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at)),
    [projectPath, threads],
  );
  const projectThreadGroups = useMemo(
    () => groupThreadsByDay(projectThreads),
    [projectThreads],
  );
  const activeThreads = projectThreads.filter(
    (thread) => thread.status === "running",
  );
  const gitStatus = GIT_STATUS[project?.git_status ?? "unknown"];
  const groupedReportsFiles = useMemo(
    () => groupReportItems(reportsFiles, (file) => file),
    [reportsFiles],
  );

  const saveReportContent = useCallback(
    async (file: ReportsFile, content: string) => {
      const payload = await saveReportFile(
        { key: file.path, projectPath, file },
        content,
      );
      if (payload?.file) {
        setReportsFiles((current) =>
          current.map((currentFile) =>
            currentFile.path === file.path ? payload.file : currentFile,
          ),
        );
      }
      return payload;
    },
    [projectPath, saveReportFile],
  );

  const updateReportTags = useCallback(
    async (file: ReportsFile, tags: string[]) => {
      try {
        const payload = await setReportTags(projectPath, file.path, tags);
        setReportsFiles((current) =>
          current.map((currentFile) =>
            currentFile.path === file.path
              ? { ...currentFile, tags: payload.tags }
              : currentFile,
          ),
        );
        setReportsPayloads((current) => {
          const existing = current[file.path];
          if (!existing) return current;
          return {
            ...current,
            [file.path]: {
              ...existing,
              file: { ...existing.file, tags: payload.tags },
            },
          };
        });
        void refreshTagOptions();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update tags");
      }
    },
    [projectPath, refreshTagOptions, setReportsPayloads],
  );

  const fetchReports = useCallback(async () => {
    if (!projectPath) return;
    setReportsLoading(true);
    try {
      const params = new URLSearchParams({ path: projectPath });
      const res = await apiFetch(`/api/projects/reports/?${params}`);
      if (!res.ok) {
        throw new Error(
          await extractErrorMessage(res, "Failed to load reports"),
        );
      }
      const data = await readJson(res);
      if (!data) {
        throw new Error("Failed to load reports");
      }
      const files = [...(data.files ?? [])].sort(
        (a, b) => b.updated_at - a.updated_at,
      );
      setReportsFiles(files);
      setReportsError(null);
      if (
        activeReportKey &&
        !files.some((file) => file.path === activeReportKey)
      ) {
        setActiveReportKey(null);
      }
    } catch (err) {
      setReportsFiles([]);
      setReportsPayloads({});
      setActiveReportKey(null);
      setReportsError(
        err instanceof Error ? err.message : "Unable to reach the local API.",
      );
    }
    setReportsLoading(false);
  }, [activeReportKey, projectPath]);

  useEffect(() => {
    void fetchReports();
  }, [fetchReports]);

  const createThread = async () => {
    try {
      const res = await apiFetch("/api/threads/", {
        method: "POST",
        body: JSON.stringify({ directory: projectPath }),
      });
      if (!res.ok) {
        throw new Error(
          await extractErrorMessage(res, "Failed to create thread"),
        );
      }
      const data = await res.json();
      navigate(`/dashboard/threads/${data.thread_id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create thread");
    }
  };

  const toggleThreadFavorite = async (thread: ThreadInfo) => {
    try {
      await setThreadFavorite(thread.thread_id, !thread.is_favorite);
      await fetchThreads();
    } catch {
      toast.error("Failed to update favorite");
    }
  };

  const removeProject = async () => {
    setRemovingProject(true);
    try {
      const res = await apiFetch("/api/projects/recent/", {
        method: "DELETE",
        body: JSON.stringify({ path: projectPath }),
      });
      if (!res.ok) {
        throw new Error(
          await extractErrorMessage(res, "Failed to stop tracking project"),
        );
      }
      toast.success("Project removed from recent projects");
      navigate("/dashboard/projects");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to stop tracking project",
      );
    }
    setRemovingProject(false);
  };

  const goToDiff = () =>
    navigate(`/dashboard/diff?path=${encodeURIComponent(projectPath)}`);
  const goToSkills = () =>
    navigate(`/dashboard/skills?path=${encodeURIComponent(projectPath)}`);
  const scrollToThreads = () =>
    threadsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  if (!projectPath) {
    return (
      <DashboardLayout>
        <div className="text-[12px] text-muted-foreground">
          No project selected.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={() => navigate("/dashboard/projects")}
            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold tracking-tight text-foreground">
              {projectName(projectPath)}
            </h1>
            <p className="truncate font-mono text-[11px] text-muted-foreground">
              {projectPath}
            </p>
          </div>
        </div>

        {listError ? (
          <div className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
            {listError} — retrying automatically.
          </div>
        ) : null}

        <div className="grid gap-2 md:grid-cols-2">
          <div className="rounded border border-border bg-surface px-3 py-2">
            <div className="text-[11px] text-muted-foreground">Git</div>
            <div className={`mt-1 flex items-center gap-2 text-[12px] ${gitStatus.text}`}>
              <span className={`h-2 w-2 rounded-full ${gitStatus.dot}`} />
              {gitStatus.label}
            </div>
          </div>
          <button
            type="button"
            onClick={scrollToThreads}
            className="rounded border border-border bg-surface px-3 py-2 text-left transition-colors hover:bg-surface-muted"
          >
            <div className="text-[11px] text-muted-foreground">Threads</div>
            <div className="mt-1 text-[12px] text-foreground">
              {projectThreads.length} total · {activeThreads.length} active
            </div>
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" className="h-7 px-2.5 text-[12px]" onClick={goToDiff}>
            <GitBranch className="h-3 w-3" />
            Diff
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2.5 text-[12px]"
            onClick={goToSkills}
          >
            <Zap className="h-3 w-3" />
            Skills
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2.5 text-[12px]"
            onClick={createThread}
          >
            <Plus className="h-3 w-3" />
            New thread
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2.5 text-[12px] text-destructive hover:text-destructive"
                disabled={removingProject}
              >
                <Trash2 className="h-3 w-3" />
                Stop tracking
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Stop tracking this project?</AlertDialogTitle>
                <AlertDialogDescription>
                  This only removes the project from the recent projects list. It will not delete the folder, repository, files, threads, reports, or user data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction asChild>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={removingProject}
                    onClick={() => {
                      void removeProject();
                    }}
                  >
                    Stop tracking
                  </Button>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <div
          className="overflow-hidden rounded border border-border bg-surface"
        >
          <div className="border-b border-border px-3 py-2 text-[13px] font-medium text-foreground">
            Reports
          </div>
          {reportsLoading ? (
            <div className="px-3 py-6 text-[12px] text-muted-foreground">
              Loading reports…
            </div>
          ) : reportsError ? (
            <div className="flex items-center justify-between gap-3 px-3 py-3 text-[12px] text-destructive">
              <span className="min-w-0">{reportsError}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-6 shrink-0 px-2 text-[11px]"
                onClick={() => void fetchReports()}
              >
                Retry
              </Button>
            </div>
          ) : reportsFiles.length === 0 ? (
            <div className="px-3 py-6 text-[12px] text-muted-foreground">
              No report files found.
            </div>
          ) : (
            <div>
              {groupedReportsFiles.map((node, index) => {
                if (node.type === "group") {
                  const groupKey = `group:${node.key}`;
                  const groupExpanded = expandedReportGroups.has(groupKey);
                  return (
                    <div
                      key={groupKey}
                      className={index > 0 ? "border-t border-border" : ""}
                    >
                      <button
                        type="button"
                        onClick={() => toggleReportGroup(groupKey)}
                        className="flex w-full min-w-0 items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-surface-muted"
                      >
                        {groupExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        )}
                        <Folder className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-baseline gap-2">
                            <span className="truncate text-[13px] font-medium text-foreground">
                              {node.name}
                            </span>
                            <span className="shrink-0 text-[11px] text-muted-foreground">
                              {node.items.length} files
                            </span>
                          </div>
                          <div className="truncate font-mono text-[10.5px] text-muted-foreground/75">
                            {formatReportDate(node.updated_at)} ·{" "}
                            {formatReportBytes(node.size)} ·{" "}
                            {node.path}/
                          </div>
                        </div>
                      </button>

                      {groupExpanded ? (
                        <div className="border-t border-border bg-background/70">
                          {node.items.map((file) => {
                            const expanded = activeReportKey === file.path;
                            const payload = reportsPayloads[file.path];
                            return (
                              <ReportFileListRow
                                key={file.path}
                                file={file}
                                active={expanded}
                                payload={payload}
                                className="border-t border-border first:border-t-0"
                                rowClassName="pl-8 pr-3"
                                metadata={
                                  <>
                                    {formatReportDate(file.updated_at)} ·{" "}
                                    {formatReportBytes(file.size)} · {file.path}
                                  </>
                                }
                                onOpen={() => openReport(file)}
                                onDownload={() => void downloadReport(file)}
                                onDelete={() => void deleteReportFile(file)}
                                onTagsChange={(tags) =>
                                  updateReportTags(file, tags)
                                }
                                tagOptions={tagOptions}
                                downloading={downloadingReportKey === file.path}
                                deleting={deletingReportKey === file.path}
                              />
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                }

                const file = node.item;
                const expanded = activeReportKey === file.path;
                const payload = reportsPayloads[file.path];
                return (
                  <ReportFileListRow
                    key={file.path}
                    file={file}
                    active={expanded}
                    payload={payload}
                    className={index > 0 ? "border-t border-border" : ""}
                    metadata={
                      <>
                        {formatReportDate(file.updated_at)} ·{" "}
                        {formatReportBytes(file.size)} · {file.path}
                      </>
                    }
                    onOpen={() => openReport(file)}
                    onDownload={() => void downloadReport(file)}
                    onDelete={() => void deleteReportFile(file)}
                    onTagsChange={(tags) => updateReportTags(file, tags)}
                    tagOptions={tagOptions}
                    downloading={downloadingReportKey === file.path}
                    deleting={deletingReportKey === file.path}
                  />
                );
              })}
            </div>
          )}
        </div>

        {activeReportFile ? (
          <ReportFileDetailView
            file={activeReportFile}
            loading={reportsFileLoadingKey === activeReportFile.path}
            payload={reportsPayloads[activeReportFile.path]}
            metadata={
              <>
                {formatReportDate(activeReportFile.updated_at)} ·{" "}
                {formatReportBytes(activeReportFile.size)} · {activeReportFile.path}
              </>
            }
            detailHeader={
              <button
                type="button"
                className="inline-flex max-w-full items-center gap-1.5 rounded border border-border px-2.5 py-1.5 text-[12px] text-foreground hover:bg-surface-muted"
                onClick={() => {
                  closeReport();
                  threadsRef.current?.scrollIntoView({ block: "start" });
                }}
              >
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 truncate font-mono">
                  {projectPath}
                </span>
              </button>
            }
            onClose={closeReport}
            onPrevious={() => openAdjacentReport(-1)}
            onNext={() => openAdjacentReport(1)}
            hasPrevious={hasPreviousReport}
            hasNext={hasNextReport}
            onStartAction={() => void startReportActionTurn(activeReportFile)}
            onOpenThread={
              reportsPayloads[activeReportFile.path]?.provenance?.thread_id
                ? () => {
                    closeReport();
                    navigate(
                      `/dashboard/threads/${encodeURIComponent(
                        reportsPayloads[activeReportFile.path]!.provenance!.thread_id!,
                      )}`,
                    );
                  }
                : undefined
            }
            onSendFollowUp={
              reportsPayloads[activeReportFile.path]?.provenance?.thread_id
                ? (message) =>
                    sendReportFollowUp(
                      {
                        key: activeReportFile.path,
                        projectPath,
                        file: activeReportFile,
                      },
                      reportsPayloads[activeReportFile.path]!.provenance!.thread_id!,
                      message,
                    )
                : undefined
            }
            onDownload={() => void downloadReport(activeReportFile)}
            onDelete={() => void deleteActiveReportFile(activeReportFile)}
            onSaveContent={(content) =>
              saveReportContent(activeReportFile, content)
            }
            onTagsChange={(tags) => updateReportTags(activeReportFile, tags)}
            tagOptions={tagOptions}
            actioning={actioningReportKey === activeReportFile.path}
            followUpSending={followUpSendingReportKey === activeReportFile.path}
            downloading={downloadingReportKey === activeReportFile.path}
            deleting={deletingReportKey === activeReportFile.path}
            saving={savingReportKey === activeReportFile.path}
            scrollTop={getReportScrollTop(activeReportFile.path)}
            onScrollTopChange={(scrollTop) =>
              setReportScrollTop(activeReportFile.path, scrollTop)
            }
          />
        ) : null}

        <div
          ref={threadsRef}
          className="overflow-hidden rounded border border-border bg-surface"
        >
          <div className="border-b border-border px-3 py-2 text-[13px] font-medium text-foreground">
            Threads
          </div>
          {loading ? (
            <div className="px-3 py-6 text-[12px] text-muted-foreground">
              Loading threads…
            </div>
          ) : projectThreads.length === 0 ? (
            <div className="px-3 py-6 text-center text-[12px] text-muted-foreground">
              <div>No threads for this project in the loaded results.</div>
              {nextThreadsUrl ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 h-7 px-2.5 text-[12px]"
                  disabled={loadingMoreThreads}
                  onClick={() => void loadMoreThreads()}
                >
                  {loadingMoreThreads ? "Loading..." : "Load more threads"}
                </Button>
              ) : null}
            </div>
          ) : (
            <div>
              {projectThreadGroups.map((group, groupIndex) => (
                <section
                  key={group.key}
                  className={groupIndex > 0 ? "border-t border-border" : ""}
                >
                  <div className="bg-surface-muted/50 px-3 py-1.5 text-[11px] font-semibold uppercase text-muted-foreground">
                    {group.label}
                  </div>
                  {group.threads.map((thread, idx) => {
                    const isDeemphasized = shouldDeemphasizeThread(thread);

                    return (
                      <div
                        key={thread.thread_id}
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          navigate(
                            threadRoutePath(thread, { fromProject: projectPath }),
                          )
                        }
                        onKeyDown={(event) => {
                          if (event.key !== "Enter" && event.key !== " ") {
                            return;
                          }
                          event.preventDefault();
                          navigate(
                            threadRoutePath(thread, { fromProject: projectPath }),
                          );
                        }}
                        className={cn(
                          "group flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-surface-muted",
                          isDeemphasized &&
                            "opacity-60 saturate-0 hover:opacity-80",
                          idx > 0 && "border-t border-border",
                        )}
                      >
                        <Terminal className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <button
                          type="button"
                          className={cn(
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-surface hover:text-foreground",
                            thread.is_favorite && "text-warning hover:text-warning",
                          )}
                          title={
                            thread.is_favorite
                              ? "Remove favorite"
                              : "Favorite thread"
                          }
                          aria-label={
                            thread.is_favorite
                              ? "Remove favorite"
                              : "Favorite thread"
                          }
                          onClick={(event) => {
                            event.stopPropagation();
                            void toggleThreadFavorite(thread);
                          }}
                        >
                          <Star
                            className={cn(
                              "h-3 w-3",
                              thread.is_favorite && "fill-current",
                            )}
                          />
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <StatusBadge
                              status={thread.status}
                              isLikelyStale={thread.is_likely_stale}
                              statusWarning={thread.status_warning}
                            />
                            {thread.voice_route?.role === "active_target" ? (
                              <span className="font-mono text-[10px] text-warning">
                                {threadVoiceLabel(thread)}
                              </span>
                            ) : thread.voice_route?.role === "dispatcher" ? (
                              <span className="font-mono text-[10px] text-warning">
                                dispatch
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-1 truncate font-mono text-[10.5px] text-muted-foreground">
                            {new Date(thread.updated_at).toLocaleString()}
                          </div>
                        </div>
                        <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-foreground" />
                      </div>
                    );
                  })}
                </section>
              ))}
              {nextThreadsUrl ? (
                <div className="border-t border-border px-3 py-2 text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2.5 text-[12px]"
                    disabled={loadingMoreThreads}
                    onClick={() => void loadMoreThreads()}
                  >
                    {loadingMoreThreads ? "Loading..." : "Load more threads"}
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ProjectDetail;
