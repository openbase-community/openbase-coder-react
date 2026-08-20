import type { ThreadStatus } from "@/types/session";
import {
  AlertCircle,
  CircleDashed,
  Loader2,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

/**
 * Icon-only status marker with a hover tooltip. Work-in-flight spins; the
 * terminal states get distinct glyphs. "completed" is intentionally absent —
 * a finished turn/thread shows no marker rather than a redundant "Done".
 */
const STATUS_ICON: Partial<
  Record<
    ThreadStatus,
    { icon: LucideIcon; label: string; spin?: boolean; className: string }
  >
> = {
  running: { icon: Loader2, label: "Running", spin: true, className: "text-info" },
  waiting: {
    icon: Loader2,
    label: "Waiting",
    spin: true,
    className: "text-warning",
  },
  error: { icon: AlertCircle, label: "Error", className: "text-destructive" },
  idle: {
    icon: CircleDashed,
    label: "Idle",
    className: "text-muted-foreground",
  },
};

export function StatusBadge({
  status,
  isLikelyStale = false,
  statusWarning,
}: {
  status: ThreadStatus;
  isLikelyStale?: boolean;
  statusWarning?: string | null;
}) {
  if (isLikelyStale || statusWarning) {
    return (
      <span
        title={statusWarning || "Likely stale turn"}
        aria-label="Stale"
        className="inline-flex text-warning"
      >
        <TriangleAlert className="h-3.5 w-3.5" />
      </span>
    );
  }

  const config = STATUS_ICON[status];
  if (!config) return null;
  const Icon = config.icon;
  return (
    <span
      title={config.label}
      aria-label={config.label}
      className={`inline-flex ${config.className}`}
    >
      <Icon className={`h-3.5 w-3.5 ${config.spin ? "animate-spin" : ""}`} />
    </span>
  );
}
