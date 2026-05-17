import DashboardLayout from "@/components/layouts/ExampleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Plus,
  Save,
  Trash2,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

interface SkillEntry {
  name: string;
  path: string;
  source_path?: string;
}

interface SkillSection {
  key: string;
  label: string;
  skills_dir: string;
  skills: SkillEntry[];
}

const Skills = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const projectPath = searchParams.get("path") || "";
  const editingSkill = searchParams.get("skill") || "";
  const editingScope = searchParams.get("scope") || "home";

  const [skills, setSkills] = useState<SkillEntry[]>([]);
  const [sections, setSections] = useState<SkillSection[]>([]);
  const [skillsDir, setSkillsDir] = useState("");
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({});

  const [content, setContent] = useState("");
  const [filePath, setFilePath] = useState("");
  const [sourcePath, setSourcePath] = useState("");
  const [saving, setSaving] = useState(false);
  const [editorLoading, setEditorLoading] = useState(false);

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
    }
    setLoading(false);
  }, [listApiParams]);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

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
        ) : totalSkills === 0 ? (
          <div className="rounded border border-dashed border-border bg-surface px-4 py-6 text-center">
            <Zap className="mx-auto h-4 w-4 text-muted-foreground/40" />
            <p className="mt-2 text-[12px] text-muted-foreground">
              No skills yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
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
                        return (
                          <button
                            key={`${section.key}:${skill.name}`}
                            onClick={() => openSkill(skill.name, section.key)}
                            className={`group grid w-full grid-cols-[minmax(6.5rem,11rem)_minmax(0,1fr)_auto] items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-surface-muted sm:grid-cols-[minmax(8rem,14rem)_minmax(0,1fr)_auto] ${
                              idx > 0 ? "border-t border-border" : ""
                            }`}
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <Zap className="h-3 w-3 shrink-0 text-muted-foreground" />
                              <span className="truncate font-mono text-[12.5px] font-medium text-foreground">
                                /{skill.name}
                              </span>
                            </span>
                            <span
                              className="min-w-0 truncate text-left font-mono text-[11px] text-muted-foreground/70 [direction:rtl] [unicode-bidi:plaintext]"
                              title={skillPath}
                            >
                              {skillPath}
                            </span>
                            <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-foreground" />
                          </button>
                        );
                      })
                    )
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Skills;
