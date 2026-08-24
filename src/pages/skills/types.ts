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
  codex_skills_dir: string;
  claude_skills_dir: string;
  sync: AutoLinkSyncResult | null;
}
