import DashboardLayout from "@/components/layouts/DashboardLayout";
import { NewThreadDialog } from "@/components/NewThreadDialog";
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
import {
  Activity,
  AlertTriangle,
  ArrowRight,
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
        <div className="ob-dashboard space-y-6">
          <SyncNudgeCard />

          <header className="flex flex-col items-start justify-between gap-4 px-1 pb-1 pt-2 sm:flex-row sm:items-end sm:gap-6">
            <div className="min-w-0">
              <h1 className="text-[25px] font-semibold leading-tight tracking-[-0.035em] text-foreground">
                Workspace overview
              </h1>
              <p className="mt-1.5 text-sm leading-5 text-muted-foreground">
                Continue recent work or start a new coding thread.
              </p>
            </div>
            <Button
              className="h-10 shrink-0 rounded-xl bg-[#18498B] px-4 text-sm shadow-[0_9px_20px_-13px_rgba(24,73,139,.75)] hover:bg-[#153f78]"
              onClick={() => setNewThreadOpen(true)}
            >
              <Plus className="h-4 w-4" />
              New thread
            </Button>
          </header>

          {error ? (
            <div className="flex items-start gap-3 rounded-2xl border border-destructive/15 bg-destructive/[0.06] px-4 py-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error} — retrying automatically.</span>
            </div>
          ) : null}

          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,.8fr)]">
            <section className="min-w-0 overflow-hidden rounded-[20px] border border-primary/[0.09] bg-white/80 shadow-[0_18px_55px_-42px_rgba(24,73,139,.55)]">
              <div className="flex items-center justify-between border-b border-primary/[0.07] px-5 py-4">
                <div>
                  <h2 className="text-[15px] font-semibold tracking-[-0.015em] text-foreground">Recent activity</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">Your latest coding threads</p>
                </div>
                <button
                  className="group flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-primary hover:bg-primary/[0.06]"
                  onClick={() => navigate("/dashboard/threads")}
                  type="button"
                >
                  View all
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
              {recentThreads.length === 0 ? (
                <div className="flex min-h-64 flex-col items-center justify-center px-8 text-center">
                  <Activity className="h-7 w-7 text-muted-foreground/40" />
                  <p className="mt-3 text-sm font-semibold text-foreground">No threads yet</p>
                  <p className="mt-1 max-w-sm text-sm text-muted-foreground">Start a thread and it will appear here with its current status.</p>
                  <Button className="mt-5 rounded-xl" onClick={() => setNewThreadOpen(true)} size="sm">
                    <Plus className="h-4 w-4" />
                    Start a thread
                  </Button>
                </div>
              ) : (
                <div className="ob-dashboard-thread-list divide-y divide-primary/[0.07]">
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

            <div className="min-w-0 space-y-6">
              <section className="min-w-0 rounded-[20px] border border-primary/[0.09] bg-white/80 p-5 shadow-[0_18px_55px_-42px_rgba(24,73,139,.55)]">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-[15px] font-semibold tracking-[-0.015em] text-foreground">Projects</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">Recently opened</p>
                  </div>
                  <button className="text-xs font-medium text-primary hover:underline" onClick={() => navigate("/dashboard/projects")} type="button">View all</button>
                </div>
                <div className="mt-4 space-y-2">
                  {recentProjects.length === 0 ? (
                    <div className="rounded-xl bg-primary/[0.035] px-4 py-7 text-center text-sm text-muted-foreground">No projects yet</div>
                  ) : recentProjects.map((project) => (
                    <button
                      className="group flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-primary/[0.05]"
                      key={project.path}
                      onClick={() => openProject(project)}
                      type="button"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-primary/[0.08] text-primary">
                        <Folder className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-foreground">{projectName(project.path)}</span>
                        <span className="mt-0.5 block truncate font-mono text-[11px] text-muted-foreground">{project.path}</span>
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                    </button>
                  ))}
                </div>
              </section>

              <button
                className={`w-full rounded-[20px] border p-5 text-left shadow-[0_18px_55px_-42px_rgba(24,73,139,.55)] ${serviceWarning ? "border-warning/20 bg-warning/[0.07]" : "border-primary/[0.09] bg-white/80"}`}
                onClick={() => navigate("/dashboard/status")}
                type="button"
              >
                <div className="flex items-start gap-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${serviceWarning ? "bg-warning/12 text-warning" : "bg-success/10 text-success"}`}>
                    {serviceWarning ? <AlertTriangle className="h-[18px] w-[18px]" /> : <Activity className="h-[18px] w-[18px]" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground">{serviceWarning ? "Services need attention" : "System ready"}</span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                      {requiredServiceEntries.length === 0
                        ? "Open Status to review local services."
                        : `${runningServices.length} of ${requiredServiceEntries.length} required services running${stoppedServices.length ? ` · ${stoppedServices.map(([, service]) => service.name).join(", ")}` : ""}`}
                    </span>
                  </span>
                  <ChevronRight className="mt-1 h-4 w-4 text-muted-foreground/40" />
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
