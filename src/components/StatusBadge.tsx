import type { ThreadStatus } from "@/types/session";

const statusConfig: Record<
  ThreadStatus,
  { label: string; dot: string; text: string }
> = {
  running: { label: "Running", dot: "bg-info", text: "text-info" },
  waiting: { label: "Waiting", dot: "bg-warning", text: "text-warning" },
  completed: { label: "Done", dot: "bg-success", text: "text-success" },
  error: { label: "Error", dot: "bg-destructive", text: "text-destructive" },
  idle: {
    label: "Idle",
    dot: "bg-muted-foreground/50",
    text: "text-muted-foreground",
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
  const config =
    isLikelyStale || statusWarning
      ? { label: "Stale", dot: "bg-warning", text: "text-warning" }
      : statusConfig[status] || statusConfig.idle;
  return (
    <span
      title={statusWarning || (isLikelyStale ? "Likely stale turn" : undefined)}
      className={`inline-flex items-center gap-1 font-mono text-[10.5px] ${config.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
