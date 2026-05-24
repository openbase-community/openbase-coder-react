import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { THREAD_LIST_REFRESH_INTERVAL_MS } from "@/lib/polling";
import {
  fetchProjectPage,
  fetchProjectStatuses,
  fetchThreadPage,
} from "@/lib/project-display";
import type { Project, ThreadInfo } from "@/types/session";

export const useProjectsAndThreads = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [threads, setThreads] = useState<ThreadInfo[]>([]);
  const [totalThreadCount, setTotalThreadCount] = useState(0);
  const [totalProjectCount, setTotalProjectCount] = useState(0);
  const [nextThreadsUrl, setNextThreadsUrl] = useState<string | null>(null);
  const [nextProjectsUrl, setNextProjectsUrl] = useState<string | null>(null);
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [loadingMoreThreads, setLoadingMoreThreads] = useState(false);
  const [loadingMoreProjects, setLoadingMoreProjects] = useState(false);

  const mergeProjectUpdates = useCallback((updates: Project[]) => {
    if (updates.length === 0) return;
    setProjects((current) => {
      const byPath = new Map(updates.map((project) => [project.path, project]));
      return current.map((project) => ({
        ...project,
        ...(byPath.get(project.path) ?? {}),
      }));
    });
  }, []);

  const refreshProjectStatuses = useCallback(
    async (items: Project[]) => {
      const updates = await fetchProjectStatuses(
        apiFetch,
        items.map((project) => project.path),
      );
      mergeProjectUpdates(updates);
    },
    [mergeProjectUpdates],
  );

  const fetchThreads = useCallback(async () => {
    try {
      const page = await fetchThreadPage(apiFetch);
      setThreads(page.threads);
      setTotalThreadCount(page.count);
      setNextThreadsUrl(page.next);
    } finally {
      setThreadsLoading(false);
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      const page = await fetchProjectPage(apiFetch);
      setProjects(page.projects);
      setTotalProjectCount(page.count);
      setNextProjectsUrl(page.next);
      void refreshProjectStatuses(page.projects);
    } finally {
      setProjectsLoading(false);
    }
  }, [refreshProjectStatuses]);

  const fetchData = useCallback(async () => {
    await Promise.all([fetchThreads(), fetchProjects()]);
  }, [fetchProjects, fetchThreads]);

  const loadMoreThreads = useCallback(async () => {
    if (!nextThreadsUrl || loadingMoreThreads) return;

    setLoadingMoreThreads(true);
    try {
      const page = await fetchThreadPage(apiFetch, nextThreadsUrl);
      setThreads((current) => {
        const seen = new Set(current.map((thread) => thread.thread_id));
        return [
          ...current,
          ...page.threads.filter((thread) => !seen.has(thread.thread_id)),
        ];
      });
      setTotalThreadCount(page.count);
      setNextThreadsUrl(page.next);
    } finally {
      setLoadingMoreThreads(false);
    }
  }, [loadingMoreThreads, nextThreadsUrl]);

  const loadMoreProjects = useCallback(async () => {
    if (!nextProjectsUrl || loadingMoreProjects) return;

    setLoadingMoreProjects(true);
    try {
      const page = await fetchProjectPage(apiFetch, nextProjectsUrl);
      setProjects((current) => {
        const seen = new Set(current.map((project) => project.path));
        return [
          ...current,
          ...page.projects.filter((project) => !seen.has(project.path)),
        ];
      });
      setTotalProjectCount(page.count);
      setNextProjectsUrl(page.next);
      void refreshProjectStatuses(page.projects);
    } finally {
      setLoadingMoreProjects(false);
    }
  }, [loadingMoreProjects, nextProjectsUrl, refreshProjectStatuses]);

  useEffect(() => {
    void fetchData();
    const interval = window.setInterval(
      fetchData,
      THREAD_LIST_REFRESH_INTERVAL_MS,
    );
    return () => window.clearInterval(interval);
  }, [fetchData]);

  return {
    projects,
    threads,
    totalThreadCount,
    totalProjectCount,
    nextThreadsUrl,
    nextProjectsUrl,
    loading: threadsLoading,
    threadsLoading,
    projectsLoading,
    loadingMoreThreads,
    loadingMoreProjects,
    fetchData,
    fetchThreads,
    fetchProjects,
    loadMoreThreads,
    loadMoreProjects,
  };
};
