import { ApprovalRequestParameters } from "@/components/approvals/ApprovalRequestParameters";
import type { ApprovalRequest } from "@/lib/approval-requests";
import { ExternalLink, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function requestLabel(request: ApprovalRequest): string {
  const params = request.params ?? {};
  return (
    stringValue(params.description) ??
    stringValue(params.command) ??
    stringValue(params.toolName) ??
    stringValue(params.tool_name) ??
    stringValue(params.name) ??
    request.method ??
    "Approval request"
  );
}

export function formatReceivedAt(value?: string | null): string {
  if (!value) return "pending";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

type ApprovalRequestSummaryProps = {
  request: ApprovalRequest;
};

/** Label, metadata, and parameters for one approval, shared by the list rows
 * and the card-swipe interface. */
export function ApprovalRequestSummary({ request }: ApprovalRequestSummaryProps) {
  const requestId = String(request.id);
  return (
    <div className="min-w-0">
      <div className="flex min-w-0 items-center gap-2">
        <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-warning" />
        <span
          className="min-w-0 truncate text-[12.5px] font-medium text-foreground"
          title={requestLabel(request)}
        >
          {requestLabel(request)}
        </span>
        <span className="shrink-0 font-mono text-[10.5px] text-muted-foreground">
          {formatReceivedAt(request.received_at)}
        </span>
        {request.origin_device ? (
          <span
            className="shrink-0 rounded-sm bg-surface-muted px-1 font-mono text-[10px] text-muted-foreground"
            title={`Pending on ${request.origin_device}`}
          >
            {request.origin_device}
          </span>
        ) : null}
      </div>
      <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10.5px] text-muted-foreground/70">
        <span className="truncate">id {requestId}</span>
        {request.thread_id ? (
          <Link
            to={`/dashboard/threads/${encodeURIComponent(request.thread_id)}`}
            className="inline-flex max-w-[18rem] items-center gap-1 truncate text-info hover:underline"
          >
            <span className="truncate">{request.thread_id}</span>
            <ExternalLink className="h-3 w-3 shrink-0" />
          </Link>
        ) : null}
        {request.turn_id ? (
          <span className="truncate">turn {request.turn_id}</span>
        ) : null}
        {request.method ? (
          <span className="truncate">{request.method}</span>
        ) : null}
      </div>
      {request.params ? (
        <ApprovalRequestParameters params={request.params} />
      ) : null}
    </div>
  );
}
