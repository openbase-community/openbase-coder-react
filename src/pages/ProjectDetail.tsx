import DashboardLayout from "@/components/layouts/ExampleLayout";
import { ReportFileRow } from "@/components/reports/ReportFileRow";
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
import { readJson } from "@/lib/api-errors";
import { GIT_STATUS, projectName } from "@/lib/project-display";
import { groupReportItems } from "@/lib/reportGroups";
import { formatReportBytes, formatReportDate } from "@/lib/reportFormatting";
import {
  groupThreadsByDay,
  shouldDeemphasizeThread,
  threadVoiceLabel,
} from "@/lib/thread-display";
import { useReportFileActions } from "@/lib/useReportFileActions";
import { useProjectsAndThreads } from "@/lib/useProjectsAndThreads";
import { cn } from "@/lib/utils";
import type { ReportsFile } from "@/types/session";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Folder,
  GitBranch,
  Plus,
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
    loading,
    loadingMoreThreads,
    loadMoreThreads,
  } = useProjectsAndThreads();
  const [reportsFiles, setReportsFiles] = useState<ReportsFile[]>([]);
  const [expandedReportKey, setExpandedReportKey] = useState<string | null>(
    null,
  );
  const [expandedReportGroups, setExpandedReportGroups] = useState<Set<string>>(
    () => new Set(),
  );
  const [reportsLoading, setReportsLoading] = useState(false);
  const [removingProject, setRemovingProject] = useState(false);
  const threadsRef = useRef<HTMLDivElement | null>(null);
  const {
    payloads: reportsPayloads,
    fileLoadingKey: reportsFileLoadingKey,
    deletingKey: deletingReportKey,
    downloadingKey: downloadingReportKey,
    loadReportFile,
    deleteReport: deleteReportAction,
    downloadReport: downloadReportAction,
    setPayloads: setReportsPayloads,
  } = useReportFileActions({
    loadErrorMessage: "Unable to load this file. The local API may need to restart.",
    onDeleted: ({ key }) => {
      setReportsFiles((current) =>
        current.filter((currentFile) => currentFile.path !== key),
      );
      if (expandedReportKey === key) {
        setExpandedReportKey(null);
      }
    },
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

  const loadReportsFile = useCallback(
    async (file: ReportsFile) => {
      setExpandedReportKey(file.path);
      await loadReportFile({ key: file.path, projectPath, file });
    },
    [loadReportFile, projectPath],
  );

  const toggleReport = (file: ReportsFile) => {
    if (expandedReportKey === file.path) {
      setExpandedReportKey(null);
      return;
    }
    loadReportsFile(file);
  };

  const toggleReportGroup = (key: string) => {
    setExpandedReportGroups((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const deleteReportFile = useCallback(
    async (file: ReportsFile) => {
      await deleteReportAction({ key: file.path, projectPath, file });
    },
    [deleteReportAction, projectPath],
  );

  const downloadReport = useCallback(
    async (file: ReportsFile) => {
      await downloadReportAction({ key: file.path, projectPath, file });
    },
    [downloadReportAction, projectPath],
  );

  const fetchReports = useCallback(async () => {
    if (!projectPath) return;
    setReportsLoading(true);
    const params = new URLSearchParams({ path: projectPath });
    const res = await apiFetch(`/api/projects/reports/?${params}`);
    setReportsLoading(false);
    const data = await readJson(res);
    if (!res.ok || !data) {
      setReportsFiles([]);
      setReportsPayloads({});
      setExpandedReportKey(null);
      return;
    }
    const files = [...(data.files ?? [])].sort(
      (a, b) => b.updated_at - a.updated_at,
    );
    setReportsFiles(files);
    if (
      expandedReportKey &&
      !files.some((file) => file.path === expandedReportKey)
    ) {
      setExpandedReportKey(null);
    }
  }, [expandedReportKey, projectPath]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const createThread = async () => {
    const res = await apiFetch("/api/threads/", {
      method: "POST",
      body: JSON.stringify({ directory: projectPath }),
    });
    if (res.ok) {
      const data = await res.json();
      navigate(`/dashboard/threads/${data.thread_id}`);
    } else {
      toast.error("Failed to create thread");
    }
  };

  const removeProject = async () => {
    setRemovingProject(true);
    const res = await apiFetch("/api/projects/recent/", {
      method: "DELETE",
      body: JSON.stringify({ path: projectPath }),
    });
    const data = await readJson(res);
    setRemovingProject(false);

    if (!res.ok) {
      toast.error(data?.error || "Failed to stop tracking project");
      return;
    }

    toast.success("Project removed from recent projects");
    navigate("/dashboard/projects");
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
                            const expanded = expandedReportKey === file.path;
                            const payload = reportsPayloads[file.path];
                            return (
                              <ReportFileRow
                                key={file.path}
                                file={file}
                                expanded={expanded}
                                loading={reportsFileLoadingKey === file.path}
                                payload={payload}
                                className="border-t border-border first:border-t-0"
                                rowClassName="pl-8 pr-3"
                                metadata={
                                  <>
                                    {formatReportDate(file.updated_at)} ·{" "}
                                    {formatReportBytes(file.size)} · {file.path}
                                  </>
                                }
                                loadingLabel="Loading file..."
                                onToggle={() => toggleReport(file)}
                                onDownload={() => void downloadReport(file)}
                                onDelete={() => void deleteReportFile(file)}
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
                const expanded = expandedReportKey === file.path;
                const payload = reportsPayloads[file.path];
                return (
                  <ReportFileRow
                    key={file.path}
                    file={file}
                    expanded={expanded}
                    loading={reportsFileLoadingKey === file.path}
                    payload={payload}
                    className={index > 0 ? "border-t border-border" : ""}
                    metadata={
                      <>
                        {formatReportDate(file.updated_at)} ·{" "}
                        {formatReportBytes(file.size)} · {file.path}
                      </>
                    }
                    loadingLabel="Loading file..."
                    onToggle={() => toggleReport(file)}
                    onDownload={() => void downloadReport(file)}
                    onDelete={() => void deleteReportFile(file)}
                    downloading={downloadingReportKey === file.path}
                    deleting={deletingReportKey === file.path}
                  />
                );
              })}
            </div>
          )}
        </div>

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
                      <button
                        key={thread.thread_id}
                        type="button"
                        onClick={() =>
                          navigate(
                            `/dashboard/threads/${thread.thread_id}?fromProject=${encodeURIComponent(projectPath)}`,
                          )
                        }
                        className={cn(
                          "group flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-surface-muted",
                          isDeemphasized &&
                            "opacity-60 saturate-0 hover:opacity-80",
                          idx > 0 && "border-t border-border",
                        )}
                      >
                        <Terminal className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <StatusBadge status={thread.status} />
                            {thread.is_livekit_active_target ? (
                              <span className="font-mono text-[10px] text-warning">
                                {threadVoiceLabel(thread)}
                              </span>
                            ) : thread.is_livekit_dispatcher ? (
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
                      </button>
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
