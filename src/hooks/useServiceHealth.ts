import { apiFetch } from "@/lib/api";
import type { ServiceStatus } from "@/types/session";
import { useCallback, useEffect, useState } from "react";

const POLL_MS = 30_000;

export interface ServiceHealth {
  /** Null until the first successful fetch. */
  required: number | null;
  healthy: number;
  /** Display names of required services that are not running. */
  unhealthy: string[];
}

/**
 * Summarises `/api/status/` into "N of M required checks healthy". Polled
 * every 30s while the tab is visible and on focus; used by the sidebar's
 * System group.
 */
export function useServiceHealth(): ServiceHealth {
  const [health, setHealth] = useState<ServiceHealth>({
    required: null,
    healthy: 0,
    unhealthy: [],
  });

  const fetchHealth = useCallback(async () => {
    try {
      const res = await apiFetch("/api/status/", {
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) return;
      const payload = (await res.json()) as {
        services?: Record<string, ServiceStatus>;
      };
      const required = Object.values(payload.services ?? {}).filter(
        (service) => !service.optional,
      );
      setHealth({
        required: required.length,
        healthy: required.filter((service) => service.running).length,
        unhealthy: required
          .filter((service) => !service.running)
          .map((service) => service.name),
      });
    } catch {
      // Keep the last known state; the Status page reports fetch errors.
    }
  }, []);

  useEffect(() => {
    void fetchHealth();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void fetchHealth();
    }, POLL_MS);
    const refresh = () => {
      if (document.visibilityState === "visible") void fetchHealth();
    };
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [fetchHealth]);

  return health;
}
