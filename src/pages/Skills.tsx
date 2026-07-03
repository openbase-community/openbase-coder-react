import DashboardLayout from "@/components/layouts/ExampleLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Download,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
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
  auto_link_normal_codex_skills: boolean;
  normal_codex_skills_dir: string;
  openbase_codex_skills_dir: string;
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
  { key: "home", label: "Normal Codex" },
  { key: "voice_coder", label: "Openbase Codex" },
  { key: "claude", label: "Openbase Claude" },
];

const Skills = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const projectPath = searchParams.get("path") || "";
  const editingSkill = searchParams.get("skill") || "";
  const editingScope = searchParams.get("scope") || "home";
  const [activeView, setActiveView] = useState<"installed" | "printing-press">(
    "installed",
  );

  const [skills, setSkills] = useState<SkillEntry[]>([]);
  const [sections, setSections] = useState<SkillSection[]>([]);
  const [skillsDir, setSkillsDir] = useState("");
  const [loading, setLoading] = useState(true);
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
  const [printingPressCatalog, setPrintingPressCatalog] =
    useState<PrintingPressCatalog | null>(null);
  const [printingPressLoading, setPrintingPressLoading] = useState(false);
  const [printingPressQuery, setPrintingPressQuery] = useState("");
  const [printingPressCategory, setPrintingPressCategory] = useState("");
  const [selectedPrintingPressName, setSelectedPrintingPressName] = useState("");
  const [selectedPrintingPressTargets, setSelectedPrintingPressTargets] =
    useState(["home", "voice_coder", "claude"]);
  const [installingPrintingPressSkill, setInstallingPrintingPressSkill] =
    useState("");

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
    const res = await apiFetch(`/api/skills/${listApiParams}`);
    if (res.ok) {
      const data = await res.json();
      setSkills(data.skills);
      setSections(data.sections ?? []);
      setSkillsDir(data.skills_dir);
      setAutoLinkSettings(data.auto_link_normal_codex_skills ?? null);
      setAutoLinkSync(data.auto_link_normal_codex_skills_sync ?? null);
    }
    setLoading(false);
  }, [listApiParams]);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  const fetchPrintingPressCatalog = useCallback(async () => {
    setPrintingPressLoading(true);
    const params = new URLSearchParams();
    if (printingPressQuery.trim()) params.set("q", printingPressQuery.trim());
    if (printingPressCategory) params.set("category", printingPressCategory);
    const suffix = params.toString() ? `?${params.toString()}` : "";
    const res = await apiFetch(`/api/skills/printing-press/catalog/${suffix}`);
    if (res.ok) {
      const data: PrintingPressCatalog = await res.json();
      setPrintingPressCatalog(data);
      setSelectedPrintingPressName((current) => {
        if (current && data.entries.some((entry) => entry.name === current)) {
          return current;
        }
        return data.entries[0]?.name ?? "";
      });
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Failed to load Printing Press catalog");
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
    apiFetch(
      `/api/skills/${encodeURIComponent(editingSkill)}/${detailApiParams}`,
    ).then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        setContent(data.content);
        setFilePath(data.path);
        setSourcePath(data.source_path ?? "");
      }
      setEditorLoading(false);
    });
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
    const res = await apiFetch(`/api/skills/${listApiParams}`, {
      method: "POST",
      body: JSON.stringify({ name: trimmed }),
    });
    if (res.ok) {
      setNewName("");
      await fetchSkills();
      openSkill(trimmed);
      toast.success(`Skill '${trimmed}' created`);
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to create skill");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await apiFetch(
      `/api/skills/${encodeURIComponent(editingSkill)}/${detailApiParams}`,
      { method: "PUT", body: JSON.stringify({ content }) },
    );
    setSaving(false);
    if (res.ok) toast.success("Saved");
    else toast.error("Failed to save");
  };

  const handleDelete = async () => {
    const res = await apiFetch(
      `/api/skills/${encodeURIComponent(editingSkill)}/${detailApiParams}`,
      { method: "DELETE" },
    );
    if (res.ok) {
      toast.success(`Deleted /${editingSkill}`);
      backToList();
      fetchSkills();
    } else {
      toast.error("Failed to delete");
    }
  };

  const linkSkill = async (
    skill: SkillEntry,
    sourceScope: string,
    targetScope: string,
  ) => {
    const operationId = `${sourceScope}:${targetScope}:${skill.name}`;
    setSyncingSkill(operationId);
    const res = await apiFetch("/api/skills/symlink/", {
      method: "POST",
      body: JSON.stringify({
        name: skill.name,
        source_scope: sourceScope,
        target_scope: targetScope,
      }),
    });
    setSyncingSkill("");
    if (res.ok) {
      const data = await res.json();
      await fetchSkills();
      toast.success(
        data.created
          ? `Linked /${skill.name}`
          : `/${skill.name} was already linked`,
      );
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Failed to link skill");
    }
  };

  const updateAutoLinkSetting = async (enabled: boolean) => {
    setSavingAutoLink(true);
    const res = await apiFetch("/api/skills/auto-link-normal-codex/", {
      method: "PATCH",
      body: JSON.stringify({ auto_link_normal_codex_skills: enabled }),
    });
    setSavingAutoLink(false);
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
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
    } else {
      toast.error(data.error || "Failed to update auto-link setting");
    }
  };

  const runAutoLinkSync = async () => {
    setSavingAutoLink(true);
    const res = await apiFetch("/api/skills/auto-link-normal-codex/", {
      method: "POST",
    });
    setSavingAutoLink(false);
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setAutoLinkSettings(data);
      setAutoLinkSync(data.sync ?? null);
      await fetchSkills();
      const sync = data.sync as AutoLinkSyncResult | null;
      toast.success(
        sync?.created
          ? `Auto-linked ${sync.created} skill${sync.created === 1 ? "" : "s"}`
          : "Auto-link scan complete",
      );
    } else {
      toast.error(data.error || "Failed to scan normal Codex skills");
    }
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
      ? "Normal Codex"
      : scope === "voice_coder"
        ? "Openbase Codex"
        : scope);
  const scopeButtonLabel = (scope: string) =>
    scope === "home"
      ? "Normal"
      : scope === "voice_coder"
        ? "Codex"
        : scope === "claude"
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
    const res = await apiFetch("/api/skills/printing-press/install/", {
      method: "POST",
      body: JSON.stringify({
        name: entry.name,
        targets: selectedPrintingPressTargets,
      }),
    });
    setInstallingPrintingPressSkill("");
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      await fetchPrintingPressCatalog();
      const installed = Array.isArray(data.results)
        ? data.results.filter((result: { status: string }) => result.status === "installed").length
        : 0;
      toast.success(
        installed > 0
          ? `Installed /${entry.skill_name}`
          : `/${entry.skill_name} was already installed`,
      );
    } else {
      toast.error(data.error || `Failed to install /${entry.skill_name}`);
    }
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
                voice coder
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
              disabled={saving || editorLoading}
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

        {activeView === "printing-press" && !projectPath ? (
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

            {loading ? (
              <div className="text-[12px] text-muted-foreground">Loading…</div>
            ) : (
              <div className="space-y-3">
                {!projectPath && autoLinkSettings ? (
                  <div className="rounded border border-border bg-surface px-3 py-2">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <label className="flex min-w-0 items-center gap-2">
                        <Checkbox
                          checked={
                            autoLinkSettings.auto_link_normal_codex_skills
                          }
                          disabled={savingAutoLink}
                          onCheckedChange={(checked) =>
                            updateAutoLinkSetting(checked === true)
                          }
                        />
                        <span className="min-w-0">
                          <span className="block text-[13px] font-medium text-foreground">
                            Auto-link normal Codex skills
                          </span>
                          <span className="block truncate text-[11.5px] text-muted-foreground">
                            Symlink normal Codex skills into Openbase Codex when
                            this page refreshes.
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
