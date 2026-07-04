import DashboardLayout from "@/components/layouts/DashboardLayout";
import { apiFetch } from "@/lib/api";
import { extractErrorMessage } from "@/lib/api-errors";
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
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const projectPath = searchParams.get("path");

  const fetchDiff = useCallback(async () => {
    setLoading(true);
    // Polled every 30s: failures set a persistent inline banner (no toast per tick).
    try {
      const url = projectPath
        ? `/api/git/diff/?path=${encodeURIComponent(projectPath)}`
        : "/api/git/diff/";
      const res = await apiFetch(url);
      if (!res.ok) {
        throw new Error(await extractErrorMessage(res, "Failed to load git diff"));
      }
      const data = await res.json();
      setRepositories(data.repositories);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to reach the local API.",
      );
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
    <div className="flex h-full min-h-0 flex-col">
      {error ? (
        <div className="border-b border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
          {error} — retrying automatically.
        </div>
      ) : null}
      <div className="min-h-0 flex-1">
        <DiffViewer
          repositories={repositories}
          loading={loading}
          title={title}
          onRefresh={fetchDiff}
          onBack={projectPath ? () => navigate("/dashboard/projects") : undefined}
          mobile={mobile}
        />
      </div>
    </div>
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
