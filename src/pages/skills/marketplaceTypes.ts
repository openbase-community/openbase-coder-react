export const marketplaceScopeLabels = {
  home: "Personal Codex",
  normal_claude: "Claude Code",
  openbase_codex: "Openbase Codex",
  openbase_claude: "Openbase Claude",
} as const;

export type MarketplaceScope = keyof typeof marketplaceScopeLabels;
export type InstalledTargetState = "not_installed" | "installed" | "conflict";

export interface MarketplaceSource {
  repository_url: string;
  commit: string;
  path: string;
  integrity: string | null;
}

export interface MarketplaceSkill {
  id: number;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  kind: "skill" | "mcp" | "cli";
  docs_url: string;
  install_notes: string;
  featured: boolean;
  featured_rank: number | null;
  install_count: number;
  source: MarketplaceSource | null;
  installable: boolean;
  installed_targets: Record<MarketplaceScope, InstalledTargetState>;
}

export interface MarketplaceRoutine {
  id: number;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  kind: "agent" | "command";
  prompt: string;
  command: string;
  command_timeout_seconds: number;
  schedule_type: "daily" | "interval";
  time: string | null;
  interval_seconds: number | null;
  use_client_timezone: boolean;
  suggested_timezone: string;
  required_skills: string[];
  install_count: number;
}

export interface MarketplaceCatalog<T> {
  categories: { name: string; count: number }[];
  entries: T[];
  read_only?: boolean;
}

export function availableInstallScopes(
  skill: MarketplaceSkill,
): MarketplaceScope[] {
  return (Object.keys(marketplaceScopeLabels) as MarketplaceScope[]).filter(
    (scope) => skill.installed_targets[scope] !== "conflict",
  );
}

export function installRequest(
  skill: MarketplaceSkill,
  targets: MarketplaceScope[],
) {
  if (!skill.source) throw new Error("This skill has no immutable source.");
  return {
    slug: skill.slug,
    commit: skill.source.commit,
    targets,
    confirmed: true as const,
  };
}
