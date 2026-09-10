import { apiFetch } from "@/lib/api";
import { extractErrorMessage } from "@/lib/api-errors";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export interface UseMemoryDetailArgs {
  editingMemory: string;
  detailApiParams: string;
  onDeleted: () => void;
  refreshList: () => Promise<void> | void;
}

export interface UseMemoryDetailResult {
  content: string;
  setContent: (content: string) => void;
  filePath: string;
  readOnly: boolean;
  saving: boolean;
  editorLoading: boolean;
  editorError: string | null;
  handleSave: () => Promise<void>;
  handleDelete: () => Promise<void>;
}

/**
 * Owns loading, saving, and deleting a single memory's content for the
 * detail view. Codex thread memories come back read-only.
 */
export function useMemoryDetail({
  editingMemory,
  detailApiParams,
  onDeleted,
  refreshList,
}: UseMemoryDetailArgs): UseMemoryDetailResult {
  const [content, setContent] = useState("");
  const [filePath, setFilePath] = useState("");
  const [readOnly, setReadOnly] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editorLoading, setEditorLoading] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);

  useEffect(() => {
    if (!editingMemory) return;
    setEditorLoading(true);
    setEditorError(null);
    const loadMemory = async () => {
      try {
        const res = await apiFetch(
          `/api/memories/${encodeURIComponent(editingMemory)}/${detailApiParams}`,
        );
        if (!res.ok) {
          throw new Error(
            await extractErrorMessage(res, `Failed to load ${editingMemory}`),
          );
        }
        const data = await res.json();
        setContent(data.content);
        setFilePath(data.path);
        setReadOnly(!!data.read_only);
      } catch (err) {
        setEditorError(
          err instanceof Error ? err.message : "Unable to reach the local API.",
        );
      }
      setEditorLoading(false);
    };
    void loadMemory();
  }, [editingMemory, detailApiParams]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiFetch(
        `/api/memories/${encodeURIComponent(editingMemory)}/${detailApiParams}`,
        { method: "PUT", body: JSON.stringify({ content }) },
      );
      if (!res.ok) {
        throw new Error(await extractErrorMessage(res, "Failed to save"));
      }
      toast.success("Saved");
      void refreshList();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    try {
      const res = await apiFetch(
        `/api/memories/${encodeURIComponent(editingMemory)}/${detailApiParams}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        throw new Error(await extractErrorMessage(res, "Failed to delete"));
      }
      toast.success(`Deleted ${editingMemory}`);
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
    readOnly,
    saving,
    editorLoading,
    editorError,
    handleSave,
    handleDelete,
  };
}
