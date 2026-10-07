import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { apiFetch } from "@/lib/api";
import { extractErrorMessage } from "@/lib/api-errors";
import { Laptop, Radio, RefreshCw, Server } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export type SyncPairingCandidate = {
  id: string;
  name: string;
  host: string;
  reachable: boolean;
  role: "hub" | "edge" | "none" | "unknown";
  hub_host?: string | null;
  hub_name?: string | null;
  error?: string | null;
};

export type SyncPairingCandidates = {
  signed_in: boolean;
  role: string;
  candidates: SyncPairingCandidate[];
};

const roleLabel = (candidate: SyncPairingCandidate): string => {
  if (!candidate.reachable) return "offline";
  switch (candidate.role) {
    case "hub":
      return "always-on";
    case "edge":
      return "syncing";
    case "none":
      return "not syncing";
    default:
      return "unknown";
  }
};

const postJson = (path: string, body: unknown = {}) =>
  apiFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

/** Shown while this computer is not syncing: pick or become the hub. */
export const SyncPairingSetup: React.FC<{
  onChanged: () => void | Promise<void>;
}> = ({ onChanged }) => {
  const [data, setData] = useState<SyncPairingCandidates | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/sync/daemon/pairing/candidates/");
      if (!res.ok) {
        throw new Error(
          await extractErrorMessage(res, "Unable to list your computers."),
        );
      }
      setData((await res.json()) as SyncPairingCandidates);
      setLoadError(null);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Unable to list your computers.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (
    key: string,
    path: string,
    body: unknown,
    success: string,
    fallback: string,
  ) => {
    setBusy(key);
    try {
      const res = await postJson(path, body);
      if (!res.ok) {
        throw new Error(await extractErrorMessage(res, fallback));
      }
      toast.success(success);
      await onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : fallback);
    } finally {
      setBusy(null);
    }
  };

  const becomeHub = () =>
    run(
      "hub",
      "/api/sync/daemon/pairing/hub/",
      {},
      "This computer is now your always-on computer.",
      "Unable to set up this computer.",
    );

  const join = (candidate: SyncPairingCandidate) =>
    run(
      candidate.id,
      "/api/sync/daemon/pairing/join/",
      { hub: candidate.id },
      `Syncing with ${candidate.name}.`,
      `Unable to sync with ${candidate.name}.`,
    );

  const candidates = data?.candidates ?? [];
  const hubs = candidates.filter(
    (candidate) => candidate.reachable && candidate.role === "hub",
  );
  const signedOut = data?.signed_in === false;

  return (
    <Panel className="space-y-3 p-4">
      <div className="flex items-center gap-2">
        <Radio className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-base font-semibold">Openbase Sync</h2>
        <Badge variant="outline">not syncing</Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        This computer is not syncing. Add an always-on computer to sync.
      </p>

      <div className="space-y-2 rounded border p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-medium">Sync with…</div>
          <Button
            size="sm"
            variant="ghost"
            aria-label="Refresh computers"
            disabled={loading}
            onClick={() => void load()}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
        {loading && !data ? (
          <p className="text-xs text-muted-foreground">
            Looking for your computers…
          </p>
        ) : loadError ? (
          <p className="text-xs text-destructive">{loadError}</p>
        ) : data && !data.signed_in ? (
          <p className="text-xs text-muted-foreground">
            Sign in to Openbase to see your other computers.
          </p>
        ) : (
          <>
            {candidates.length > 0 ? (
              <ul className="space-y-1.5">
                {candidates.map((candidate) => (
                  <li
                    key={candidate.id}
                    className="flex flex-wrap items-center justify-between gap-2 text-sm"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Laptop className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{candidate.name}</span>
                      <Badge
                        variant={
                          candidate.role === "hub" ? "default" : "secondary"
                        }
                      >
                        {roleLabel(candidate)}
                      </Badge>
                    </div>
                    {candidate.reachable && candidate.role === "hub" ? (
                      <Button
                        size="sm"
                        disabled={busy !== null}
                        onClick={() => void join(candidate)}
                      >
                        {busy === candidate.id
                          ? "Connecting…"
                          : "Sync with this"}
                      </Button>
                    ) : candidate.error ? (
                      <span className="text-xs text-muted-foreground">
                        {candidate.error}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
            {hubs.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No always-on computer yet. Set one up first: on the computer
                that stays on (for example a Mac mini), open Sync and choose
                “Make this my always-on computer”.
              </p>
            ) : null}
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded border p-3">
        <Server className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">This computer stays on?</div>
          <p className="text-xs text-muted-foreground">
            Make it the always-on computer your other computers sync with. It
            syncs ~/Projects plus your Openbase threads and skills.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={busy !== null || signedOut}
          onClick={() => void becomeHub()}
        >
          {busy === "hub" ? "Setting up…" : "Make this my always-on computer"}
        </Button>
      </div>
    </Panel>
  );
};
