import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { extractErrorMessage } from "@/lib/api-errors";
import { officialSkillsCatalog } from "@/lib/official-skills-catalog";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  Link2,
  Loader2,
  LockKeyhole,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  normal_claude_skills_dir?: string;
  openbase_codex_skills_dir: string;
  openbase_claude_skills_dir?: string;
  sync: AutoLinkSyncResult | null;
}

interface PrintingPressCategory {
  name: string;
  count: number;
}

interface PrintingPressEntry {
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

interface PrintingPressCatalog {
  schema_version: number;
  source_url: string;
  categories: PrintingPressCategory[];
  entries: PrintingPressEntry[];
}

const printingPressTargets = [
  { key: "home", label: "Personal" },
  { key: "openbase_codex", label: "Openbase Codex" },
  { key: "openbase_claude", label: "Openbase Claude" },
];

const Skills = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const projectPath = searchParams.get("path") || "";
  const editingSkill = searchParams.get("skill") || "";
  const editingScope = searchParams.get("scope") || "home";
  const [activeView, setActiveView] = useState<
    "official" | "installed" | "printing-press"
  >(projectPath ? "installed" : "official");

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
  const [printingPressCatalog, setPrintingPressCatalog] =
    useState<PrintingPressCatalog | null>(null);
  const [printingPressLoading, setPrintingPressLoading] = useState(false);
  const [printingPressQuery, setPrintingPressQuery] = useState("");
  const [printingPressCategory, setPrintingPressCategory] = useState("");
  const [selectedPrintingPressName, setSelectedPrintingPressName] = useState("");
  const [selectedPrintingPressTargets, setSelectedPrintingPressTargets] =
    useState(["home", "openbase_codex", "openbase_claude"]);
  const [installingPrintingPressSkill, setInstallingPrintingPressSkill] =
    useState("");
  const [officialSetupStates, setOfficialSetupStates] = useState<
    Record<string, "idle" | "running" | "ready">
  >({});

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
    if (projectPath && activeView === "official") {
      setActiveView("installed");
    }
  }, [activeView, projectPath]);

  const fetchPrintingPressCatalog = useCallback(async () => {
    setPrintingPressLoading(true);
    try {
      const params = new URLSearchParams();
      if (printingPressQuery.trim()) params.set("q", printingPressQuery.trim());
      if (printingPressCategory) params.set("category", printingPressCategory);
      const suffix = params.toString() ? `?${params.toString()}` : "";
      const res = await apiFetch(`/api/skills/printing-press/catalog/${suffix}`);
      if (!res.ok) {
        throw new Error(
          await extractErrorMessage(res, "Failed to load Printing Press catalog"),
        );
      }
      const data: PrintingPressCatalog = await res.json();
      setPrintingPressCatalog(data);
      setSelectedPrintingPressName((current) => {
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
    setPrintingPressLoading(false);
  }, [printingPressCategory, printingPressQuery]);

  useEffect(() => {
    if (activeView !== "printing-press") return;
    const timer = window.setTimeout(() => {
      fetchPrintingPressCatalog();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [activeView, fetchPrintingPressCatalog]);

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
        : scope === "normal_claude"
          ? "Claude Code"
          : scope);
  const scopeButtonLabel = (scope: string) =>
    scope === "home"
      ? "Personal"
      : scope === "normal_claude"
        ? "Claude Code"
        : scope === "openbase_codex"
          ? "Codex"
          : scope === "openbase_claude"
            ? "Claude"
            : scopeName(scope);
  const skillDirForComparison = (skill: SkillEntry) =>
    skill.source_dir_path || skill.dir_path || skill.path.replace(/\/SKILL\.md$/, "");
  const selectedPrintingPressEntry = useMemo(
    () =>
      printingPressCatalog?.entries.find(
        (entry) => entry.name === selectedPrintingPressName,
      ) ?? null,
    [printingPressCatalog?.entries, selectedPrintingPressName],
  );

  const togglePrintingPressTarget = (target: string) => {
    setSelectedPrintingPressTargets((current) =>
      current.includes(target)
        ? current.filter((item) => item !== target)
        : [...current, target],
    );
  };

  const installPrintingPressSkill = async (entry: PrintingPressEntry) => {
    setInstallingPrintingPressSkill(entry.name);
    try {
      const res = await apiFetch("/api/skills/printing-press/install/", {
        method: "POST",
        body: JSON.stringify({
          name: entry.name,
          targets: selectedPrintingPressTargets,
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
      await fetchPrintingPressCatalog();
      const installed = Array.isArray(data.results)
        ? data.results.filter((result: { status: string }) => result.status === "installed").length
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
    setInstallingPrintingPressSkill("");
  };

  const startOfficialSkillSetup = (skillSlug: string) => {
    const skill = officialSkillsCatalog.find((entry) => entry.slug === skillSlug);
    if (!skill) return;
    setOfficialSetupStates((current) => ({
      ...current,
      [skill.slug]: "running",
    }));
    window.setTimeout(() => {
      setOfficialSetupStates((current) => ({
        ...current,
        [skill.slug]: "ready",
      }));
      toast.success(`${skill.name} setup pathway selected`, {
        description: `${skill.setup.label} is ready for ${skill.setup.integrationTarget} integration.`,
      });
    }, 450);
  };

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
                {scopeName(editingScope).toLowerCase()}
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
            {!projectPath ? (
              <Button
                variant={activeView === "official" ? "default" : "outline"}
                size="sm"
                className="h-7 px-2.5 text-[12px]"
                onClick={() => setActiveView("official")}
              >
                Official Skills
              </Button>
            ) : null}
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
                variant={activeView === "printing-press" ? "default" : "outline"}
                size="sm"
                className="h-7 px-2.5 text-[12px]"
                onClick={() => setActiveView("printing-press")}
              >
                Printing Press
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
          <div className="space-y-4">
            <div className="overflow-hidden rounded border border-border bg-surface">
              <div className="grid gap-4 border-b border-border bg-surface-muted/50 px-4 py-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,.9fr)]">
                <div>
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-info">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Official and endorsed skills
                  </div>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
                    A small curated catalog, not an open marketplace
                  </h2>
                  <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
                    Openbase lists only official skills and skills Openbase has
                    reviewed or endorsed. Each entry has a specific setup
                    pathway so one click can eventually start the right auth,
                    pairing, permission, import, or agent-guided flow.
                  </p>
                </div>
                <div className="rounded border border-info/20 bg-info/5 p-3">
                  <div className="flex items-center gap-2 text-[12px] font-medium text-foreground">
                    <LockKeyhole className="h-3.5 w-3.5 text-info" />
                    Private-data skills are hardened first
                  </div>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
                    Gmail, iMessage, and WhatsApp model approved sender or
                    contact boundaries, metadata-first browsing, Openbase
                    approval prompts, and audit/revoke behavior.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-3">
                {officialSkillsCatalog.map((skill) => {
                  const setupState = officialSetupStates[skill.slug] ?? "idle";
                  const privateData = skill.category === "Private data";
                  const setupAction =
                    skill.setup.primaryAction.charAt(0).toLowerCase() +
                    skill.setup.primaryAction.slice(1);
                  return (
                    <article
                      key={skill.slug}
                      className={`flex min-h-[20rem] flex-col rounded border p-3 ${
                        privateData
                          ? "border-info/25 bg-info/5"
                          : "border-border bg-background"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-primary text-[12px] font-semibold text-primary-foreground">
                            {skill.name.slice(0, 1)}
                          </div>
                          <div className="min-w-0">
                            <h3 className="truncate text-[14px] font-semibold text-foreground">
                              {skill.name}
                            </h3>
                            <p className="truncate text-[11.5px] text-muted-foreground">
                              {skill.tagline}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant={privateData ? "default" : "secondary"}
                          className="shrink-0 px-1.5 py-0 text-[10px]"
                        >
                          {skill.status}
                        </Badge>
                      </div>

                      <p className="mt-3 text-[12.5px] leading-relaxed text-muted-foreground">
                        {skill.description}
                      </p>

                      <div className="mt-3 rounded border border-border bg-surface px-2.5 py-2">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Setup pathway
                        </div>
                        <div className="mt-1 text-[12px] font-medium text-foreground">
                          {skill.setup.label}
                        </div>
                        <div className="mt-0.5 font-mono text-[10.5px] text-muted-foreground">
                          {skill.setup.kind} / {skill.setup.integrationTarget}
                        </div>
                      </div>

                      <div className="mt-3 space-y-1.5">
                        {skill.trustModel.slice(0, 3).map((item) => (
                          <div
                            key={item}
                            className="flex gap-2 text-[11.5px] leading-snug text-muted-foreground"
                          >
                            <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-success" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-auto pt-4">
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 w-full text-[12px]"
                          disabled={setupState === "running"}
                          onClick={() => startOfficialSkillSetup(skill.slug)}
                        >
                          {setupState === "running" ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : setupState === "ready" ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <Download className="h-3.5 w-3.5" />
                          )}
                          {setupState === "ready"
                            ? "Setup pathway ready"
                            : `Install and ${setupAction}`}
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            <div className="rounded border border-border bg-surface px-3 py-2 text-[12px] leading-relaxed text-muted-foreground">
              Backend integration still needs dedicated handlers for each
              setup target. This UI intentionally avoids using the generic
              Printing Press installer for private-data skills.
            </div>
          </div>
        ) : activeView === "printing-press" && !projectPath ? (
          <div className="grid gap-3 lg:grid-cols-[13rem_minmax(0,1fr)_18rem]">
            <div className="overflow-hidden rounded border border-border bg-surface">
              <button
                type="button"
                onClick={() => setPrintingPressCategory("")}
                className={`flex w-full items-center justify-between border-b border-border px-3 py-2 text-left text-[12px] ${
                  !printingPressCategory ? "bg-surface-muted text-foreground" : "text-muted-foreground hover:bg-surface-muted"
                }`}
              >
                <span>All categories</span>
                <span>{printingPressCatalog?.categories.reduce((count, category) => count + category.count, 0) ?? 0}</span>
              </button>
              <div className="max-h-[30rem] overflow-auto">
                {(printingPressCatalog?.categories ?? []).map((category) => (
                  <button
                    key={category.name}
                    type="button"
                    onClick={() => setPrintingPressCategory(category.name)}
                    className={`flex w-full items-center justify-between border-b border-border px-3 py-2 text-left font-mono text-[11.5px] last:border-b-0 ${
                      printingPressCategory === category.name
                        ? "bg-surface-muted text-foreground"
                        : "text-muted-foreground hover:bg-surface-muted"
                    }`}
                  >
                    <span className="truncate">{category.name}</span>
                    <span className="ml-2 text-[10px]">{category.count}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={printingPressQuery}
                  onChange={(event) => setPrintingPressQuery(event.target.value)}
                  placeholder="Search Printing Press skills"
                  className="h-8 pl-7 text-[12.5px]"
                />
              </div>
              <div className="overflow-hidden rounded border border-border bg-surface">
                {printingPressLoading ? (
                  <div className="flex h-40 items-center justify-center gap-2 text-[12px] text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading catalog…
                  </div>
                ) : (printingPressCatalog?.entries.length ?? 0) === 0 ? (
                  <div className="px-4 py-8 text-center text-[12px] text-muted-foreground">
                    No matching skills.
                  </div>
                ) : (
                  <div className="max-h-[32rem] overflow-auto">
                    {printingPressCatalog?.entries.map((entry, idx) => (
                      <button
                        key={entry.name}
                        type="button"
                        onClick={() => setSelectedPrintingPressName(entry.name)}
                        className={`grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 px-3 py-2 text-left transition-colors hover:bg-surface-muted ${
                          idx > 0 ? "border-t border-border" : ""
                        } ${
                          selectedPrintingPressName === entry.name
                            ? "bg-surface-muted"
                            : ""
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="flex items-center gap-2">
                            <Zap className="h-3 w-3 shrink-0 text-muted-foreground" />
                            <span className="truncate font-mono text-[12.5px] font-medium text-foreground">
                              /{entry.skill_name}
                            </span>
                            <span className="truncate text-[10.5px] text-muted-foreground">
                              {entry.category}
                            </span>
                          </span>
                          <span className="mt-0.5 line-clamp-2 block text-[11.5px] leading-snug text-muted-foreground">
                            {entry.description}
                          </span>
                        </span>
                        <span className="flex items-center gap-1">
                          {Object.values(entry.installed_targets).some(Boolean) ? (
                            <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                              installed
                            </Badge>
                          ) : null}
                          {entry.mcp ? (
                            <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                              MCP
                            </Badge>
                          ) : null}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded border border-border bg-surface">
              {selectedPrintingPressEntry ? (
                <div className="space-y-3 p-3">
                  <div>
                    <div className="font-mono text-[13px] font-medium text-foreground">
                      /{selectedPrintingPressEntry.skill_name}
                    </div>
                    <div className="mt-1 text-[12px] font-medium text-foreground">
                      {selectedPrintingPressEntry.api}
                    </div>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
                      {selectedPrintingPressEntry.description}
                    </p>
                  </div>
                  <div className="space-y-1.5 text-[11px] text-muted-foreground">
                    <div className="flex justify-between gap-2">
                      <span>CLI</span>
                      <span className="truncate font-mono">
                        {selectedPrintingPressEntry.release.cli_name}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span>Version</span>
                      <span className="font-mono">
                        {selectedPrintingPressEntry.release.version || "unknown"}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span>Printer</span>
                      <span className="truncate">
                        {selectedPrintingPressEntry.printer_name ||
                          selectedPrintingPressEntry.printer}
                      </span>
                    </div>
                    {selectedPrintingPressEntry.mcp ? (
                      <div className="flex justify-between gap-2">
                        <span>MCP auth</span>
                        <span className="truncate font-mono">
                          {selectedPrintingPressEntry.mcp.auth_type || "none"}
                        </span>
                      </div>
                    ) : null}
                  </div>
                  <div className="border-t border-border pt-3">
                    <div className="mb-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                      Install targets
                    </div>
                    <div className="space-y-2">
                      {printingPressTargets.map((target) => {
                        const installed =
                          selectedPrintingPressEntry.installed_targets[target.key];
                        return (
                          <label
                            key={target.key}
                            className="flex items-center gap-2 text-[12px] text-foreground"
                          >
                            <Checkbox
                              checked={selectedPrintingPressTargets.includes(target.key)}
                              onCheckedChange={() =>
                                togglePrintingPressTarget(target.key)
                              }
                            />
                            <span className="flex-1">{target.label}</span>
                            {installed ? (
                              <span className="rounded bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-success">
                                installed
                              </span>
                            ) : null}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 w-full text-[12px]"
                    disabled={
                      selectedPrintingPressTargets.length === 0 ||
                      installingPrintingPressSkill === selectedPrintingPressEntry.name
                    }
                    onClick={() => installPrintingPressSkill(selectedPrintingPressEntry)}
                  >
                    {installingPrintingPressSkill === selectedPrintingPressEntry.name ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    Install
                  </Button>
                </div>
              ) : (
                <div className="px-4 py-8 text-center text-[12px] text-muted-foreground">
                  Select a skill.
                </div>
              )}
            </div>
          </div>
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
                            Symlink normal Codex and Claude Code skills into
                            the Openbase homes when this page refreshes.
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
