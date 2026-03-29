import DashboardLayout from "@/components/layouts/ExampleLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api";
import type { Project, SessionInfo } from "@/types/session";
import { Plus, Terminal, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Sessions = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchData = useCallback(async () => {
    const [sessRes, projRes] = await Promise.all([
      apiFetch("/api/sessions/"),
      apiFetch("/api/projects/recent/"),
    ]);
    if (sessRes.ok) {
      const data = await sessRes.json();
      setSessions(data.sessions);
    }
    if (projRes.ok) {
      const data = await projRes.json();
      setProjects(data.projects);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const deleteSession = async (sessionId: string) => {
    const res = await apiFetch(`/api/sessions/${sessionId}/`, {
      method: "DELETE",
    });
    if (res.ok) {
      setSessions((prev) => prev.filter((s) => s.session_id !== sessionId));
      toast.success("Session deleted");
    } else {
      toast.error("Failed to delete session");
    }
  };

  const createSession = async (directory: string) => {
    const res = await apiFetch("/api/sessions/", {
      method: "POST",
      body: JSON.stringify({ directory }),
    });
    if (res.ok) {
      const data = await res.json();
      setDialogOpen(false);
      navigate(`/dashboard/sessions/${data.session_id}`);
    } else {
      toast.error("Failed to create session");
    }
  };

  const projectName = (path: string) => path.split("/").pop() || path;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-light mb-2">Sessions</h1>
            <p className="text-gray-600">Active Claude Code sessions</p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Session
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Session</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {projects.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 text-center">
                    No recent projects found
                  </p>
                ) : (
                  projects.map((project) => (
                    <button
                      key={project.path}
                      className="w-full text-left p-3 rounded-lg hover:bg-gray-100 transition-colors"
                      onClick={() => createSession(project.path)}
                    >
                      <div className="font-medium text-sm">
                        {projectName(project.path)}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {project.path}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-gray-400">Loading...</div>
        ) : sessions.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              <Terminal className="h-8 w-8 mx-auto mb-2 opacity-50" />
              No sessions yet. Create one to get started.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => (
              <Card
                key={session.session_id}
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() =>
                  navigate(`/dashboard/sessions/${session.session_id}`)
                }
              >
                <CardContent className="py-4 flex items-center gap-4">
                  <Terminal className="h-5 w-5 text-gray-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">
                      {projectName(session.directory)}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {session.directory}
                    </div>
                  </div>
                  <StatusBadge status={session.status} />
                  <span className="text-xs text-gray-400">
                    {new Date(session.created_at).toLocaleString()}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(session.session_id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-gray-400" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Sessions;
