import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  CircleSlash,
  Loader2,
  WifiOff,
} from "lucide-react";
import React from "react";
import type { HealthTone, SyncHealth } from "./syncHealth";

const toneClass: Record<HealthTone, string> = {
  ok: "border-success/30 bg-success/10",
  busy: "border-border bg-muted/30",
  warn: "border-warning/40 bg-warning/10",
  error: "border-destructive/40 bg-destructive/10",
  neutral: "border-border bg-muted/20",
};

const ToneIcon: React.FC<{ tone: HealthTone }> = ({ tone }) => {
  const className = "mt-0.5 h-4 w-4 shrink-0";
  switch (tone) {
    case "ok":
      return <CheckCircle2 className={cn(className, "text-success")} />;
    case "busy":
      return <Loader2 className={cn(className, "animate-spin text-muted-foreground")} />;
    case "warn":
      return <AlertTriangle className={cn(className, "text-warning")} />;
    case "error":
      return <CircleSlash className={cn(className, "text-destructive")} />;
    default:
      return <WifiOff className={cn(className, "text-muted-foreground")} />;
  }
};

/** The answer to "is my sync healthy, and what needs me?" */
export const SyncStatusBanner: React.FC<{
  health: SyncHealth;
  attention?: { conflicts: number; staleLocks: number | null };
}> = ({ health, attention }) => (
  <div
    role="status"
    aria-label="Sync status"
    className={cn("space-y-1.5 rounded border p-3", toneClass[health.tone])}
  >
    <div className="flex items-start gap-2">
      <ToneIcon tone={health.tone} />
      <div className="min-w-0 space-y-0.5">
        <div className="text-sm font-semibold">{health.title}</div>
        {health.lines.map((line) => (
          <p key={line} className="text-xs text-muted-foreground">
            {line}
          </p>
        ))}
      </div>
    </div>
    {health.progress != null ? (
      <div
        className="h-1.5 overflow-hidden rounded bg-muted"
        role="progressbar"
        aria-label="Sync progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(health.progress * 100)}
      >
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${Math.round(health.progress * 100)}%` }}
        />
      </div>
    ) : null}
    {attention && (attention.conflicts || attention.staleLocks) ? (
      <div className="flex flex-wrap gap-3 pl-6 text-xs">
        {attention.conflicts ? (
          <a className="underline underline-offset-2" href="#sync-conflicts">
            Review conflicts
          </a>
        ) : null}
        {attention.staleLocks ? (
          <a className="underline underline-offset-2" href="#sync-stale-locks">
            Review stale git locks
          </a>
        ) : null}
      </div>
    ) : null}
  </div>
);
