import type { ThreadStatus } from "@/types/session";

const statusConfig: Record<
  ThreadStatus,
  { label: string; dot: string; text: string }
> = {
  running: { label: "running", dot: "bg-info", text: "text-info" },
  waiting: { label: "waiting", dot: "bg-warning", text: "text-warning" },
  completed: { label: "done", dot: "bg-success", text: "text-success" },
  error: { label: "error", dot: "bg-destructive", text: "text-destructive" },
  idle: {
    label: "idle",
    dot: "bg-muted-foreground/50",
    text: "text-muted-foreground",
  },
};

export function StatusBadge({ status }: { status: ThreadStatus }) {
  const config = statusConfig[status] || statusConfig.idle;
  return (
    <span
      className={`inline-flex items-center gap-1 font-mono text-[10.5px] ${config.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
