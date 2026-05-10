import DashboardLayout from "@/components/layouts/ExampleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { ArrowLeft, ChevronRight, Plus, Save, Trash2, Zap } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

interface SkillEntry {
  name: string;
  path: string;
}

const Skills = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const projectPath = searchParams.get("path") || "";
  const editingSkill = searchParams.get("skill") || "";

  const [skills, setSkills] = useState<SkillEntry[]>([]);
  const [skillsDir, setSkillsDir] = useState("");
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");

  const [content, setContent] = useState("");
  const [filePath, setFilePath] = useState("");
  const [saving, setSaving] = useState(false);
  const [editorLoading, setEditorLoading] = useState(false);

  const apiParams = projectPath
    ? `?path=${encodeURIComponent(projectPath)}`
    : "";

  const fetchSkills = useCallback(async () => {
    const res = await apiFetch(`/api/skills/${apiParams}`);
    if (res.ok) {
      const data = await res.json();
      setSkills(data.skills);
      setSkillsDir(data.skills_dir);
    }
    setLoading(false);
  }, [apiParams]);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  useEffect(() => {
    if (!editingSkill) return;
    setEditorLoading(true);
    apiFetch(`/api/skills/${encodeURIComponent(editingSkill)}/${apiParams}`).then(
      async (res) => {
        if (res.ok) {
          const data = await res.json();
          setContent(data.content);
          setFilePath(data.path);
        }
        setEditorLoading(false);
      },
    );
  }, [editingSkill, apiParams]);

  const openSkill = (name: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("skill", name);
    setSearchParams(params);
  };

  const backToList = () => {
    const params = new URLSearchParams(searchParams);
    params.delete("skill");
    setSearchParams(params);
  };

  const createSkill = async () => {
    const trimmed = newName.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
    if (!trimmed) return;
    const res = await apiFetch(`/api/skills/${apiParams}`, {
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
      `/api/skills/${encodeURIComponent(editingSkill)}/${apiParams}`,
      { method: "PUT", body: JSON.stringify({ content }) },
    );
    setSaving(false);
    if (res.ok) toast.success("Saved");
    else toast.error("Failed to save");
  };

  const handleDelete = async () => {
    const res = await apiFetch(
      `/api/skills/${encodeURIComponent(editingSkill)}/${apiParams}`,
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
            <span className="font-mono text-[11px] text-muted-foreground/70">
              {filePath}
            </span>
          </div>

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
              {scopeLabel} ·{" "}
              {skillsDir ? (
                <span className="font-mono text-[11px]">{skillsDir}</span>
              ) : null}
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
        ) : skills.length === 0 ? (
          <div className="rounded border border-dashed border-border bg-surface px-4 py-6 text-center">
            <Zap className="mx-auto h-4 w-4 text-muted-foreground/40" />
            <p className="mt-2 text-[12px] text-muted-foreground">
              No skills yet.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded border border-border bg-surface">
            {skills.map((skill, idx) => (
              <button
                key={skill.name}
                onClick={() => openSkill(skill.name)}
                className={`group flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-surface-muted ${
                  idx > 0 ? "border-t border-border" : ""
                }`}
              >
                <Zap className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span className="font-mono text-[12.5px] font-medium text-foreground">
                  /{skill.name}
                </span>
                <span className="truncate font-mono text-[11px] text-muted-foreground/70">
                  {skill.path}
                </span>
                <ChevronRight className="ml-auto h-3 w-3 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-foreground" />
              </button>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Skills;
