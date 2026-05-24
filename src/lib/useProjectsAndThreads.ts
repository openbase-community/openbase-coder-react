import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { fetchProjectsAndThreads } from "@/lib/project-display";
import type { Project, ThreadInfo } from "@/types/session";

export const useProjectsAndThreads = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [threads, setThreads] = useState<ThreadInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const data = await fetchProjectsAndThreads(apiFetch);
    setProjects(data.projects);
    setThreads(data.threads);
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchData();
    const interval = window.setInterval(fetchData, 5000);
    return () => window.clearInterval(interval);
  }, [fetchData]);

  return { projects, threads, loading, fetchData };
};
