export interface SkillEntry {
  name: string;
  path: string;
  dir_path?: string;
  source_path?: string;
  source_dir_path?: string;
}

export interface SkillSection {
  key: string;
  label: string;
  skills_dir: string;
  skills: SkillEntry[];
}

export interface AutoLinkSyncResult {
  created: number;
  already_linked: number;
  conflicts: number;
  errors: number;
  results: Array<{
    name: string;
    status: string;
    error?: string;
  }>;
}

export interface AutoLinkSettings {
  auto_link_personal_skills: boolean;
  personal_skills_dir: string;
  normal_claude_skills_dir?: string;
  openbase_codex_skills_dir: string;
  openbase_claude_skills_dir?: string;
  sync: AutoLinkSyncResult | null;
}

export interface PrintingPressCategory {
  name: string;
  count: number;
}

export interface PrintingPressEntry {
  name: string;
  skill_name: string;
  category: string;
  api: string;
  description: string;
  path: string;
  release: {
    cli_name: string;
    version: string;
    released_at: string;
  };
  printer: string;
  printer_name: string;
  creator: {
    handle: string;
    name: string;
  };
  installed_targets: Record<string, boolean>;
  mcp?: {
    binary: string;
    transports: string[];
    tool_count: number;
    public_tool_count: number;
    auth_type: string;
    env_vars: string[];
    mcp_ready: string;
    spec_format: string;
  };
}

export interface PrintingPressCatalog {
  schema_version: number;
  source_url: string;
  categories: PrintingPressCategory[];
  entries: PrintingPressEntry[];
}

export const printingPressTargets = [
  { key: "home", label: "Personal" },
  { key: "openbase_codex", label: "Openbase Codex" },
  { key: "openbase_claude", label: "Openbase Claude" },
];
