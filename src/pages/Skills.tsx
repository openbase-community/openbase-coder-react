import DashboardLayout from "@/components/layouts/ExampleLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { ArrowLeft, Plus, Save, Trash2, Zap } from "lucide-react";
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

  // Editor state
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

  // Load skill content when editing
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
      }
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
      {
        method: "PUT",
        body: JSON.stringify({ content }),
      }
    );
    setSaving(false);
    if (res.ok) {
      toast.success("Skill saved");
    } else {
      toast.error("Failed to save skill");
    }
  };

  const handleDelete = async () => {
    const res = await apiFetch(
      `/api/skills/${encodeURIComponent(editingSkill)}/${apiParams}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      toast.success(`Skill '${editingSkill}' deleted`);
      backToList();
      fetchSkills();
    } else {
      toast.error("Failed to delete skill");
    }
  };

  const scopeLabel = projectPath
    ? projectPath.split("/").pop()
    : "Global";

  // ---- Editor view ----
  if (editingSkill) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <button
              onClick={backToList}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-3xl font-light">/{editingSkill}</h1>
              <p className="text-gray-600 text-sm">{filePath}</p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>SKILL.md Editor</CardTitle>
              <CardDescription>
                YAML frontmatter between --- markers, then markdown instructions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {editorLoading ? (
                <div className="h-64 flex items-center justify-center text-gray-400">
                  Loading...
                </div>
              ) : (
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full h-96 font-mono text-sm p-4 border rounded-lg resize-y bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={`---\nname: ${editingSkill}\ndescription: What this skill does\n---\n\nYour skill instructions here...`}
                />
              )}
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={saving || editorLoading}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save"}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={editorLoading}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // ---- List view ----
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-light mb-2">Skills</h1>
          <p className="text-gray-600">
            {scopeLabel} custom slash commands
          </p>
          <p className="text-xs text-gray-400 mt-1">{skillsDir}</p>
        </div>

        <div className="flex gap-2">
          <Button
            variant={projectPath ? "outline" : "default"}
            size="sm"
            onClick={() => {
              const params = new URLSearchParams();
              setSearchParams(params);
            }}
          >
            Global
          </Button>
          {projectPath && (
            <Button size="sm">
              {projectPath.split("/").pop()}
            </Button>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            createSkill();
          }}
          className="flex gap-2"
        >
          <Input
            placeholder="New skill name (e.g. review-pr)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1"
          />
          <Button onClick={createSkill} disabled={!newName.trim()}>
            <Plus className="h-4 w-4 mr-1" />
            Create
          </Button>
        </form>

        {loading ? (
          <div className="text-gray-400">Loading...</div>
        ) : skills.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
              No skills found. Create one to get started.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {skills.map((skill) => (
              <Card
                key={skill.name}
                className="cursor-pointer hover:border-gray-400 transition-colors"
                onClick={() => openSkill(skill.name)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Zap className="h-4 w-4" />
                    /{skill.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-gray-500 truncate">{skill.path}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Skills;
