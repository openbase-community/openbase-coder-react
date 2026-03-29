import DashboardLayout from "@/components/layouts/ExampleLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import type { Project, ServiceStatus, SessionInfo } from "@/types/session";
import { Activity, FolderOpen, Terminal } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [services, setServices] = useState<Record<string, ServiceStatus>>({});

  const fetchData = useCallback(async () => {
    const [sessRes, projRes, statusRes] = await Promise.all([
      apiFetch("/api/sessions/"),
      apiFetch("/api/projects/recent/"),
      apiFetch("/api/status/"),
    ]);
    if (sessRes.ok) {
      const data = await sessRes.json();
      setSessions(data.sessions);
    }
    if (projRes.ok) {
      const data = await projRes.json();
      setProjects(data.projects);
    }
    if (statusRes.ok) {
      const data = await statusRes.json();
      setServices(data.services);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const activeSessions = sessions.filter((s) => s.status === "running");
  const runningServices = Object.values(services).filter((s) => s.running);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-light mb-2">Dashboard</h1>
          <p className="text-gray-600">Openbase Coder overview</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card
            className="cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => navigate("/dashboard/sessions")}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Active Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Terminal className="h-8 w-8 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">
                    {activeSessions.length}
                  </div>
                  <div className="text-xs text-gray-500">
                    {sessions.length} total
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => navigate("/dashboard/projects")}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Recent Projects
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <FolderOpen className="h-8 w-8 text-orange-500" />
                <div className="text-2xl font-bold">{projects.length}</div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => navigate("/dashboard/status")}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Services
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Activity className="h-8 w-8 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">
                    {runningServices.length}
                  </div>
                  <div className="text-xs text-gray-500">
                    of {Object.keys(services).length} running
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
