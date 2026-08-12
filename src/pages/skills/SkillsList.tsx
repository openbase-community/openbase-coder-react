import { Button } from "@/components/ui/button";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import {
  ChevronDown,
  ChevronRight,
  Link2,
  Plus,
  RefreshCw,
  Zap,
} from "lucide-react";

import { AutoLinkSettings } from "./AutoLinkSettings";
import { scopeButtonLabel, scopeName, skillDirForComparison } from "./scopes";
import type {
  AutoLinkSettings as AutoLinkSettingsData,
  AutoLinkSyncResult,
  SkillEntry,
  SkillSection,
} from "./types";

interface SkillsListProps {
  projectPath: string;
  openSkill: (name: string, scope?: string) => void;
  visibleSections: SkillSection[];
  sectionsByKey: Record<string, SkillSection>;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  listError: string | null;
  fetchSkills: () => Promise<void>;
  newName: string;
  setNewName: (name: string) => void;
  createSkill: () => void;
  syncingSkill: string;
  linkSkill: (
    skill: SkillEntry,
    sourceScope: string,
    targetScope: string,
  ) => void;
  autoLinkSettings: AutoLinkSettingsData | null;
  autoLinkSync: AutoLinkSyncResult | null;
  savingAutoLink: boolean;
  updateAutoLinkSetting: (enabled: boolean) => void;
  runAutoLinkSync: () => void;
  collapsedSections: Record<string, boolean>;
  toggleSection: (sectionKey: string) => void;
}

export function SkillsList({
  projectPath,
  openSkill,
  visibleSections,
  sectionsByKey,
  loading,
  setLoading,
  listError,
  fetchSkills,
  newName,
  setNewName,
  createSkill,
  syncingSkill,
  linkSkill,
  autoLinkSettings,
  autoLinkSync,
  savingAutoLink,
  updateAutoLinkSetting,
  runAutoLinkSync,
  collapsedSections,
  toggleSection,
}: SkillsListProps) {
  const totalSkills = visibleSections.reduce(
    (count, section) => count + section.skills.length,
    0,
  );
  const targetScopesFor = (scope: string) =>
    projectPath
      ? []
      : visibleSections
          .map((section) => section.key)
          .filter((sectionKey) => sectionKey !== scope);

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          createSkill();
        }}
        className="flex gap-1.5"
      >
        <Input
          placeholder="new-skill-name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="h-7 flex-1 font-mono text-[12.5px]"
        />
        <Button
          onClick={createSkill}
          disabled={!newName.trim()}
          size="sm"
          className="h-7 px-2.5 text-[12px]"
        >
          <Plus className="h-3 w-3" />
          Create
        </Button>
      </form>

      {listError ? (
        <ErrorBanner className="flex items-center justify-between gap-3">
          <span className="min-w-0">{listError}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-6 shrink-0 px-2 text-[11px]"
            onClick={() => {
              setLoading(true);
              void fetchSkills();
            }}
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </Button>
        </ErrorBanner>
      ) : null}

      {loading ? (
        <div className="text-[12px] text-muted-foreground">Loading…</div>
      ) : (
        <div className="space-y-3">
          {!projectPath && autoLinkSettings ? (
            <AutoLinkSettings
              settings={autoLinkSettings}
              sync={autoLinkSync}
              saving={savingAutoLink}
              onToggle={updateAutoLinkSetting}
              onScan={runAutoLinkSync}
            />
          ) : null}

          {totalSkills === 0 ? (
            <div className="rounded border border-dashed border-border bg-surface px-4 py-6 text-center">
              <Zap className="mx-auto h-4 w-4 text-muted-foreground/40" />
              <p className="mt-2 text-[12px] text-muted-foreground">
                No skills yet.
              </p>
            </div>
          ) : null}
          {visibleSections.map((section) => {
            const collapsed = !!collapsedSections[section.key];
            return (
              <Panel key={section.key}>
                <button
                  type="button"
                  onClick={() => toggleSection(section.key)}
                  className="flex w-full items-center gap-2 border-b border-border px-3 py-2 text-left transition-colors hover:bg-surface-muted"
                  aria-expanded={!collapsed}
                >
                  {collapsed ? (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-foreground">
                      {section.label}
                    </div>
                    <div className="truncate font-mono text-[10.5px] text-muted-foreground/70">
                      {section.skills_dir}
                    </div>
                  </div>
                </button>
                {!collapsed ? (
                  section.skills.length === 0 ? (
                    <div className="px-3 py-4 text-[12px] text-muted-foreground">
                      No skills in this location.
                    </div>
                  ) : (
                    section.skills.map((skill, idx) => {
                      const skillPath = skill.source_path || skill.path;
                      const sourceDir = skillDirForComparison(skill);
                      const targetScopes = targetScopesFor(section.key);
                      return (
                        <div
                          key={`${section.key}:${skill.name}`}
                          className={`group grid w-full grid-cols-[minmax(6.5rem,11rem)_minmax(0,1fr)_auto] items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-surface-muted sm:grid-cols-[minmax(8rem,14rem)_minmax(0,1fr)_auto] ${
                            idx > 0 ? "border-t border-border" : ""
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => openSkill(skill.name, section.key)}
                            className="flex min-w-0 items-center gap-2 text-left"
                          >
                            <Zap className="h-3 w-3 shrink-0 text-muted-foreground" />
                            <span className="truncate font-mono text-[12.5px] font-medium text-foreground">
                              /{skill.name}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openSkill(skill.name, section.key)}
                            className="min-w-0 truncate text-left font-mono text-[11px] text-muted-foreground/70 [direction:rtl] [unicode-bidi:plaintext]"
                            title={skillPath}
                          >
                            {skillPath}
                          </button>
                          <div className="flex items-center justify-end gap-1.5">
                            {targetScopes.map((targetScope) => {
                              const targetSection = sectionsByKey[targetScope];
                              const targetSkill = targetSection?.skills.find(
                                (item) => item.name === skill.name,
                              );
                              const targetSourceDir = targetSkill
                                ? skillDirForComparison(targetSkill)
                                : "";
                              const alreadyLinked =
                                !!targetSkill &&
                                !!targetSkill.source_dir_path &&
                                targetSourceDir === sourceDir;
                              const hasTargetConflict =
                                !!targetSkill && !alreadyLinked;
                              const operationId = `${section.key}:${targetScope}:${skill.name}`;
                              if (alreadyLinked) {
                                return (
                                  <span
                                    key={targetScope}
                                    className="rounded bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-success"
                                  >
                                    {scopeButtonLabel(targetScope, sectionsByKey)}{" "}
                                    linked
                                  </span>
                                );
                              }
                              if (hasTargetConflict) {
                                return (
                                  <span
                                    key={targetScope}
                                    className="max-w-[8rem] truncate rounded bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-warning"
                                    title={`A separate /${skill.name} exists in ${scopeName(targetScope, sectionsByKey)}`}
                                  >
                                    {scopeButtonLabel(targetScope, sectionsByKey)}{" "}
                                    exists
                                  </span>
                                );
                              }
                              return (
                                <Button
                                  key={targetScope}
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-6 gap-1 px-2 text-[11px]"
                                  disabled={syncingSkill === operationId}
                                  onClick={() =>
                                    linkSkill(skill, section.key, targetScope)
                                  }
                                  title={`Symlink into ${scopeName(targetScope, sectionsByKey)}`}
                                >
                                  <Link2 className="h-3 w-3" />
                                  {scopeButtonLabel(targetScope, sectionsByKey)}
                                </Button>
                              );
                            })}
                            <button
                              type="button"
                              onClick={() => openSkill(skill.name, section.key)}
                              className="flex h-6 w-5 items-center justify-center rounded text-muted-foreground/40 hover:bg-surface hover:text-foreground"
                              aria-label={`Open ${skill.name}`}
                            >
                              <ChevronRight className="h-3 w-3 shrink-0" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )
                ) : null}
              </Panel>
            );
          })}
        </div>
      )}
    </>
  );
}
