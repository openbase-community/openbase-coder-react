import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { CheckCircle2, Download } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import {
  extractErrorMessage,
  type OpenbaseHooksResponse,
} from "./settingsApi";

/**
 * Git provenance hooks: a SessionStart hook in each managed backend home that
 * tells agents their own session ID, so commits carry an Agent-Thread-Id
 * trailer tying them back to the agent session that produced them.
 */
export const OpenbaseHooksSettings: React.FC = () => {
  const [status, setStatus] = useState<OpenbaseHooksResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/settings/openbase-hooks/");
      if (!res.ok) {
        setError(
          await extractErrorMessage(
            res,
            `Unable to load hook status: ${res.status}`,
          ),
        );
        setLoading(false);
        return;
      }
      setStatus((await res.json()) as OpenbaseHooksResponse);
      setError(null);
    } catch {
      setError("Unable to reach the local API.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  const installHooks = useCallback(async () => {
    setInstalling(true);
    try {
      const res = await apiFetch("/api/settings/openbase-hooks/", {
        method: "POST",
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        setError(
          await extractErrorMessage(
            res,
            `Unable to install the hooks: ${res.status}`,
          ),
        );
        setInstalling(false);
        return;
      }
      setStatus((await res.json()) as OpenbaseHooksResponse);
      setError(null);
    } catch {
      setError("Unable to reach the local API.");
    }
    setInstalling(false);
  }, []);

  const installed = status?.installed === true;
  const statusLabel = loading
    ? "Checking…"
    : installed
      ? "Installed"
      : status
        ? "Not installed"
        : "Unknown";

  return (
    <div className="overflow-hidden rounded border border-border bg-surface">
      <div className="border-b border-border px-3 py-2.5">
        <p className="text-[12.5px] font-medium text-foreground">
          Openbase hooks
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Git provenance hooks that tell agents their session ID, so commits
          carry an Agent-Thread-Id trailer linking them to the agent session
          that made them.
        </p>
      </div>
      <div className="space-y-2 px-3 py-3">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-[12px] text-foreground">
            {installed ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            ) : null}
            {statusLabel}
            {!loading && status && !installed ? (
              <span className="text-muted-foreground">
                {" — "}
                {status.backends.claude.installed ? "Codex" : status.backends.codex.installed ? "Claude Code" : "Claude Code and Codex"}{" "}
                missing the session-ID hook
              </span>
            ) : null}
          </p>
          {!installed ? (
            <Button
              size="sm"
              className="h-8 shrink-0 px-2.5 text-[12px]"
              onClick={() => {
                void installHooks();
              }}
              disabled={loading || installing}
            >
              <Download className="h-3 w-3" />
              {installing ? "Installing…" : "Install hooks"}
            </Button>
          ) : null}
        </div>
        {error ? <p className="text-[12px] text-destructive">{error}</p> : null}
      </div>
    </div>
  );
};
