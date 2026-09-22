import type { HealthWarning } from "@/hooks/useHealthWarnings";
import { AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export type { HealthWarning } from "@/hooks/useHealthWarnings";

const SYNC_SETTINGS_PATH = "/dashboard/sync";

/** Sync-related warnings can be resolved from the sync settings page. */
const isSyncWarning = (warning: HealthWarning) => warning.id.startsWith("sync");

/**
 * Top-of-console banner for expectation failures: services the current
 * configuration expects that are not healthy, and sync-specific problems
 * (peer disconnected, engine unreachable, missing tailscale identity,
 * broken managed ignores). Renders nothing while everything is healthy.
 * The developer runtime-freshness note lives in the header instead (see
 * RuntimeFreshnessWarning); the dashboard chrome feeds both from
 * useHealthWarnings.
 */
export function HealthWarningsBanner({ warnings }: { warnings: HealthWarning[] }) {
  const navigate = useNavigate();

  if (warnings.length === 0) return null;

  return (
    <div className="shrink-0 space-y-1 px-3 py-1.5 md:px-4">
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
