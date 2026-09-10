import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { ArrowLeft, Save, Trash2 } from "lucide-react";

import type { UseMemoryDetailResult } from "./useMemoryDetail";

interface MemoryDetailProps extends UseMemoryDetailResult {
  editingMemory: string;
  scopeLabel: string;
  onBack: () => void;
}

export function MemoryDetail({
  editingMemory,
  scopeLabel,
  onBack,
  content,
  setContent,
  filePath,
  readOnly,
  saving,
  editorLoading,
  editorError,
  handleSave,
  handleDelete,
}: MemoryDetailProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-surface-muted hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </button>
        <h1 className="font-mono text-sm font-medium text-foreground">
          {editingMemory}
        </h1>
        {scopeLabel ? (
          <span className="rounded bg-surface-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            {scopeLabel}
          </span>
        ) : null}
        {readOnly ? (
          <span className="rounded bg-surface-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            read-only
          </span>
        ) : null}
        <span className="truncate font-mono text-[11px] text-muted-foreground/70">
          {filePath}
        </span>
      </div>

      <Panel>
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
            readOnly={readOnly}
            className="h-[26rem] w-full resize-y bg-transparent p-3 font-mono text-[12.5px] leading-relaxed text-foreground focus:outline-none"
          />
        )}
      </Panel>

      {!readOnly ? (
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
      ) : null}
    </div>
  );
}
