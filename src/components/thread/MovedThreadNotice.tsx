import { useState } from "react";
import { CloudUpload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { resolveUnfinishedPush } from "@/lib/thread-push";
import type { ThreadInfo } from "@/types/session";

/**
 * Shown on a thread's old copy after it was pushed to a durable machine
 * (or while a push is unfinished). The copy is read-only; the app follows
 * the thread to its new computer whenever that computer is reachable.
 */
export function MovedThreadNotice({
  thread,
  onChanged,
}: {
  thread: ThreadInfo;
  onChanged: () => Promise<void> | void;
}) {
  const [busy, setBusy] = useState<"retry" | "cancel" | "open" | null>(null);
  const moved = thread.moved_to;
  if (!moved) return null;
  const device = moved.device || "your durable machine";
  const act = async (action: "retry" | "cancel") => {
    setBusy(action);
    try {
      await resolveUnfinishedPush(thread, action);
      toast.success(
        action === "retry" ? `Moved to ${device}` : "The thread is usable here again",
      );
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Something went wrong");
    } finally {
      setBusy(null);
      await onChanged();
    }
  };
  const open = async () => {
    setBusy("open");
    try {
      await onChanged();
    } finally {
      setBusy(null);
    }
  };
  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-surface-muted px-3 py-2 text-[12px]"
    >
      <CloudUpload className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1">
        {moved.state === "moved"
          ? `Moved to ${device}. It continues there; this copy is read-only.`
          : moved.state === "pushing"
            ? `Pushing to ${device}…`
            : `The push to ${device} did not finish. The thread is paused until it does.`}
      </span>
      {moved.state === "moved" ? (
        <Button
          variant="outline"
          size="sm"
          className="h-6 px-2 text-[11px]"
          disabled={busy !== null}
          onClick={() => void open()}
        >
          Open on {device}
        </Button>
      ) : null}
      {moved.state === "uncertain" ? (
        <>
          <Button
            variant="outline"
            size="sm"
            className="h-6 px-2 text-[11px]"
            disabled={busy !== null}
            onClick={() => void act("retry")}
          >
            {busy === "retry" ? "Retrying…" : "Retry push"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[11px]"
            disabled={busy !== null}
            onClick={() => void act("cancel")}
          >
            {busy === "cancel" ? "Checking…" : "Keep it here"}
          </Button>
        </>
      ) : null}
    </div>
  );
}
