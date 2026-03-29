import { Badge } from "@/components/ui/badge";
import type { SessionStatus } from "@/types/session";

const statusConfig: Record<SessionStatus, { label: string; className: string }> = {
  running: { label: "Running", className: "bg-blue-500 text-white border-blue-500" },
  completed: { label: "Completed", className: "bg-green-500 text-white border-green-500" },
  error: { label: "Error", className: "bg-red-500 text-white border-red-500" },
  idle: { label: "Idle", className: "bg-gray-400 text-white border-gray-400" },
};

export function StatusBadge({ status }: { status: SessionStatus }) {
  const config = statusConfig[status] || statusConfig.idle;
  return <Badge className={config.className}>{config.label}</Badge>;
}
