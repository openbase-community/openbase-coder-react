import DashboardLayout from "@/components/layouts/DashboardLayout";
import { ThreadListItem } from "@/components/ThreadListItem";
import { Button } from "@/components/ui/button";
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
import { AlertTriangle, ChevronRight, Plus } from "lucide-react";
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
  const recentProjects = projects.slice(0, 3);
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
          <div className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
            {error} — retrying automatically.
          </div>
        ) : null}

        {serviceWarning ? (
          <button
            onClick={() => navigate("/dashboard/status")}
            className="flex w-full items-start gap-2 rounded border border-warning/40 bg-warning/10 px-3 py-2 text-left transition-colors hover:bg-warning/15"
          >
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-medium text-foreground">
                Service warning
              </p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                {runningServices.length}/{requiredServiceEntries.length} services
                running
                {stoppedServices.length > 0
                  ? ` · stopped: ${stoppedServices
                      .map(([, service]) => service.name)
                      .join(", ")}`
                  : ""}
              </p>
            </div>
            <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
          </button>
        ) : null}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold tracking-tight text-foreground">
              Overview
            </h1>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              Workspace summary
            </p>
          </div>
          <Button
            size="sm"
            className="h-7 px-2.5 text-[12px]"
            onClick={() => navigate("/dashboard/threads")}
          >
            <Plus className="h-3 w-3" />
            New thread
          </Button>
        </div>

        <section>
          <div className="mb-2 flex items-end justify-between">
            <h2 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
              Recent projects
            </h2>
            <button
              onClick={() => navigate("/dashboard/projects")}
              className="text-[11px] text-muted-foreground hover:text-foreground"
            >
              View all →
            </button>
          </div>

          {recentProjects.length === 0 ? (
            <div className="rounded border border-dashed border-border bg-surface px-4 py-6 text-center">
              <p className="text-[12px] text-muted-foreground">
                No projects yet.
              </p>
            </div>
          ) : (
            <div className="grid gap-2 md:grid-cols-3">
              {recentProjects.map((project) => (
                <button
                  key={project.path}
                  onClick={() => openProject(project)}
                  className="group flex min-w-0 items-center gap-2 rounded border border-border bg-surface px-3 py-2.5 text-left transition-colors hover:bg-surface-muted"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-foreground">
                      {projectName(project.path)}
                    </p>
                    <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground/70">
                      {project.path}
                    </p>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-foreground" />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Recent threads */}
        <section>
          <div className="mb-2 flex items-end justify-between">
            <h2 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
              Recent threads
            </h2>
            <button
              onClick={() => navigate("/dashboard/threads")}
              className="text-[11px] text-muted-foreground hover:text-foreground"
            >
              View all →
            </button>
          </div>

          {recentThreads.length === 0 ? (
            <div className="rounded border border-dashed border-border bg-surface px-4 py-6 text-center">
              <p className="text-[12px] text-muted-foreground">
                No threads yet.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded border border-border bg-surface">
              {recentThreads.map((thread, idx) => (
                <ThreadListItem
                  key={thread.thread_id}
                  thread={thread}
                  showTopBorder={idx > 0}
                  onClick={() => navigate(threadRoutePath(thread))}
                  onToggleFavorite={(item) => void toggleThreadFavorite(item)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
