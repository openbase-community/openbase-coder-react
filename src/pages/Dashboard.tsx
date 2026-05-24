import DashboardLayout from "@/components/layouts/ExampleLayout";
import { ThreadListItem } from "@/components/ThreadListItem";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { projectName } from "@/lib/project-display";
import type { Project, ServiceStatus, ThreadInfo } from "@/types/session";
import { AlertTriangle, ChevronRight, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();
  const [threads, setThreads] = useState<ThreadInfo[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [services, setServices] = useState<Record<string, ServiceStatus>>({});

  const fetchData = useCallback(async () => {
    const [sessRes, projRes, statusRes] = await Promise.all([
      apiFetch("/api/threads/"),
      apiFetch("/api/projects/recent/"),
      apiFetch("/api/status/"),
    ]);
    if (sessRes.ok) setThreads((await sessRes.json()).threads);
    if (projRes.ok) setProjects((await projRes.json()).projects);
    if (statusRes.ok) setServices((await statusRes.json()).services);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = window.setInterval(fetchData, 5000);
    return () => window.clearInterval(interval);
  }, [fetchData]);

  const recentThreads = [...threads]
    .sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at))
    .slice(0, 8);
  const recentProjects = projects.slice(0, 3);
  const serviceEntries = Object.entries(services);
  const runningServices = serviceEntries.filter(([, service]) => service.running);
  const stoppedServices = serviceEntries.filter(([, service]) => !service.running);
  const serviceWarning =
    serviceEntries.length > 0 && runningServices.length !== serviceEntries.length;
  const openProject = (project: Project) =>
    navigate(`/dashboard/project?path=${encodeURIComponent(project.path)}`);

  return (
    <DashboardLayout>
      <div className="space-y-5">
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
                {runningServices.length}/{serviceEntries.length} services
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
                  onClick={() =>
                    navigate(`/dashboard/threads/${thread.thread_id}`)
                  }
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
