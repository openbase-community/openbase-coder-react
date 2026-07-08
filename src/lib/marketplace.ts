import { apiFetch } from "@/lib/api";
import { extractErrorMessage } from "@/lib/api-errors";

export interface MarketplaceCategory {
  name: string;
  count: number;
}

export interface MarketplaceSkillEntry {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  kind: "skill" | "mcp" | "cli";
  repo_url: string;
  docs_url: string;
  install_notes: string;
  featured: boolean;
  featured_rank: number;
  install_count: number;
  installed: boolean;
}

export interface MarketplaceSkillsCatalog {
  source_url: string;
  categories: MarketplaceCategory[];
  entries: MarketplaceSkillEntry[];
}

export interface MarketplaceRequiredSkill {
  slug: string;
  name: string;
  kind: "skill" | "mcp" | "cli";
  installed: boolean;
  docs_url: string;
  install_notes: string;
}

export interface MarketplaceRoutineEntry {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  kind: "agent" | "command";
  prompt: string;
  command: string | null;
  command_timeout_seconds: number | null;
  schedule_type: "daily" | "interval";
  time: string;
  interval_seconds: number | null;
  use_client_timezone: boolean;
  suggested_timezone: string | null;
  install_count: number;
  installed: boolean;
  required_skills: MarketplaceRequiredSkill[];
}

export interface MarketplaceRoutinesCatalog {
  source_url: string;
  categories: MarketplaceCategory[];
  entries: MarketplaceRoutineEntry[];
}

export interface MarketplaceRoutineInstallResult {
  routine: Record<string, unknown>;
  installed_name: string;
  installed_skills: string[];
  manual_dependencies: MarketplaceRequiredSkill[];
}

const catalogSuffix = (q?: string, category?: string): string => {
  const params = new URLSearchParams();
  if (q?.trim()) params.set("q", q.trim());
  if (category) params.set("category", category);
  const query = params.toString();
  return query ? `?${query}` : "";
};

export const fetchMarketplaceSkillsCatalog = async (
  q?: string,
  category?: string,
): Promise<MarketplaceSkillsCatalog> => {
  const res = await apiFetch(
    `/api/marketplace/skills/catalog/${catalogSuffix(q, category)}`,
  );
  if (!res.ok) {
    throw new Error(
      await extractErrorMessage(res, "Failed to load the skills catalog"),
    );
  }
  return (await res.json()) as MarketplaceSkillsCatalog;
};

export const installMarketplaceSkill = async (slug: string): Promise<void> => {
  const res = await apiFetch("/api/marketplace/skills/install/", {
    method: "POST",
    body: JSON.stringify({ slug }),
  });
  if (!res.ok) {
    throw new Error(await extractErrorMessage(res, `Failed to install ${slug}`));
  }
};

export const fetchMarketplaceRoutinesCatalog = async (
  q?: string,
  category?: string,
): Promise<MarketplaceRoutinesCatalog> => {
  const res = await apiFetch(
    `/api/marketplace/routines/catalog/${catalogSuffix(q, category)}`,
  );
  if (!res.ok) {
    throw new Error(
      await extractErrorMessage(res, "Failed to load the routines marketplace"),
    );
  }
  return (await res.json()) as MarketplaceRoutinesCatalog;
};

export const installMarketplaceRoutine = async (
  slug: string,
  overrides: { name?: string; time?: string; timezone?: string },
): Promise<MarketplaceRoutineInstallResult> => {
  const res = await apiFetch("/api/marketplace/routines/install/", {
    method: "POST",
    body: JSON.stringify({ slug, overrides }),
  });
  if (!res.ok) {
    throw new Error(await extractErrorMessage(res, `Failed to install ${slug}`));
  }
  return (await res.json()) as MarketplaceRoutineInstallResult;
};

export const describeRoutineSchedule = (
  entry: Pick<
    MarketplaceRoutineEntry,
    "schedule_type" | "time" | "interval_seconds"
  >,
): string => {
  if (entry.schedule_type === "interval") {
    const seconds = entry.interval_seconds ?? 60;
    if (seconds % 3600 === 0) {
      const hours = seconds / 3600;
      return `Every ${hours} hour${hours === 1 ? "" : "s"}`;
    }
    if (seconds % 60 === 0) {
      const minutes = seconds / 60;
      return `Every ${minutes} minute${minutes === 1 ? "" : "s"}`;
    }
    return `Every ${seconds} seconds`;
  }
  return `Daily at ${entry.time}`;
};
