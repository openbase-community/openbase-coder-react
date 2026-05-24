import DashboardLayout from "@/components/layouts/ExampleLayout";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/contexts/auth";
import { projectName } from "@/lib/project-display";
import {
  DiffViewer,
  type Repository,
} from "multi-react";
import { useCallback, useEffect, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";

const DiffContent = ({ mobile }: { mobile?: boolean }) => {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const projectPath = searchParams.get("path");

  const fetchDiff = useCallback(async () => {
    setLoading(true);
    const url = projectPath
      ? `/api/git/diff/?path=${encodeURIComponent(projectPath)}`
      : "/api/git/diff/";
    const res = await apiFetch(url);
    if (res.ok) {
      const data = await res.json();
      setRepositories(data.repositories);
    }
    setLoading(false);
  }, [projectPath]);

  useEffect(() => {
    fetchDiff();
    const interval = setInterval(fetchDiff, 30000);
    return () => clearInterval(interval);
  }, [fetchDiff]);

  const title = projectPath ? projectName(projectPath) : "Git Diff";

  return (
    <DiffViewer
      repositories={repositories}
      loading={loading}
      title={title}
      onRefresh={fetchDiff}
      onBack={projectPath ? () => navigate("/dashboard/projects") : undefined}
      mobile={mobile}
    />
  );
};

const Diff = () => {
  const [searchParams] = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();
  const mobile = searchParams.get("mobile") === "true";

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (mobile) {
    return (
      <div className="h-screen min-h-0 flex flex-col overflow-hidden">
        <DiffContent mobile />
      </div>
    );
  }

  return (
    <DashboardLayout noPadding>
      <DiffContent />
    </DashboardLayout>
  );
};

export default Diff;
