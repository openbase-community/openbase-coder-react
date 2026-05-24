import DashboardLayout from "@/components/layouts/ExampleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { apiFetch } from "@/lib/api";
import { GIT_STATUS, projectName } from "@/lib/project-display";
import { useProjectsAndThreads } from "@/lib/useProjectsAndThreads";
import type { Project } from "@/types/session";
import {
  ChevronRight,
  FileText,
  FolderOpen,
  GitBranch,
  Plus,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Projects = () => {
  const navigate = useNavigate();
  const { projects, threads, loading, fetchData } = useProjectsAndThreads();
  const [newPath, setNewPath] = useState("");
  const [query, setQuery] = useState("");

  const getActiveThreads = (path: string) =>
    threads.filter((t) => t.directory === path && t.status === "running");

  const addProject = async () => {
    const trimmed = newPath.trim();
    if (!trimmed) return;
    const res = await apiFetch("/api/projects/recent/", {
      method: "POST",
      body: JSON.stringify({ path: trimmed }),
    });
    if (res.ok) {
      setNewPath("");
      fetchData();
      toast.success("Project added");
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to add project");
    }
  };

  const openProject = (project: Project) =>
    navigate(`/dashboard/project?path=${encodeURIComponent(project.path)}`);

  const createThread = async (directory: string) => {
    const res = await apiFetch("/api/threads/", {
      method: "POST",
      body: JSON.stringify({ directory }),
    });
    if (res.ok) {
      const data = await res.json();
      navigate(`/dashboard/threads/${data.thread_id}`);
    } else {
      toast.error("Failed to create thread");
    }
  };

  const filtered = useMemo(() => {
    if (!query.trim()) return projects;
    const q = query.trim().toLowerCase();
    return projects.filter(
      (p) =>
        p.path.toLowerCase().includes(q) ||
        projectName(p.path).toLowerCase().includes(q),
    );
  }, [projects, query]);

  const activeCount = threads.filter((t) => t.status === "running").length;

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold tracking-tight text-foreground">
              Projects
            </h1>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {projects.length} total · {activeCount} active
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex gap-2">
          <Input
            placeholder="Search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-7 max-w-[180px] text-[12.5px]"
          />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addProject();
            }}
            className="flex flex-1 gap-1.5"
          >
            <Input
              placeholder="Add project path…"
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              className="h-7 flex-1 text-[12.5px]"
            />
            <Button
              onClick={addProject}
              disabled={!newPath.trim()}
              size="sm"
              className="h-7 px-2.5 text-[12px]"
            >
              <Plus className="h-3 w-3" />
              Add
            </Button>
          </form>
        </div>

        {/* List */}
        {loading ? (
          <div className="text-[12px] text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="rounded border border-dashed border-border bg-surface px-4 py-6 text-center text-[12px] text-muted-foreground">
            {projects.length === 0
              ? "No projects. Add one above."
              : "No projects match."}
          </div>
        ) : (
          <div className="overflow-hidden rounded border border-border bg-surface">
            {filtered.map((project, idx) => {
              const active = getActiveThreads(project.path);
              const gs = GIT_STATUS[project.git_status ?? "clean"];
              return (
                <div
                  role="button"
                  tabIndex={0}
                  key={project.path}
                  onClick={() => openProject(project)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openProject(project);
                    }
                  }}
                  className={`group flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-surface-muted ${
                    idx > 0 ? "border-t border-border" : ""
                  }`}
                >
                  <TooltipProvider delayDuration={150}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="shrink-0">
                          <span
                            className={`block h-2 w-2 rounded-full ${gs.dot}`}
                          />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>{gs.label}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
                    <span className="truncate text-[13px] font-medium text-foreground">
                      {projectName(project.path)}
                    </span>
                    <span className="truncate font-mono text-[11px] text-muted-foreground/70">
                      {project.path}
                    </span>
                  </div>

                  <div className="hidden shrink-0 items-center gap-2 font-mono text-[10.5px] md:flex">
                    {active.length > 0 ? (
                      <span className="text-info">{active.length} active</span>
                    ) : null}
                  </div>

                  <div className="hidden shrink-0 flex-wrap items-center justify-end gap-0.5 sm:flex">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-[11px]"
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(
                          `/dashboard/diff?path=${encodeURIComponent(project.path)}`,
                        );
                      }}
                    >
                      <GitBranch className="h-3 w-3" />
                      Diff
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-[11px]"
                      onClick={(event) => {
                        event.stopPropagation();
                        openProject(project);
                      }}
                    >
                      <FileText className="h-3 w-3" />
                      Reports
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-[11px]"
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(
                          `/dashboard/skills?path=${encodeURIComponent(project.path)}`,
                        );
                      }}
                    >
                      <Zap className="h-3 w-3" />
                      Skills
                    </Button>
                    <Button
                      size="sm"
                      className="h-6 px-2 text-[11px]"
                      onClick={(event) => {
                        event.stopPropagation();
                        createThread(project.path);
                      }}
                    >
                      <Plus className="h-3 w-3" />
                      Thread
                    </Button>
                  </div>

                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-foreground" />
                </div>
              );
            })}
          </div>
        )}

        {!loading && projects.length === 0 ? (
          <div className="text-center">
            <FolderOpen className="mx-auto h-5 w-5 text-muted-foreground/40" />
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
};

export default Projects;
