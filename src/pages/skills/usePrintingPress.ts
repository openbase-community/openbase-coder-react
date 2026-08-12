import { apiFetch } from "@/lib/api";
import { extractErrorMessage } from "@/lib/api-errors";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import type { PrintingPressCatalog, PrintingPressEntry } from "./types";

export interface UsePrintingPressResult {
  catalog: PrintingPressCatalog | null;
  loading: boolean;
  query: string;
  setQuery: (query: string) => void;
  category: string;
  setCategory: (category: string) => void;
  selectedName: string;
  setSelectedName: (name: string) => void;
  selectedTargets: string[];
  toggleTarget: (target: string) => void;
  installingSkill: string;
  selectedEntry: PrintingPressEntry | null;
  installSkill: (entry: PrintingPressEntry) => Promise<void>;
}

/**
 * Owns the Printing Press catalog browsing state (search/category/selection),
 * fetching, and installing catalog skills. Only fetches while `active`.
 */
export function usePrintingPress(active: boolean): UsePrintingPressResult {
  const [catalog, setCatalog] = useState<PrintingPressCatalog | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const [selectedTargets, setSelectedTargets] = useState([
    "home",
    "openbase_codex",
    "openbase_claude",
  ]);
  const [installingSkill, setInstallingSkill] = useState("");

  const fetchCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (category) params.set("category", category);
      const suffix = params.toString() ? `?${params.toString()}` : "";
      const res = await apiFetch(`/api/skills/printing-press/catalog/${suffix}`);
      if (!res.ok) {
        throw new Error(
          await extractErrorMessage(res, "Failed to load Printing Press catalog"),
        );
      }
      const data: PrintingPressCatalog = await res.json();
      setCatalog(data);
      setSelectedName((current) => {
        if (current && data.entries.some((entry) => entry.name === current)) {
          return current;
        }
        return data.entries[0]?.name ?? "";
      });
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to load Printing Press catalog",
      );
    }
    setLoading(false);
  }, [category, query]);

  useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(() => {
      fetchCatalog();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [active, fetchCatalog]);

  const selectedEntry = useMemo(
    () =>
      catalog?.entries.find((entry) => entry.name === selectedName) ?? null,
    [catalog?.entries, selectedName],
  );

  const toggleTarget = useCallback((target: string) => {
    setSelectedTargets((current) =>
      current.includes(target)
        ? current.filter((item) => item !== target)
        : [...current, target],
    );
  }, []);

  const installSkill = useCallback(
    async (entry: PrintingPressEntry) => {
      setInstallingSkill(entry.name);
      try {
        const res = await apiFetch("/api/skills/printing-press/install/", {
          method: "POST",
          body: JSON.stringify({
            name: entry.name,
            targets: selectedTargets,
          }),
        });
        if (!res.ok) {
          throw new Error(
            await extractErrorMessage(
              res,
              `Failed to install /${entry.skill_name}`,
            ),
          );
        }
        const data = await res.json().catch(() => ({}));
        await fetchCatalog();
        const installed = Array.isArray(data.results)
          ? data.results.filter(
              (result: { status: string }) => result.status === "installed",
            ).length
          : 0;
        toast.success(
          installed > 0
            ? `Installed /${entry.skill_name}`
            : `/${entry.skill_name} was already installed`,
        );
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : `Failed to install /${entry.skill_name}`,
        );
      }
      setInstallingSkill("");
    },
    [selectedTargets, fetchCatalog],
  );

  return {
    catalog,
    loading,
    query,
    setQuery,
    category,
    setCategory,
    selectedName,
    setSelectedName,
    selectedTargets,
    toggleTarget,
    installingSkill,
    selectedEntry,
    installSkill,
  };
}
