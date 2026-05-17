import DashboardLayout from "@/components/layouts/ExampleLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import type { Project, ServiceStatus, ThreadInfo } from "@/types/session";
import { ChevronRight, Plus, Terminal } from "lucide-react";
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

  const activeThreads = threads.filter((t) => t.status === "running");
  const recentThreads = [...threads]
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    .slice(0, 8);
  const runningServices = Object.values(services).filter((s) => s.running);
  const projectName = (path: string) => path.split("/").pop() || path;

  const stats = [
    {
      label: "threads",
      value: activeThreads.length,
      total: threads.length,
      to: "/dashboard/threads",
    },
    {
      label: "projects",
      value: projects.length,
      total: null,
      to: "/dashboard/projects",
    },
    {
      label: "services",
      value: runningServices.length,
      total: Object.keys(services).length,
      to: "/dashboard/status",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-5">
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

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          {stats.map((s) => (
            <button
              key={s.label}
              onClick={() => navigate(s.to)}
              className="group rounded border border-border bg-surface px-3 py-2.5 text-left transition-colors hover:bg-surface-muted"
            >
              <p className="text-[10.5px] font-mono uppercase tracking-wider text-muted-foreground">
                {s.label}
              </p>
              <p className="mt-1 font-mono text-xl font-medium text-foreground tabular-nums">
                {s.value}
                {s.total != null ? (
                  <span className="text-muted-foreground/50">/{s.total}</span>
                ) : null}
              </p>
            </button>
          ))}
        </div>

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
                <button
                  key={thread.thread_id}
                  onClick={() =>
                    navigate(`/dashboard/threads/${thread.thread_id}`)
                  }
                  className={`group flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors hover:bg-surface-muted ${
                    idx > 0 ? "border-t border-border" : ""
                  }`}
                >
                  <Terminal className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="truncate text-[12.5px] font-medium text-foreground">
                    {projectName(thread.directory)}
                  </span>
                  <span className="truncate font-mono text-[11px] text-muted-foreground/70">
                    {thread.directory}
                  </span>
                  <span className="ml-auto flex shrink-0 items-center gap-2.5">
                    <StatusBadge status={thread.status} />
                    <span className="hidden font-mono text-[10.5px] text-muted-foreground tabular-nums sm:inline">
                      {new Date(thread.created_at).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                    <ChevronRight className="h-3 w-3 text-muted-foreground/40 transition-colors group-hover:text-foreground" />
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
