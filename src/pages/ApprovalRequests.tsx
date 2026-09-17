import { ApprovalRequestParameters } from "@/components/approvals/ApprovalRequestParameters";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import {
  ResourceEmptyState,
  ResourceError,
  ResourceLoading,
  ResourcePageHeader,
} from "@/components/resource/ResourcePage";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { useApprovalRequestsWebSocket } from "@/hooks/use-approval-requests-websocket";
import { useMarkKindReadWhileMounted } from "@/contexts/notifications";
import { apiFetch } from "@/lib/api";
import { extractErrorMessage } from "@/lib/api-errors";
import { approvalRequestKey, type ApprovalRequest } from "@/lib/approval-requests";
import { fleetApiPath } from "@/lib/fleet";
import { trackProductAnalytics } from "@/lib/product-analytics";
import { Check, ExternalLink, ShieldAlert, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

type ApprovalDecision = "accept" | "decline";

const POLL_MS = 5000;

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function requestLabel(request: ApprovalRequest): string {
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

function formatReceivedAt(value?: string | null): string {
  if (!value) return "pending";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const ApprovalRequests = () => {
  // Viewing the queue counts as reading approval notifications, including
  // ones that arrive while the page is open.
  useMarkKindReadWhileMounted("approval");
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingKey, setActingKey] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await apiFetch("/api/approval-requests/?scope=fleet");
      if (!res.ok) {
        throw new Error(
          await extractErrorMessage(res, "Unable to load approval requests."),
        );
      }
      const data = await res.json();
      setRequests(Array.isArray(data.requests) ? data.requests : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reach the local API.");
    }
    setLoading(false);
  }, []);

  // The socket only carries this backend's approvals; peer items arrive via
  // the fleet poll, so a live snapshot replaces local rows and keeps peers.
  const applyLiveSnapshot = useCallback((nextRequests: ApprovalRequest[]) => {
    setRequests((prev) => [
      ...nextRequests,
      ...prev.filter((item) => item.origin_host),
    ]);
    setError(null);
    setLoading(false);
  }, []);
  const live = useApprovalRequestsWebSocket({ onSnapshot: applyLiveSnapshot });

  useEffect(() => {
    void fetchRequests();
    // Poll even while the local socket is live: approvals pending on other
    // devices only surface through the fleet-scoped list.
    const interval = window.setInterval(() => void fetchRequests(), POLL_MS);
    return () => window.clearInterval(interval);
  }, [fetchRequests]);

  const answerRequest = async (
    request: ApprovalRequest,
    decision: ApprovalDecision,
  ) => {
    const requestId = String(request.id);
    const requestKey = approvalRequestKey(request);
    const key = `${requestKey}:${decision}`;
    setActingKey(key);
    try {
      // Answers go DIRECTLY to the device the approval is pending on.
      const res = await apiFetch(
        fleetApiPath(
          request.origin_host,
          `/api/approval-requests/${encodeURIComponent(requestId)}/`,
        ),
        {
          method: "POST",
          body: JSON.stringify({ decision }),
        },
      );
      if (!res.ok) {
        throw new Error(
          await extractErrorMessage(res, `Unable to ${decision} request.`),
        );
      }
      const receivedAt = request.received_at
        ? new Date(request.received_at).getTime()
        : Number.NaN;
      trackProductAnalytics("approval_resolved", {
        decision,
        request_type: request.params?.source === "skill" ? "skill" : "tool",
        response_duration_ms: Number.isFinite(receivedAt)
          ? Math.max(0, Date.now() - receivedAt)
          : undefined,
      });
      setRequests((prev) =>
        prev.filter((item) => approvalRequestKey(item) !== requestKey),
      );
      toast.success(decision === "accept" ? "Approved" : "Denied");
      void fetchRequests();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to answer request.");
    } finally {
      setActingKey(null);
    }
  };

  const pendingCount = requests.length;
  const sortedRequests = useMemo(
    () =>
      [...requests].sort((a, b) =>
        String(a.received_at ?? "").localeCompare(String(b.received_at ?? "")),
      ),
    [requests],
  );

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <ResourcePageHeader
          title="Approval requests"
          loading={loading}
          onRefresh={() => void fetchRequests()}
          subtitle={`${pendingCount} pending · all devices · ${live ? "live updates" : "auto-refresh 5s"}`}
        />

        <ResourceError message={error} />

        {loading && sortedRequests.length === 0 ? (
          <ResourceLoading>Loading...</ResourceLoading>
        ) : sortedRequests.length === 0 ? (
          <ResourceEmptyState icon={ShieldAlert} className="py-8">
            No pending approvals.
          </ResourceEmptyState>
        ) : (
          <Panel>
            {sortedRequests.map((request, idx) => {
              const requestId = String(request.id);
              return (
                <div
                  key={approvalRequestKey(request)}
                  className={`grid gap-3 px-3 py-3 md:grid-cols-[minmax(0,1fr)_auto] ${
                    idx > 0 ? "border-t border-border" : ""
                  }`}
                >
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

                  <div className="flex items-start gap-2 md:justify-end">
                    <Button
                      size="sm"
                      className="h-7 px-2.5 text-[12px]"
                      onClick={() => void answerRequest(request, "accept")}
                      disabled={actingKey !== null}
                    >
                      <Check className="h-3 w-3" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2.5 text-[12px]"
                      onClick={() => void answerRequest(request, "decline")}
                      disabled={actingKey !== null}
                    >
                      <X className="h-3 w-3" />
                      Deny
                    </Button>
                  </div>
                </div>
              );
            })}
          </Panel>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ApprovalRequests;
