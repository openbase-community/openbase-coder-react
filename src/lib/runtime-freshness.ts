import "@/lib/runtime-config";

export interface BuildProvenance {
  schema_version: number;
  component: string;
  workspace_id: string;
  revisions: Record<string, string | null>;
  verified: boolean;
}

export interface FreshnessComponent {
  component: string;
  state: "current" | "stale" | "unknown";
  reason: string;
  action: string;
}

export interface RuntimeFreshness {
  enabled: boolean;
  checked_at?: number;
  coverage?: string;
  components: FreshnessComponent[];
}

declare const __OPENBASE_BUILD_PROVENANCE__: BuildProvenance | null;
declare global {
  interface Window {
    __OPENBASE_DEV_PROVENANCE__?: {
      getMain: () => Promise<BuildProvenance | null>;
    };
  }
}

export const loadedBuild = typeof __OPENBASE_BUILD_PROVENANCE__ === "undefined"
  ? null : __OPENBASE_BUILD_PROVENANCE__;

export function developerFreshnessEnabled() {
  const config = window.__OPENBASE_RUNTIME_CONFIG__;
  if (config?.nonDeveloperInstall) return false;
  return Boolean(loadedBuild || (config?.shell === "electron" && config.nonDeveloperInstall === false));
}

export async function freshnessRequest() {
  const desktop = window.__OPENBASE_RUNTIME_CONFIG__?.shell === "electron";
  const main = desktop ? await window.__OPENBASE_DEV_PROVENANCE__?.getMain() : undefined;
  return { component: desktop ? "desktop" : "console", build: loadedBuild, main };
}

export function unavailableFreshness(): RuntimeFreshness {
  return {
    enabled: true,
    components: [{
      component: "Development freshness",
      state: "unknown",
      reason: "The backend could not verify running versions.",
      action: "Check connectivity; restart the developer backend if it predates freshness checks.",
    }],
  };
}
