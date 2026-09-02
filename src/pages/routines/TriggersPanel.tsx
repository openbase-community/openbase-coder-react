import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { getBackendUrl } from "@/lib/runtime-config";
import { Copy, Plus, Trash2, Webhook } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { extractError, fieldInputClass, fieldLabelClass, formatDateTime } from "./helpers";
import type { LoopTrigger, LoopTriggerFilter, Routine } from "./types";

const FILTER_OPS: LoopTriggerFilter["op"][] = [
  "equals",
  "notEquals",
  "contains",
  "startsWith",
  "endsWith",
  "exists",
  "regex",
];

function triggerIngestUrl(trigger: LoopTrigger): string | null {
  if (!trigger.token) return null;
  return getBackendUrl(`/api/hooks/t/${trigger.token}/`);
}

function filterSummary(filter: LoopTriggerFilter): string {
  const value = filter.value === undefined || filter.value === null ? "" : ` ${String(filter.value)}`;
  return `${filter.path} ${filter.op}${value}`;
}

export function TriggersPanel({
  routine,
  onChanged,
}: {
  routine: Routine;
  onChanged: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [description, setDescription] = useState("");
  const [senderPath, setSenderPath] = useState("");
  const [senders, setSenders] = useState("");
  const [filterPath, setFilterPath] = useState("");
  const [filterOp, setFilterOp] = useState<LoopTriggerFilter["op"]>("startsWith");
  const [filterValue, setFilterValue] = useState("");
  const [hmacSecret, setHmacSecret] = useState("");
  const triggers = routine.triggers ?? [];

  const resetForm = () => {
    setDescription("");
    setSenderPath("");
    setSenders("");
    setFilterPath("");
    setFilterOp("startsWith");
    setFilterValue("");
    setHmacSecret("");
  };

  const copyUrl = async (trigger: LoopTrigger) => {
    const url = triggerIngestUrl(trigger);
    if (!url) return;
    await navigator.clipboard.writeText(url);
    toast.success("Webhook URL copied");
  };

  const addTrigger = async () => {
    setBusy(true);
    try {
      const senderAllowlist = senders
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      const body: Record<string, unknown> = {};
      if (description.trim()) body.description = description.trim();
      if (senderPath.trim()) body.senderPath = senderPath.trim();
      if (senderAllowlist.length) body.senderAllowlist = senderAllowlist;
      if (filterPath.trim()) {
        body.filters = [
          {
            path: filterPath.trim(),
            op: filterOp,
            ...(filterOp === "exists" ? {} : { value: filterValue }),
          },
        ];
      }
      if (hmacSecret.trim()) body.hmacSecret = hmacSecret.trim();
      const res = await apiFetch(
        `/api/routines/${encodeURIComponent(routine.name)}/triggers/`,
        { method: "POST", body: JSON.stringify(body) },
      );
      if (!res.ok) {
        throw new Error(await extractError(res, "Unable to add trigger."));
      }
      toast.success("Trigger added");
      resetForm();
      setAdding(false);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to add trigger.");
    } finally {
      setBusy(false);
    }
  };

  const deleteTrigger = async (trigger: LoopTrigger) => {
    setBusy(true);
    try {
      const res = await apiFetch(
        `/api/routines/${encodeURIComponent(routine.name)}/triggers/${encodeURIComponent(trigger.id)}/`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        throw new Error(await extractError(res, "Unable to remove trigger."));
      }
      toast.success("Trigger removed");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to remove trigger.");
    } finally {
      setBusy(false);
    }
  };

  const isAgentLoop = (routine.kind ?? "agent") === "agent";

  return (
    <div className="rounded border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className={fieldLabelClass}>Triggers</div>
        <Button
          variant="outline"
          size="sm"
          className="h-6 px-2 text-[11px]"
          disabled={busy}
          onClick={() => setAdding((value) => !value)}
        >
          <Plus className="h-3 w-3" />
          {adding ? "Cancel" : "Add webhook trigger"}
        </Button>
      </div>

      {triggers.length === 0 && !adding ? (
        <p className="px-3 py-3 text-[12px] text-muted-foreground">
          Runs on schedule only. Add a webhook trigger so external events (a GitHub PR
          comment, a generic webhook) can start this loop.
        </p>
      ) : null}

      {triggers.map((trigger) => (
        <div key={trigger.id} className="border-t border-border px-3 py-2 first:border-t-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Webhook className="h-3.5 w-3.5 shrink-0 text-info" />
            <span className="text-[12px] font-medium text-foreground">
              {trigger.description || "Webhook"}
            </span>
            <span className="font-mono text-[10.5px] text-muted-foreground">
              {trigger.eventCount ?? 0} event{(trigger.eventCount ?? 0) === 1 ? "" : "s"}
            </span>
            {trigger.lastEventAt ? (
              <span className="font-mono text-[10.5px] text-muted-foreground">
                last {formatDateTime(trigger.lastEventAt)}
              </span>
            ) : null}
            <span className="ml-auto flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-6 px-2 text-[11px]"
                onClick={() => void copyUrl(trigger)}
              >
                <Copy className="h-3 w-3" />
                Copy URL
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-6 px-2 text-[11px]"
                disabled={busy}
                onClick={() => void deleteTrigger(trigger)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[10.5px] text-muted-foreground/75">
            {(trigger.filters ?? []).map((filter, idx) => (
              <span key={idx}>when {filterSummary(filter)}</span>
            ))}
            {trigger.senderAllowlist?.length ? (
              <span>
                senders {trigger.senderAllowlist.join(", ")}
                {trigger.senderPath ? ` (from ${trigger.senderPath})` : ""}
              </span>
            ) : null}
            {trigger.hmacHeader ? <span>signed via {trigger.hmacHeader}</span> : null}
          </div>
        </div>
      ))}

      {adding ? (
        <div className="space-y-2 border-t border-border px-3 py-3">
          <div>
            <label className={fieldLabelClass}>Description</label>
            <input
              className={fieldInputClass}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="GitHub PR comments on owner/repo"
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className={fieldLabelClass}>
                Sender path{isAgentLoop ? " (required)" : ""}
              </label>
              <input
                className={fieldInputClass}
                value={senderPath}
                onChange={(event) => setSenderPath(event.target.value)}
                placeholder="sender.id"
              />
            </div>
            <div>
              <label className={fieldLabelClass}>
                Allowed senders{isAgentLoop ? " (required)" : ""}
              </label>
              <input
                className={fieldInputClass}
                value={senders}
                onChange={(event) => setSenders(event.target.value)}
                placeholder="12345, 67890"
              />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
            <div>
              <label className={fieldLabelClass}>Filter path</label>
              <input
                className={fieldInputClass}
                value={filterPath}
                onChange={(event) => setFilterPath(event.target.value)}
                placeholder="comment.body"
              />
            </div>
            <div>
              <label className={fieldLabelClass}>Op</label>
              <select
                className={fieldInputClass}
                value={filterOp}
                onChange={(event) =>
                  setFilterOp(event.target.value as LoopTriggerFilter["op"])
                }
              >
                {FILTER_OPS.map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={fieldLabelClass}>Value</label>
              <input
                className={fieldInputClass}
                value={filterValue}
                onChange={(event) => setFilterValue(event.target.value)}
                placeholder="/openbase"
                disabled={filterOp === "exists"}
              />
            </div>
          </div>
          <div>
            <label className={fieldLabelClass}>HMAC secret (optional)</label>
            <input
              className={fieldInputClass}
              value={hmacSecret}
              onChange={(event) => setHmacSecret(event.target.value)}
              placeholder="Shared secret the provider signs payloads with"
            />
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              className="h-7 px-2.5 text-[12px]"
              disabled={busy}
              onClick={() => void addTrigger()}
            >
              Add trigger
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default TriggersPanel;
