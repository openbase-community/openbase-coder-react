import { apiFetch } from "@/lib/api";
import { extractErrorMessage } from "@/lib/api-errors";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  installRequest,
  type MarketplaceCatalog,
  type MarketplaceRoutine,
  type MarketplaceScope,
  type MarketplaceSkill,
} from "./marketplaceTypes";

export function useMarketplaceCatalog(kind: "skills" | "routines") {
  const [data, setData] = useState<MarketplaceCatalog<
    MarketplaceSkill | MarketplaceRoutine
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (category) params.set("category", category);
    const suffix = params.size ? `?${params}` : "";
    try {
      const response = await apiFetch(`/api/marketplace/${kind}/${suffix}`);
      if (!response.ok) {
        throw new Error(
          await extractErrorMessage(response, `Failed to load ${kind}`),
        );
      }
      setData(await response.json());
      setError(null);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to reach the local API.",
      );
    } finally {
      setLoading(false);
    }
  }, [category, kind, query]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => void refresh(),
      query.trim() ? 250 : 0,
    );
    return () => window.clearTimeout(timer);
  }, [refresh]);

  return {
    data,
    loading,
    error,
    query,
    setQuery,
    category,
    setCategory,
    refresh,
  };
}

export async function installMarketplaceSkill(
  skill: MarketplaceSkill,
  targets: MarketplaceScope[],
): Promise<void> {
  const response = await apiFetch("/api/marketplace/skills/install/", {
    method: "POST",
    body: JSON.stringify(installRequest(skill, targets)),
  });
  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(response, `Failed to install /${skill.slug}`),
    );
  }
  toast.success(`Installed /${skill.slug}`);
}
