import { apiFetch } from "@/lib/api";
import { useEffect, useState } from "react";

/**
 * The `versions` block from GET /api/onboarding/status/ (see the workspace
 * AUTO_UPDATE.md version handshake).
 */
export type CliVersions = {
  cli?: string;
  standalone?: boolean;
  channel?: string;
  layout_version?: number;
  target?: string;
  package_version?: string;
  update_available?: boolean;
  update_required?: boolean;
  latest_version?: string;
};

let cachedVersions: CliVersions | null | undefined;
let pendingFetch: Promise<CliVersions | null> | null = null;

async function fetchCliVersions(): Promise<CliVersions | null> {
  try {
    const response = await apiFetch("/api/onboarding/status/");
    if (!response.ok) {
      return null;
    }
    const payload = await response.json();
    return payload && typeof payload === "object" && payload.versions
      ? (payload.versions as CliVersions)
      : null;
  } catch {
    // Backend unreachable or too old to report versions; show nothing.
    return null;
  }
}

/**
 * CLI version info for passive display (e.g. the sidebar footer). Fetched at
 * most once per page load and cached module-wide, so remounting layouts on
 * navigation never re-hits the backend and never re-checks the update feed.
 */
export function useCliVersions(): CliVersions | null {
  const [versions, setVersions] = useState<CliVersions | null>(
    cachedVersions ?? null,
  );

  useEffect(() => {
    if (cachedVersions !== undefined) {
      return undefined;
    }
    if (!pendingFetch) {
      pendingFetch = fetchCliVersions();
    }
    let cancelled = false;
    void pendingFetch.then((result) => {
      cachedVersions = result;
      if (!cancelled) {
        setVersions(result);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return versions;
}
