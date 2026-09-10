import DashboardLayout from "@/components/layouts/DashboardLayout";
import { OpenInNewTabMenu } from "@/components/workspace/OpenInNewTabMenu";
import { projectTabTarget } from "@/lib/workspace-tabs";
import { NewThreadDialog } from "@/components/NewThreadDialog";
import { ThreadListItem } from "@/components/ThreadListItem";
import { Button } from "@/components/ui/button";
import { ErrorBanner } from "@/components/ui/error-banner";
import { apiFetch } from "@/lib/api";
import { extractErrorMessage } from "@/lib/api-errors";
import { THREAD_LIST_REFRESH_INTERVAL_MS } from "@/lib/polling";
import {
  fetchProjectPage,
  fetchThreadPage,
  projectName,
} from "@/lib/project-display";
import { setThreadFavorite } from "@/lib/thread-favorites";
import { threadRoutePath } from "@/lib/thread-display";
import type { Project, ServiceStatus, ThreadInfo } from "@/types/session";
import {
  Activity,
  AlertTriangle,
  ChevronRight,
  Folder,
  Plus,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { SyncNudgeCard } from "./sync/SyncNudgeCard";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Dashboard = () => {
  const navigate = useNavigate();
  const [threads, setThreads] = useState<ThreadInfo[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [services, setServices] = useState<Record<string, ServiceStatus>>({});
  const [error, setError] = useState<string | null>(null);
  const [newThreadOpen, setNewThreadOpen] = useState(false);

  const fetchData = useCallback(async () => {
    // Polled on an interval: failures update a persistent inline banner
    // instead of toasting on every tick.
    try {
      const [threadsPage, projectsPage, statusRes] = await Promise.all([
        fetchThreadPage(apiFetch),
        fetchProjectPage(apiFetch),
        apiFetch("/api/status/"),
      ]);
      setThreads(threadsPage.threads);
      setProjects(projectsPage.projects);
      if (!statusRes.ok) {
        throw new Error(
          await extractErrorMessage(statusRes, "Failed to load service status"),
        );
      }
      setServices((await statusRes.json()).services);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to reach the local API.",
      );
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = window.setInterval(
      fetchData,
      THREAD_LIST_REFRESH_INTERVAL_MS,
    );
    return () => window.clearInterval(interval);
  }, [fetchData]);

  const recentThreads = [...threads]
    .sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at))
    .slice(0, 8);
  const recentProjects = projects.slice(0, 4);
  const serviceEntries = Object.entries(services);
  const requiredServiceEntries = serviceEntries.filter(
    ([, service]) => !service.optional,
  );
  const runningServices = requiredServiceEntries.filter(
    ([, service]) => service.running,
  );
  const stoppedServices = requiredServiceEntries.filter(
    ([, service]) => !service.running,
  );
  const serviceWarning =
    requiredServiceEntries.length > 0 &&
    runningServices.length !== requiredServiceEntries.length;
  const openProject = (project: Project) =>
    navigate(`/dashboard/project?path=${encodeURIComponent(project.path)}`);
  const toggleThreadFavorite = async (thread: ThreadInfo) => {
    try {
      const favorite = await setThreadFavorite(
        thread.thread_id,
        !thread.is_favorite,
      );
      setThreads((current) =>
        current.map((item) =>
          item.thread_id === favorite.thread_id
            ? {
                ...item,
                is_favorite: favorite.is_favorite,
                favorited_at: favorite.favorited_at,
              }
            : item,
        ),
      );
    } catch {
      toast.error("Failed to update favorite");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <SyncNudgeCard />
        {error ? (
          <ErrorBanner>{error} — retrying automatically.</ErrorBanner>
        ) : null}

        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Workspace overview
            </h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Continue recent work or start a new coding thread.
            </p>
          </div>
          <Button
            className="shrink-0"
            onClick={() => setNewThreadOpen(true)}
            size="sm"
          >
            <Plus className="h-4 w-4" />
            New thread
          </Button>
        </header>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(260px,1fr)]">
          {/* Recent activity */}
          <section className="min-w-0 overflow-hidden rounded-lg border border-border bg-surface">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <div>
                <h2 className="text-[13px] font-semibold text-foreground">
                  Recent activity
                </h2>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Your latest coding threads
                </p>
              </div>
              <button
                className="text-[11px] font-medium text-primary hover:underline"
                onClick={() => navigate("/dashboard/threads")}
                type="button"
              >
                View all
              </button>
            </div>
            {recentThreads.length === 0 ? (
              <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center">
                <Activity className="h-6 w-6 text-muted-foreground/40" />
                <p className="mt-2.5 text-[13px] font-medium text-foreground">
                  No threads yet
                </p>
                <p className="mt-1 max-w-xs text-[12px] text-muted-foreground">
                  Start a thread and it will appear here with its current
                  status.
                </p>
                <Button
                  className="mt-4"
                  onClick={() => setNewThreadOpen(true)}
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                  Start a thread
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentThreads.map((thread) => (
                  <ThreadListItem
                    key={thread.thread_id}
                    onClick={() => navigate(threadRoutePath(thread))}
                    onToggleFavorite={(item) => void toggleThreadFavorite(item)}
                    thread={thread}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Side column */}
          <div className="min-w-0 space-y-5">
            <section className="min-w-0 rounded-lg border border-border bg-surface p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[13px] font-semibold text-foreground">
                  Projects
                </h2>
                <button
                  className="text-[11px] font-medium text-primary hover:underline"
                  onClick={() => navigate("/dashboard/projects")}
                  type="button"
                >
                  View all
                </button>
              </div>
              <div className="mt-3 space-y-1">
                {recentProjects.length === 0 ? (
                  <div className="rounded-md bg-surface-muted px-3 py-6 text-center text-[12px] text-muted-foreground">
                    No projects yet
                  </div>
                ) : (
                  recentProjects.map((project) => (
                    <OpenInNewTabMenu
                      key={project.path}
                      target={projectTabTarget(project.path)}
                    >
                      <button
                        className="group flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-surface-muted"
                        key={project.path}
                        onClick={() => openProject(project)}
                        type="button"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <Folder className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-foreground">
                            {projectName(project.path)}
                          </span>
                          <span className="mt-0.5 block truncate font-mono text-[10.5px] text-muted-foreground">
                            {project.path}
                          </span>
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                      </button>
                    </OpenInNewTabMenu>
                  ))
                )}
              </div>
            </section>

            <button
              className={`w-full rounded-lg border p-4 text-left transition-colors ${
                serviceWarning
                  ? "border-warning/40 bg-warning/10 hover:bg-warning/15"
                  : "border-border bg-surface hover:bg-surface-muted"
              }`}
              onClick={() => navigate("/dashboard/status")}
              type="button"
            >
              <div className="flex items-start gap-3">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${
                    serviceWarning
                      ? "bg-warning/15 text-warning"
                      : "bg-success/10 text-success"
                  }`}
                >
                  {serviceWarning ? (
                    <AlertTriangle className="h-[18px] w-[18px]" />
                  ) : (
                    <Activity className="h-[18px] w-[18px]" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold text-foreground">
                    {serviceWarning
                      ? "Services need attention"
                      : "System ready"}
                  </span>
                  <span className="mt-1 block text-[12px] leading-5 text-muted-foreground">
                    {requiredServiceEntries.length === 0
                      ? "Open Status to review local services."
                      : `${runningServices.length} of ${requiredServiceEntries.length} required services running${
                          stoppedServices.length
                            ? ` · ${stoppedServices
                                .map(([, service]) => service.name)
                                .join(", ")}`
                            : ""
                        }`}
                  </span>
                </span>
                <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/40" />
              </div>
            </button>
          </div>
        </div>
      </div>

      <NewThreadDialog onOpenChange={setNewThreadOpen} open={newThreadOpen} />
    </DashboardLayout>
  );
};

export default Dashboard;
