import { apiFetch } from "@/lib/api";
import { extractErrorMessage } from "@/lib/api-errors";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export interface UseSkillDetailArgs {
  editingSkill: string;
  detailApiParams: string;
  onDeleted: () => void;
  refreshList: () => Promise<void> | void;
}

export interface UseSkillDetailResult {
  content: string;
  setContent: (content: string) => void;
  filePath: string;
  sourcePath: string;
  saving: boolean;
  editorLoading: boolean;
  editorError: string | null;
  handleSave: () => Promise<void>;
  handleDelete: () => Promise<void>;
}

/**
 * Owns loading, saving, and deleting a single skill's SKILL.md content for the
 * editor view.
 */
export function useSkillDetail({
  editingSkill,
  detailApiParams,
  onDeleted,
  refreshList,
}: UseSkillDetailArgs): UseSkillDetailResult {
  const [content, setContent] = useState("");
  const [filePath, setFilePath] = useState("");
  const [sourcePath, setSourcePath] = useState("");
  const [saving, setSaving] = useState(false);
  const [editorLoading, setEditorLoading] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);

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
      onDeleted();
      void refreshList();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  return {
    content,
    setContent,
    filePath,
    sourcePath,
    saving,
    editorLoading,
    editorError,
    handleSave,
    handleDelete,
  };
}
