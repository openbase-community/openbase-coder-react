import DashboardLayout from "@/components/layouts/ExampleLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { apiFetch } from "@/lib/api";
import { usePluginRegistry } from "@/plugin-registry";
import type { GitStatus, Project, SessionInfo } from "@/types/session";
import { Input } from "@/components/ui/input";
import { FileText, FolderOpen, GitBranch, Plus, Sparkles, Zap } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const GIT_STATUS_CONFIG: Record<GitStatus, { color: string; hoverColor: string; label: string }> = {
  clean: { color: "bg-green-500", hoverColor: "hover:bg-green-400", label: "Clean" },
  dirty: { color: "bg-yellow-500", hoverColor: "hover:bg-yellow-300", label: "Uncommitted changes" },
  unpushed: { color: "bg-blue-500", hoverColor: "hover:bg-blue-400", label: "Unpushed commits" },
  no_git: { color: "bg-gray-300", hoverColor: "hover:bg-gray-200", label: "Not a git repo" },
};
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

function gitTone(status: GitStatus | undefined) {
  switch (status) {
    case "dirty":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "unpushed":
      return "bg-sky-50 text-sky-700 ring-sky-200";
    case "no_git":
      return "bg-slate-100 text-slate-500 ring-slate-200";
    case "clean":
    default:
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }
}

const Projects = () => {
  const { pluginProjectViews } = usePluginRegistry();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPath, setNewPath] = useState("");

  const fetchData = useCallback(async () => {
    const [projRes, sessRes] = await Promise.all([
      apiFetch("/api/projects/recent/"),
      apiFetch("/api/sessions/"),
    ]);
    if (projRes.ok) {
      const data = await projRes.json();
      setProjects(data.projects);
    }
    if (sessRes.ok) {
      const data = await sessRes.json();
      setSessions(data.sessions);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getActiveSessions = (projectPath: string) =>
    sessions.filter(
      (s) => s.directory === projectPath && s.status === "running"
    );

  const createSession = async (directory: string) => {
    const res = await apiFetch("/api/sessions/", {
      method: "POST",
      body: JSON.stringify({ directory }),
    });
    if (res.ok) {
      const data = await res.json();
      navigate(`/dashboard/sessions/${data.session_id}`);
    } else {
      toast.error("Failed to create session");
    }
  };

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

  const projectName = (path: string) => path.split("/").pop() || path;
  const hasProjectView = (stack: string | null | undefined) =>
    !!stack && pluginProjectViews.some((item) => item.stack === stack);

  const openProjectView = (project: Project) => {
    if (!project.stack) {
      toast.error("Project stack not set");
      return;
    }
    navigate(
      `/dashboard/project-view?path=${encodeURIComponent(project.path)}&stack=${encodeURIComponent(project.stack)}`,
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Workspace Index
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
              Projects
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Jump into active repositories, inspect diffs, and start new coding
              sessions without wading through oversized cards.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 self-start xl:min-w-[320px]">
            <div className="rounded-2xl border border-white/70 bg-white px-4 py-3 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Recent
              </p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                {projects.length}
              </p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white px-4 py-3 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Active
              </p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                {sessions.filter((session) => session.status === "running").length}
              </p>
            </div>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            addProject();
          }}
          className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
        >
          <Input
            placeholder="Paste a project path to add..."
            value={newPath}
            onChange={(e) => setNewPath(e.target.value)}
            className="h-11 flex-1 border-slate-200 bg-slate-50 text-sm"
          />
          <Button
            onClick={addProject}
            disabled={!newPath.trim()}
            className="h-11 rounded-xl px-4"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </form>

        {loading ? (
          <div className="text-gray-400">Loading...</div>
        ) : projects.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
              No projects found. Create a session to get started.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {projects.map((project) => {
              const active = getActiveSessions(project.path);
              const gs = GIT_STATUS_CONFIG[project.git_status ?? "clean"];
              return (
                <Card
                  key={project.path}
                  className="group overflow-hidden rounded-2xl border-slate-200/80 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                >
                  <CardHeader className="space-y-3 p-4 pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <FolderOpen className="h-4 w-4 text-slate-400" />
                          <CardTitle className="truncate text-[15px] font-semibold leading-6 text-slate-900">
                            {projectName(project.path)}
                          </CardTitle>
                        </div>
                        <p className="mt-2 truncate text-xs text-slate-500">
                          {project.path}
                        </p>
                      </div>
                      <TooltipProvider delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className={`flex h-9 w-9 items-center justify-center rounded-full ring-1 transition-colors ${gitTone(project.git_status)} ${gs.hoverColor}`}
                              onClick={() =>
                                navigate(
                                  `/dashboard/diff?path=${encodeURIComponent(project.path)}`
                                )
                              }
                            >
                              <span className={`h-2.5 w-2.5 rounded-full ${gs.color}`} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>{gs.label}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${gitTone(project.git_status)}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${gs.color}`} />
                        {gs.label}
                      </span>
                      {project.stack ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">
                          <Sparkles className="h-3 w-3" />
                          {project.stack}
                        </span>
                      ) : null}
                      {active.length > 0 ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-200">
                          {active.length} active
                        </span>
                      ) : null}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 px-4 pb-4 pt-0">
                    <div className="flex flex-wrap gap-2">
                      {hasProjectView(project.stack) ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-lg px-3 text-xs"
                          onClick={() => openProjectView(project)}
                        >
                          Open
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-lg px-3 text-xs"
                        onClick={() =>
                          navigate(
                            `/dashboard/diff?path=${encodeURIComponent(project.path)}`
                          )
                        }
                      >
                        <GitBranch className="h-3 w-3 mr-1" />
                        Diff
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-lg px-3 text-xs"
                        onClick={() =>
                          navigate(
                            `/dashboard/claude-md?path=${encodeURIComponent(project.path)}`
                          )
                        }
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        CLAUDE.md
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-lg px-3 text-xs"
                        onClick={() =>
                          navigate(
                            `/dashboard/skills?path=${encodeURIComponent(project.path)}`
                          )
                        }
                      >
                        <Zap className="h-3 w-3 mr-1" />
                        Skills
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 rounded-lg px-3 text-xs"
                        onClick={() => createSession(project.path)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Session
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Projects;
