import { useRef, useState } from "react";
import { Check, LoaderCircle, Repeat2 } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuPortal,
  DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { apiFetch } from "@/lib/api";
import { extractErrorMessage } from "@/lib/api-errors";
import { fleetApiPath } from "@/lib/fleet";
import { continuationRequestId } from "@/lib/continuation-request";
import type { ThreadInfo } from "@/types/session";

type Option = { backend: string; label: string; current: boolean; reason: string | null };
export type Continuation = { thread_id: string; name: string; backend: string };

export function BackendSwitchMenu({ thread, onContinued }: {
  thread: ThreadInfo;
  onContinued: (thread: Continuation) => void;
}) {
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);
  const request = useRef<{ backend: string; id: string } | null>(null);
  const base = fleetApiPath(thread.origin_host, `/api/threads/${thread.thread_id}`);
  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch(`${base}/continuation-options/`);
      if (!response.ok) throw new Error(await extractErrorMessage(response, "Unable to load backends"));
      setOptions((await response.json()).options);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load backends");
    } finally {
      setLoading(false);
    }
  };
  const switchBackend = async (backend: string) => {
    if (switching) return;
    setSwitching(true);
    const storageKey = `openbase:continuation:${base}:${backend}`;
    if (request.current?.backend !== backend) request.current = {
      backend, id: sessionStorage.getItem(storageKey) ?? continuationRequestId(),
    };
    sessionStorage.setItem(storageKey, request.current.id);
    try {
      const response = await apiFetch(`${base}/continuations/`, {
        method: "POST",
        body: JSON.stringify({ backend, request_id: request.current.id }),
      });
      if (!response.ok) {
        const failure = await response.clone().json().catch(() => ({}));
        if (failure.safe_to_retry) {
          request.current = null;
          sessionStorage.removeItem(storageKey);
        }
        throw new Error(await extractErrorMessage(response, "Unable to switch backend"));
      }
      const destination = await response.json();
      sessionStorage.removeItem(storageKey);
      request.current = null;
      onContinued(destination);
      toast.success(`Continued with ${backend === "codex" ? "Codex" : "Claude Code"}`);
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Connection lost. Retry to recover the same continuation.");
    } finally {
      setSwitching(false);
    }
  };
  return (
    <DropdownMenuSub onOpenChange={(open) => { if (open) void load(); }}>
      <DropdownMenuSubTrigger disabled={switching} className="gap-2">
        {switching ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Repeat2 className="h-4 w-4" />}
        {switching ? "Preparing continuation…" : "Switch backend"}
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent className="w-72">
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            Creates a new thread with conversation context.
          </DropdownMenuLabel>
          {loading ? <DropdownMenuItem disabled>Checking backends…</DropdownMenuItem> : null}
          {error ? <DropdownMenuItem disabled className="whitespace-normal">{error}</DropdownMenuItem> : null}
          {!loading && !error && options.map((option) => (
            <DropdownMenuItem key={option.backend} disabled={Boolean(option.reason) || switching}
              onSelect={(event) => { event.preventDefault(); void switchBackend(option.backend); }}
              className="flex items-start gap-2">
              <Check className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${option.current ? "" : "invisible"}`} />
              <span>{option.label}{option.reason && !option.current ? (
                <span className="block text-xs text-muted-foreground">{option.reason}</span>
              ) : null}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  );
}
