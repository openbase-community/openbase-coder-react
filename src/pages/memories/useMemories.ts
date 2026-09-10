import { apiFetch } from "@/lib/api";
import { extractErrorMessage } from "@/lib/api-errors";
import { useCallback, useEffect, useState } from "react";

import type { MemoryEntry, MemorySection } from "./types";

export interface UseMemoriesResult {
  sections: MemorySection[];
  loading: boolean;
  setLoading: (loading: boolean) => void;
  listError: string | null;
  fetchMemories: () => Promise<void>;
}

/**
 * Owns the memories list data. In the global view the backend returns one
 * section per memory source (Codex global memories plus one per Claude Code
 * project); in the project view it returns a flat list that is wrapped into
 * a single section here so the page renders both shapes the same way.
 */
export function useMemories(listApiParams: string): UseMemoriesResult {
  const [sections, setSections] = useState<MemorySection[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const fetchMemories = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/memories/${listApiParams}`);
      if (!res.ok) {
        throw new Error(
          await extractErrorMessage(res, "Failed to load memories"),
        );
      }
      const data = await res.json();
      if (data.sections) {
        setSections(data.sections as MemorySection[]);
      } else {
        setSections([
          {
            key: "project",
            label: "Claude Code memories",
            agent: "claude",
            project_path: "",
            memories_dir: data.memories_dir ?? "",
            memories: (data.memories ?? []) as MemoryEntry[],
          },
        ]);
      }
      setListError(null);
    } catch (err) {
      setListError(
        err instanceof Error ? err.message : "Unable to reach the local API.",
      );
    }
    setLoading(false);
  }, [listApiParams]);

  useEffect(() => {
    void fetchMemories();
  }, [fetchMemories]);

  return { sections, loading, setLoading, listError, fetchMemories };
}
