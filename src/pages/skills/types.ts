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
