import DashboardLayout from "@/components/layouts/DashboardLayout";
import OfficialCatalogTab from "@/pages/skills/OfficialCatalogTab";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { extractErrorMessage } from "@/lib/api-errors";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

interface SkillEntry {
  name: string;
  path: string;
  dir_path?: string;
  source_path?: string;
  source_dir_path?: string;
}

interface SkillSection {
  key: string;
  label: string;
  skills_dir: string;
  skills: SkillEntry[];
}

interface AutoLinkSyncResult {
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

interface AutoLinkSettings {
  auto_link_personal_skills: boolean;
  personal_skills_dir: string;
  openbase_codex_skills_dir: string;
  sync: AutoLinkSyncResult | null;
}

const Skills = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const projectPath = searchParams.get("path") || "";
  const editingSkill = searchParams.get("skill") || "";
  const editingScope = searchParams.get("scope") || "home";
  const [activeView, setActiveView] = useState<"installed" | "official">(
    "installed",
  );

  const [skills, setSkills] = useState<SkillEntry[]>([]);
  const [sections, setSections] = useState<SkillSection[]>([]);
  const [skillsDir, setSkillsDir] = useState("");
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({});
  const [syncingSkill, setSyncingSkill] = useState("");
  const [autoLinkSettings, setAutoLinkSettings] =
    useState<AutoLinkSettings | null>(null);
  const [autoLinkSync, setAutoLinkSync] = useState<AutoLinkSyncResult | null>(
    null,
  );
  const [savingAutoLink, setSavingAutoLink] = useState(false);

  const [content, setContent] = useState("");
  const [filePath, setFilePath] = useState("");
  const [sourcePath, setSourcePath] = useState("");
  const [saving, setSaving] = useState(false);
  const [editorLoading, setEditorLoading] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);

  const listApiParams = projectPath
    ? `?path=${encodeURIComponent(projectPath)}`
    : "";

  const detailApiParams = (() => {
    const params = new URLSearchParams();
    if (projectPath) params.set("path", projectPath);
    else if (editingScope !== "home") params.set("scope", editingScope);
    const query = params.toString();
    return query ? `?${query}` : "";
  })();

  const fetchSkills = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/skills/${listApiParams}`);
      if (!res.ok) {
        throw new Error(await extractErrorMessage(res, "Failed to load skills"));
      }
      const data = await res.json();
      setSkills(data.skills);
      setSections(data.sections ?? []);
      setSkillsDir(data.skills_dir);
      setAutoLinkSettings(data.auto_link_personal_skills ?? null);
      setAutoLinkSync(data.auto_link_personal_skills_sync ?? null);
      setListError(null);
    } catch (err) {
      setListError(
        err instanceof Error ? err.message : "Unable to reach the local API.",
      );
    }
    setLoading(false);
  }, [listApiParams]);

  useEffect(() => {
    void fetchSkills();
  }, [fetchSkills]);

  useEffect(() => {
    if (!editingSkill) return;
    setEditorLoading(true);
    setEditorError(null);
    const loadSkill = async () => {
      try {
        const res = await apiFetch(
          `/api/skills/${encodeURIComponent(editingSkill)}/${detailApiParams}`,
        );
        if (!res.ok) {
          throw new Error(
            await extractErrorMessage(res, `Failed to load /${editingSkill}`),
          );
        }
        const data = await res.json();
        setContent(data.content);
        setFilePath(data.path);
        setSourcePath(data.source_path ?? "");
      } catch (err) {
        setEditorError(
          err instanceof Error ? err.message : "Unable to reach the local API.",
        );
      }
      setEditorLoading(false);
    };
    void loadSkill();
  }, [editingSkill, detailApiParams]);

  const openSkill = (name: string, scope = "home") => {
    const params = new URLSearchParams(searchParams);
    params.set("skill", name);
    if (!projectPath && scope !== "home") params.set("scope", scope);
    else params.delete("scope");
    setSearchParams(params);
  };

  const toggleSection = (sectionKey: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  const backToList = () => {
    const params = new URLSearchParams(searchParams);
    params.delete("skill");
    params.delete("scope");
    setSearchParams(params);
  };

  const createSkill = async () => {
    const trimmed = newName.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
    if (!trimmed) return;
    try {
      const res = await apiFetch(`/api/skills/${listApiParams}`, {
        method: "POST",
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        throw new Error(await extractErrorMessage(res, "Failed to create skill"));
      }
      setNewName("");
      await fetchSkills();
      openSkill(trimmed);
      toast.success(`Skill '${trimmed}' created`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create skill");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiFetch(
        `/api/skills/${encodeURIComponent(editingSkill)}/${detailApiParams}`,
        { method: "PUT", body: JSON.stringify({ content }) },
      );
      if (!res.ok) {
        throw new Error(await extractErrorMessage(res, "Failed to save"));
      }
      toast.success("Saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    try {
      const res = await apiFetch(
        `/api/skills/${encodeURIComponent(editingSkill)}/${detailApiParams}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        throw new Error(await extractErrorMessage(res, "Failed to delete"));
      }
      toast.success(`Deleted /${editingSkill}`);
      backToList();
      void fetchSkills();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const linkSkill = async (
    skill: SkillEntry,
    sourceScope: string,
    targetScope: string,
  ) => {
    const operationId = `${sourceScope}:${targetScope}:${skill.name}`;
    setSyncingSkill(operationId);
    try {
      const res = await apiFetch("/api/skills/symlink/", {
        method: "POST",
        body: JSON.stringify({
          name: skill.name,
          source_scope: sourceScope,
          target_scope: targetScope,
        }),
      });
      if (!res.ok) {
        throw new Error(await extractErrorMessage(res, "Failed to link skill"));
      }
      const data = await res.json();
      await fetchSkills();
      toast.success(
        data.created
          ? `Linked /${skill.name}`
          : `/${skill.name} was already linked`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to link skill");
    }
    setSyncingSkill("");
  };

  const updateAutoLinkSetting = async (enabled: boolean) => {
    setSavingAutoLink(true);
    try {
      const res = await apiFetch("/api/skills/auto-link-personal/", {
        method: "PATCH",
        body: JSON.stringify({ auto_link_personal_skills: enabled }),
      });
      if (!res.ok) {
        throw new Error(
          await extractErrorMessage(res, "Failed to update auto-link setting"),
        );
      }
      const data = await res.json();
      setAutoLinkSettings(data);
      setAutoLinkSync(data.sync ?? null);
      await fetchSkills();
      if (enabled) {
        const sync = data.sync as AutoLinkSyncResult | null;
        toast.success(
          sync?.created
            ? `Auto-linked ${sync.created} skill${sync.created === 1 ? "" : "s"}`
            : "Auto-link is enabled",
        );
      } else {
        toast.success("Auto-link is disabled");
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update auto-link setting",
      );
    }
    setSavingAutoLink(false);
  };

  const runAutoLinkSync = async () => {
    setSavingAutoLink(true);
    try {
      const res = await apiFetch("/api/skills/auto-link-personal/", {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error(
          await extractErrorMessage(res, "Failed to scan personal skills"),
        );
      }
      const data = await res.json();
      setAutoLinkSettings(data);
      setAutoLinkSync(data.sync ?? null);
      await fetchSkills();
      const sync = data.sync as AutoLinkSyncResult | null;
      toast.success(
        sync?.created
          ? `Auto-linked ${sync.created} skill${sync.created === 1 ? "" : "s"}`
          : "Auto-link scan complete",
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to scan personal skills",
      );
    }
    setSavingAutoLink(false);
  };

  const scopeLabel = projectPath ? projectPath.split("/").pop() : "global";
  const visibleSections =
    !projectPath && sections.length > 0
      ? sections
      : [
          {
            key: "home",
            label: "Skills",
            skills_dir: skillsDir,
            skills,
          },
        ];
  const totalSkills = visibleSections.reduce(
    (count, section) => count + section.skills.length,
    0,
  );
  const sectionsByKey = Object.fromEntries(
    visibleSections.map((section) => [section.key, section]),
  );
  const targetScopesFor = (scope: string) =>
    projectPath
      ? []
      : visibleSections
          .map((section) => section.key)
          .filter((sectionKey) => sectionKey !== scope);
  const scopeName = (scope: string) =>
    sectionsByKey[scope]?.label ??
    (scope === "home"
      ? "Personal"
      : scope === "openbase_codex"
        ? "Openbase Codex"
        : scope);
  const scopeButtonLabel = (scope: string) =>
    scope === "home"
      ? "Personal"
      : scope === "openbase_codex"
        ? "Codex"
        : scope === "openbase_claude"
          ? "Claude"
          : scopeName(scope);
  const skillDirForComparison = (skill: SkillEntry) =>
    skill.source_dir_path || skill.dir_path || skill.path.replace(/\/SKILL\.md$/, "");

  if (editingSkill) {
    return (
      <DashboardLayout>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <button
              onClick={backToList}
              className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-surface-muted hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
            <h1 className="font-mono text-sm font-medium text-foreground">
              /{editingSkill}
            </h1>
            {!projectPath && editingScope !== "home" ? (
              <span className="rounded bg-surface-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                {editingScope === "openbase_claude"
                  ? "openbase claude"
                  : "openbase codex"}
              </span>
            ) : null}
            <span className="font-mono text-[11px] text-muted-foreground/70">
              {filePath}
            </span>
          </div>

          {sourcePath ? (
            <div className="rounded border border-border bg-surface px-3 py-2">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Source
              </div>
              <div className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                {sourcePath}
              </div>
            </div>
          ) : null}

          <div className="overflow-hidden rounded border border-border bg-surface">
            {editorLoading ? (
              <div className="flex h-72 items-center justify-center text-[12px] text-muted-foreground">
                Loading…
              </div>
            ) : editorError ? (
              <div className="flex h-72 items-center justify-center px-4 text-center text-[12px] text-destructive">
                {editorError}
              </div>
            ) : (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="h-[26rem] w-full resize-y bg-transparent p-3 font-mono text-[12.5px] leading-relaxed text-foreground focus:outline-none"
                placeholder={`---\nname: ${editingSkill}\ndescription: What this skill does\n---\n\nYour skill instructions…`}
              />
            )}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={saving || editorLoading || editorError !== null}
              size="sm"
              className="h-7 px-2.5 text-[12px]"
            >
              <Save className="h-3 w-3" />
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={editorLoading}
              className="h-7 px-2.5 text-[12px] text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold tracking-tight text-foreground">
              Skills
            </h1>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {scopeLabel}
            </p>
          </div>
          <div className="flex gap-1">
            <Button
              variant={activeView === "installed" ? "default" : "outline"}
              size="sm"
              className="h-7 px-2.5 text-[12px]"
              onClick={() => setActiveView("installed")}
            >
              Installed
            </Button>
            {!projectPath ? (
              <Button
                variant={activeView === "official" ? "default" : "outline"}
                size="sm"
                className="h-7 px-2.5 text-[12px]"
                onClick={() => setActiveView("official")}
              >
                Official catalog
              </Button>
            ) : null}
            <Button
              variant={projectPath ? "outline" : "default"}
              size="sm"
              className="h-7 px-2.5 text-[12px]"
              onClick={() => setSearchParams(new URLSearchParams())}
            >
              global
            </Button>
            {projectPath ? (
              <Button size="sm" className="h-7 px-2.5 text-[12px]">
                {projectPath.split("/").pop()}
              </Button>
            ) : null}
          </div>
        </div>

        {activeView === "official" && !projectPath ? (
          <OfficialCatalogTab />
        ) : (
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
              <div className="flex items-center justify-between gap-3 rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
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
              </div>
            ) : null}

            {loading ? (
              <div className="text-[12px] text-muted-foreground">Loading…</div>
            ) : (
              <div className="space-y-3">
                {!projectPath && autoLinkSettings ? (
                  <div className="rounded border border-border bg-surface px-3 py-2">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <label className="flex min-w-0 items-center gap-2">
                        <Checkbox
                          checked={autoLinkSettings.auto_link_personal_skills}
                          disabled={savingAutoLink}
                          onCheckedChange={(checked) =>
                            updateAutoLinkSetting(checked === true)
                          }
                        />
                        <span className="min-w-0">
                          <span className="block text-[13px] font-medium text-foreground">
                            Auto-link personal skills
                          </span>
                          <span className="block truncate text-[11.5px] text-muted-foreground">
                            Symlink personal skills into the Openbase Codex and
                            Claude homes when this page refreshes.
                          </span>
                        </span>
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2.5 text-[12px]"
                        disabled={savingAutoLink}
                        onClick={runAutoLinkSync}
                      >
                        {savingAutoLink ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3 w-3" />
                        )}
                        Scan now
                      </Button>
                    </div>
                    {autoLinkSync ? (
                      <div className="mt-2 flex flex-wrap gap-1.5 text-[10.5px]">
                        <Badge variant="secondary">
                          linked {autoLinkSync.created}
                        </Badge>
                        <Badge variant="outline">
                          already linked {autoLinkSync.already_linked}
                        </Badge>
                        {autoLinkSync.conflicts ? (
                          <Badge
                            variant="outline"
                            className="border-warning/40 text-warning"
                          >
                            conflicts {autoLinkSync.conflicts}
                          </Badge>
                        ) : null}
                        {autoLinkSync.errors ? (
                          <Badge
                            variant="outline"
                            className="border-destructive/40 text-destructive"
                          >
                            errors {autoLinkSync.errors}
                          </Badge>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
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
                    <div
                      key={section.key}
                      className="overflow-hidden rounded border border-border bg-surface"
                    >
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
                                          {scopeButtonLabel(targetScope)} linked
                                        </span>
                                      );
                                    }
                                    if (hasTargetConflict) {
                                      return (
                                        <span
                                          key={targetScope}
                                          className="max-w-[8rem] truncate rounded bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-warning"
                                          title={`A separate /${skill.name} exists in ${scopeName(targetScope)}`}
                                        >
                                          {scopeButtonLabel(targetScope)} exists
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
                                        title={`Symlink into ${scopeName(targetScope)}`}
                                      >
                                        <Link2 className="h-3 w-3" />
                                        {scopeButtonLabel(targetScope)}
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
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Skills;
