import type { SkillEntry, SkillSection } from "./types";

/**
 * Sections to render for the current scope. In global (non-project) mode the
 * server returns explicit sections; otherwise fall back to a single "home"
 * section built from the flat skills list.
 */
export function computeVisibleSections(
  projectPath: string,
  sections: SkillSection[],
  skills: SkillEntry[],
  skillsDir: string,
): SkillSection[] {
  return !projectPath && sections.length > 0
    ? sections
    : [
        {
          key: "home",
          label: "Skills",
          skills_dir: skillsDir,
          skills,
        },
      ];
}

export function sectionsByKeyFrom(
  sections: SkillSection[],
): Record<string, SkillSection> {
  return Object.fromEntries(sections.map((section) => [section.key, section]));
}

export function scopeName(
  scope: string,
  sectionsByKey: Record<string, SkillSection>,
): string {
  return (
    sectionsByKey[scope]?.label ??
    (scope === "home"
      ? "Personal"
      : scope === "openbase_codex"
        ? "Openbase Codex"
        : scope === "normal_claude"
          ? "Claude Code"
          : scope)
  );
}

export function scopeButtonLabel(
  scope: string,
  sectionsByKey: Record<string, SkillSection>,
): string {
  return scope === "home"
    ? "Personal"
    : scope === "normal_claude"
      ? "Claude Code"
      : scope === "openbase_codex"
        ? "Codex"
        : scope === "openbase_claude"
          ? "Claude"
          : scopeName(scope, sectionsByKey);
}

export function skillDirForComparison(skill: SkillEntry): string {
  return (
    skill.source_dir_path ||
    skill.dir_path ||
    skill.path.replace(/\/SKILL\.md$/, "")
  );
}
