import { apiFetch } from "@/lib/api";
import { AlertTriangle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const POLL_MS = 30_000;

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

  const fetchWarnings = useCallback(async () => {
    try {
      const res = await apiFetch("/api/health/warnings/");
      if (!res.ok) return; // Backend down is surfaced elsewhere; stay quiet.
      const payload = (await res.json()) as { warnings?: HealthWarning[] };
      setWarnings(Array.isArray(payload.warnings) ? payload.warnings : []);
    } catch {
      // Unreachable local API: other surfaces handle connectivity errors.
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
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchWarnings]);

  if (warnings.length === 0) return null;

  return (
    <div className="shrink-0 space-y-1 border-b border-border px-3 py-1.5 md:px-4">
      {warnings.map((warning) => (
        <div
          key={warning.id}
          className={
            warning.severity === "critical"
              ? "flex items-start gap-2 rounded border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-[12px] text-destructive"
              : "flex items-start gap-2 rounded border border-warning/40 bg-warning/10 px-3 py-1.5 text-[12px] text-warning-foreground"
          }
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0">
            {warning.message}
            {warning.action ? (
              <span className="opacity-75"> {warning.action}</span>
            ) : null}
          </span>
        </div>
      ))}
    </div>
  );
}

export default HealthWarningsBanner;
