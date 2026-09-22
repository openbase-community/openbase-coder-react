import { apiFetch } from "@/lib/api";
import {
  developerFreshnessEnabled,
  freshnessRequest,
  unavailableFreshness,
  type RuntimeFreshness,
} from "@/lib/runtime-freshness";
import { useCallback, useEffect, useRef, useState } from "react";

const POLL_MS = 30_000;

export interface HealthWarning {
  id: string;
  severity: "warning" | "critical";
  message: string;
  action?: string;
}

/**
 * Polls `/api/health/warnings/` (every 30s while visible, and on focus) and
 * returns the expectation failures plus, for developer installs, the runtime
 * freshness report. Owned by the dashboard chrome so the header freshness
 * note and the warnings banner share one request.
 */
export function useHealthWarnings() {
  const [warnings, setWarnings] = useState<HealthWarning[]>([]);
  const [freshness, setFreshness] = useState<RuntimeFreshness | null>(null);
  const inFlight = useRef(false);

  const fetchWarnings = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    const developer = developerFreshnessEnabled();
    try {
      const init = developer
        ? {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(await freshnessRequest()),
          }
        : undefined;
      let res = await apiFetch("/api/health/warnings/", {
        ...init,
        signal: AbortSignal.timeout(10_000),
      });
      if (developer && (res.status === 404 || res.status === 405)) {
        setFreshness(unavailableFreshness());
        res = await apiFetch("/api/health/warnings/", {
          signal: AbortSignal.timeout(10_000),
        });
      }
      if (!res.ok) {
        if (developer) setFreshness(unavailableFreshness());
        return;
      }
      const payload = (await res.json()) as {
        warnings?: HealthWarning[];
        freshness?: RuntimeFreshness;
      };
      setWarnings(Array.isArray(payload.warnings) ? payload.warnings : []);
      setFreshness(
        developer ? (payload.freshness ?? unavailableFreshness()) : null,
      );
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

  return { warnings, freshness };
}
