import { RuntimeFreshnessWarning } from "@/components/RuntimeFreshnessWarning";
import { developerFreshnessEnabled, freshnessRequest, unavailableFreshness, type RuntimeFreshness } from "@/lib/runtime-freshness";
import { apiFetch } from "@/lib/api";
import { AlertTriangle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const POLL_MS = 30_000;

const SYNC_SETTINGS_PATH = "/dashboard/sync";

/** Sync-related warnings can be resolved from the sync settings page. */
const isSyncWarning = (warning: HealthWarning) => warning.id.startsWith("sync");

export interface HealthWarning {
  id: string;
  severity: "warning" | "critical";
  message: string;
  action?: string;
}

/**
 * Top-of-console banner for expectation failures: services the current
 * configuration expects that are not healthy, and sync-specific problems
 * (peer disconnected, engine unreachable, missing tailscale identity,
 * broken managed ignores). Renders nothing while everything is healthy.
 */
export function HealthWarningsBanner() {
  const [warnings, setWarnings] = useState<HealthWarning[]>([]);
  const navigate = useNavigate();
  const inFlight = useRef(false);
  const [freshness, setFreshness] = useState<RuntimeFreshness | null>(null);

  const fetchWarnings = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    const developer = developerFreshnessEnabled();
    try {
      const init = developer ? {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(await freshnessRequest()),
      } : undefined;
      let res = await apiFetch("/api/health/warnings/", { ...init, signal: AbortSignal.timeout(10_000) });
      if (developer && (res.status === 404 || res.status === 405)) {
        setFreshness(unavailableFreshness());
        res = await apiFetch("/api/health/warnings/", { signal: AbortSignal.timeout(10_000) });
      }
      if (!res.ok) {
        if (developer) setFreshness(unavailableFreshness());
        return;
      }
      const payload = (await res.json()) as { warnings?: HealthWarning[]; freshness?: RuntimeFreshness };
      setWarnings(Array.isArray(payload.warnings) ? payload.warnings : []);
      setFreshness(developer ? payload.freshness ?? unavailableFreshness() : null);
    } catch {
      if (developer) setFreshness(unavailableFreshness());
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    void fetchWarnings();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void fetchWarnings();
    }, POLL_MS);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void fetchWarnings();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
    };
  }, [fetchWarnings]);

  if (warnings.length === 0 && (!freshness?.enabled || freshness.components.every((item) => item.state === "current"))) return null;

  return (
    <div className="shrink-0 space-y-1 px-3 py-1.5 md:px-4">
      <RuntimeFreshnessWarning freshness={freshness} />
      {warnings.map((warning) => {
        const clickable = isSyncWarning(warning);
        const base =
          warning.severity === "critical"
            ? "flex w-full items-start gap-2 rounded border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-left text-[12px] text-destructive"
            : "flex w-full items-start gap-2 rounded border border-warning/40 bg-warning/10 px-3 py-1.5 text-left text-[12px] text-warning";
        const content = (
          <>
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0">
              {warning.message}
              {warning.action ? (
                <span className="opacity-75"> {warning.action}</span>
              ) : null}
              {clickable ? (
                <span className="ml-1 font-medium underline underline-offset-2">
                  Open sync settings
                </span>
              ) : null}
            </span>
          </>
        );

        if (clickable) {
          return (
            <button
              key={warning.id}
              type="button"
              onClick={() => navigate(SYNC_SETTINGS_PATH)}
              title="Open sync settings to manage sync peers"
              className={`${base} cursor-pointer transition-colors hover:brightness-110`}
            >
              {content}
            </button>
          );
        }

        return (
          <div key={warning.id} className={base}>
            {content}
          </div>
        );
      })}
    </div>
  );
}

export default HealthWarningsBanner;
