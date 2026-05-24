import DashboardLayout from "@/components/layouts/ExampleLayout";
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
import { groupReportItems } from "@/lib/reportGroups";
import { shouldDeemphasizeThread, threadVoiceLabel } from "@/lib/thread-display";
import { cn } from "@/lib/utils";
import type {
  ReportsFile,
  GitStatus,
  Project,
  ThreadInfo,
} from "@/types/session";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  Folder,
  GitBranch,
  ImageIcon,
  Plus,
  Terminal,
  Trash2,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useNavigate, useSearchParams } from "react-router-dom";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";

type GitStyle = { dot: string; label: string; text: string };

type ReportsPayload = {
  file: ReportsFile;
  content?: string;
  data_url?: string;
  error?: string;
};

const GIT_STATUS: Record<GitStatus, GitStyle> = {
  clean: { dot: "bg-success", label: "clean", text: "text-success" },
  dirty: { dot: "bg-warning", label: "dirty", text: "text-warning" },
  unpushed: { dot: "bg-info", label: "unpushed", text: "text-info" },
  no_git: {
    dot: "bg-muted-foreground/40",
    label: "no git",
    text: "text-muted-foreground",
  },
};

const formatBytes = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (timestamp: number) =>
  new Date(timestamp * 1000).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const readJson = async (res: Response) => {
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return null;
  return res.json();
};

const projectName = (path: string) => path.split("/").pop() || path;

const ProjectDetail = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectPath = searchParams.get("path") || "";
  const [projects, setProjects] = useState<Project[]>([]);
  const [threads, setThreads] = useState<ThreadInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportsFiles, setReportsFiles] = useState<ReportsFile[]>([]);
  const [expandedReportKey, setExpandedReportKey] = useState<string | null>(
    null,
  );
  const [expandedReportGroups, setExpandedReportGroups] = useState<Set<string>>(
    () => new Set(),
  );
  const [reportsPayloads, setReportsPayloads] = useState<
    Record<string, ReportsPayload>
  >({});
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsFileLoadingKey, setReportsFileLoadingKey] = useState<
    string | null
  >(null);
  const [deletingReportKey, setDeletingReportKey] = useState<string | null>(
    null,
  );
  const [downloadingReportKey, setDownloadingReportKey] = useState<string | null>(
    null,
  );
  const [removingProject, setRemovingProject] = useState(false);
  const threadsRef = useRef<HTMLDivElement | null>(null);

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
  const activeThreads = projectThreads.filter(
    (thread) => thread.status === "running",
  );
  const gitStatus = GIT_STATUS[project?.git_status ?? "clean"];
  const groupedReportsFiles = useMemo(
    () => groupReportItems(reportsFiles, (file) => file),
    [reportsFiles],
  );

  const loadReportsFile = useCallback(
    async (file: ReportsFile) => {
      setExpandedReportKey(file.path);
      if (reportsPayloads[file.path]) return;

      setReportsFileLoadingKey(file.path);
      const params = new URLSearchParams({
        path: projectPath,
        file: file.path,
      });
      const res = await apiFetch(`/api/projects/reports/file/?${params}`);
      setReportsFileLoadingKey(null);
      const data = await readJson(res);
      setReportsPayloads((current) => ({
        ...current,
        [file.path]:
          res.ok && data
            ? data
            : {
                file,
                error:
                  data?.error ||
                  "Unable to load this file. The local API may need to restart.",
              },
      }));
    },
    [projectPath, reportsPayloads],
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

  const deleteReport = useCallback(
    async (file: ReportsFile) => {
      setDeletingReportKey(file.path);
      const params = new URLSearchParams({
        path: projectPath,
        file: file.path,
      });
      const res = await apiFetch(`/api/projects/reports/file/?${params}`, {
        method: "DELETE",
      });
      const data = await readJson(res);
      setDeletingReportKey(null);

      if (!res.ok) {
        toast.error(data?.error || "Failed to delete report");
        return;
      }

      setReportsFiles((current) =>
        current.filter((currentFile) => currentFile.path !== file.path),
      );
      setReportsPayloads((current) => {
        const next = { ...current };
        delete next[file.path];
        return next;
      });
      if (expandedReportKey === file.path) {
        setExpandedReportKey(null);
      }
      toast.success("Report deleted");
    },
    [expandedReportKey, projectPath],
  );

  const downloadReport = useCallback(
    async (file: ReportsFile) => {
      setDownloadingReportKey(file.path);
      const params = new URLSearchParams({
        path: projectPath,
        file: file.path,
      });
      const res = await apiFetch(`/api/projects/reports/download/?${params}`);
      setDownloadingReportKey(null);

      if (!res.ok) {
        const data = await readJson(res);
        toast.error(data?.error || "Failed to download report");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    },
    [projectPath],
  );

  const fetchData = useCallback(async () => {
    const [projRes, sessRes] = await Promise.all([
      apiFetch("/api/projects/recent/"),
      apiFetch("/api/threads/"),
    ]);
    if (projRes.ok) setProjects((await projRes.json()).projects);
    if (sessRes.ok) setThreads((await sessRes.json()).threads);
    setLoading(false);
  }, []);

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
    fetchData();
    const interval = window.setInterval(fetchData, 5000);
    return () => window.clearInterval(interval);
  }, [fetchData]);

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
                            {formatDate(node.updated_at)} · {formatBytes(node.size)} ·{" "}
                            {node.path}/
                          </div>
                        </div>
                      </button>

                      {groupExpanded ? (
                        <div className="border-t border-border bg-background/70">
                          {node.items.map((file) => {
                            const expanded = expandedReportKey === file.path;
                            const payload = reportsPayloads[file.path];
                            const Icon =
                              file.kind === "image" ? ImageIcon : FileText;
                            return (
                              <div
                                key={file.path}
                                className="border-t border-border first:border-t-0"
                              >
                                <div className="flex items-center gap-1 py-2 pl-8 pr-3 transition-colors hover:bg-surface-muted">
                                  <button
                                    type="button"
                                    onClick={() => toggleReport(file)}
                                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                                  >
                                    {expanded ? (
                                      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                    ) : (
                                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                    )}
                                    <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                    <div className="min-w-0 flex-1">
                                      <div className="truncate text-[13px] font-medium text-foreground">
                                        {file.name}
                                      </div>
                                      <div className="truncate font-mono text-[10.5px] text-muted-foreground/75">
                                        {formatDate(file.updated_at)} ·{" "}
                                        {formatBytes(file.size)} · {file.path}
                                      </div>
                                    </div>
                                  </button>
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                                    disabled={downloadingReportKey === file.path}
                                    aria-label={`Download ${file.name}`}
                                    onClick={() => {
                                      void downloadReport(file);
                                    }}
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                                        disabled={deletingReportKey === file.path}
                                        aria-label={`Delete ${file.name}`}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete report?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          This will delete {file.name} from this project's reports folder.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction asChild>
                                          <Button
                                            type="button"
                                            variant="destructive"
                                            onClick={() => {
                                              void deleteReport(file);
                                            }}
                                          >
                                            Delete report
                                          </Button>
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>

                                {expanded ? (
                                  <div className="border-t border-border bg-background px-4 py-4">
                                    {reportsFileLoadingKey === file.path ? (
                                      <div className="text-[12px] text-muted-foreground">
                                        Loading file…
                                      </div>
                                    ) : payload?.error ? (
                                      <div className="rounded border border-border bg-surface-muted px-3 py-2 text-[12px] text-muted-foreground">
                                        {payload.error}
                                      </div>
                                    ) : payload?.file.kind === "image" &&
                                      payload.data_url ? (
                                      <img
                                        src={payload.data_url}
                                        alt={payload.file.name}
                                        className="max-h-[70vh] max-w-full rounded border border-border object-contain"
                                      />
                                    ) : payload?.file.kind === "markdown" ? (
                                      <article className="prose prose-sm max-w-none dark:prose-invert">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                          {payload.content ?? ""}
                                        </ReactMarkdown>
                                      </article>
                                    ) : payload?.content ? (
                                      <pre className="whitespace-pre-wrap rounded border border-border bg-surface-muted p-3 text-[12px] leading-relaxed text-foreground">
                                        {payload.content}
                                      </pre>
                                    ) : (
                                      <div className="text-[12px] text-muted-foreground">
                                        Select a file to preview.
                                      </div>
                                    )}
                                  </div>
                                ) : null}
                              </div>
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
                const Icon = file.kind === "image" ? ImageIcon : FileText;
                return (
                  <div
                    key={file.path}
                    className={index > 0 ? "border-t border-border" : ""}
                  >
                    <div className="flex items-center gap-1 px-3 py-2 transition-colors hover:bg-surface-muted">
                      <button
                        type="button"
                        onClick={() => toggleReport(file)}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      >
                        {expanded ? (
                          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        )}
                        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-medium text-foreground">
                            {file.name}
                          </div>
                          <div className="truncate font-mono text-[10.5px] text-muted-foreground/75">
                            {formatDate(file.updated_at)} · {formatBytes(file.size)} ·{" "}
                            {file.path}
                          </div>
                        </div>
                      </button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                        disabled={downloadingReportKey === file.path}
                        aria-label={`Download ${file.name}`}
                        onClick={() => {
                          void downloadReport(file);
                        }}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                            disabled={deletingReportKey === file.path}
                            aria-label={`Delete ${file.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete report?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will delete {file.name} from this project's reports folder.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction asChild>
                              <Button
                                type="button"
                                variant="destructive"
                                onClick={() => {
                                  void deleteReport(file);
                                }}
                              >
                                Delete report
                              </Button>
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>

                    {expanded ? (
                      <div className="border-t border-border bg-background px-4 py-4">
                        {reportsFileLoadingKey === file.path ? (
                          <div className="text-[12px] text-muted-foreground">
                            Loading file…
                          </div>
                        ) : payload?.error ? (
                          <div className="rounded border border-border bg-surface-muted px-3 py-2 text-[12px] text-muted-foreground">
                            {payload.error}
                          </div>
                        ) : payload?.file.kind === "image" &&
                          payload.data_url ? (
                          <img
                            src={payload.data_url}
                            alt={payload.file.name}
                            className="max-h-[70vh] max-w-full rounded border border-border object-contain"
                          />
                        ) : payload?.file.kind === "markdown" ? (
                          <article className="prose prose-sm max-w-none dark:prose-invert">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {payload.content ?? ""}
                            </ReactMarkdown>
                          </article>
                        ) : payload?.content ? (
                          <pre className="whitespace-pre-wrap rounded border border-border bg-surface-muted p-3 text-[12px] leading-relaxed text-foreground">
                            {payload.content}
                          </pre>
                        ) : (
                          <div className="text-[12px] text-muted-foreground">
                            Select a file to preview.
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
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
            <div className="px-3 py-6 text-[12px] text-muted-foreground">
              No threads for this project.
            </div>
          ) : (
            <div>
              {projectThreads.map((thread, idx) => {
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
                      isDeemphasized && "opacity-60 saturate-0 hover:opacity-80",
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
                        ) : thread.is_livekit_dispatcher ||
                          thread.is_livekit_shared ? (
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
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ProjectDetail;
