import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { extractErrorMessage } from "@/lib/api-errors";
import { fleetApiPath } from "@/lib/fleet";
import type { ThreadInfo } from "@/types/session";

export function ContinuationLinks({ thread }: { thread: ThreadInfo }) {
  const [context, setContext] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const showContext = async () => {
    if (context !== null) { setContext(null); return; }
    setLoading(true);
    try {
      const response = await apiFetch(fleetApiPath(thread.origin_host, `/api/threads/${thread.thread_id}/continuation-context/`));
      if (!response.ok) throw new Error(await extractErrorMessage(response, "Unable to read context"));
      const data = await response.json();
      setContext(data.messages.map((m: { role: string; text: string }) => `${m.role}: ${m.text}`).join("\n\n"));
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Unable to read context");
    } finally { setLoading(false); }
  };
  if (!thread.continued_from && !thread.continuations?.length) return null;
  return <div className="space-y-2 rounded-md border border-border bg-surface-muted p-3 text-xs">
    {thread.continued_from ? <p>Continued from <Link className="text-primary underline" to={`/dashboard/threads/${thread.continued_from.thread_id}`}>{thread.continued_from.name}</Link>.</p> : null}
    {thread.continuation_context ? <p className="text-muted-foreground">
      This thread carries context from the previous conversation.
      {thread.continuation_context.omitted ? " The handoff includes selected history; the full available snapshot is below." : " All exported history is included."}
      {" "}<button type="button" className="text-primary underline" disabled={loading} onClick={() => void showContext()}>
        {loading ? "Loading…" : context !== null ? "Hide context" : "View context"}
      </button>
    </p> : null}
    {context !== null ? <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words text-xs">{context || "No previous messages."}</pre> : null}
    {thread.continuations?.map((next) => <p key={next.thread_id}>Continued in <Link className="text-primary underline" to={`/dashboard/threads/${next.thread_id}`}>{next.name}</Link>.</p>)}
  </div>;
}
