import DashboardLayout from "@/components/layouts/DashboardLayout";
import {
  ResourceEmptyState,
  ResourceError,
  ResourceLoading,
  ResourcePageHeader,
} from "@/components/resource/ResourcePage";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth";
import { apiFetch } from "@/lib/api";
import { getBackendWebSocketUrl } from "@/lib/runtime-config";
import { Check, ExternalLink, ShieldAlert, X } from "lucide-react";
import type { ApprovalDecision, ApprovalRequest } from "open-approvals-react";
import {
  formatReceivedAt,
  requestDetail,
  requestLabel,
  useApprovalRequests,
} from "open-approvals-react";
import { useCallback } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const ApprovalRequests = () => {
  const { token } = useAuth();
  const createSocket = useCallback(() => {
    if (!token) return null;
    return new WebSocket(
      `${getBackendWebSocketUrl("/ws/approval-requests/")}?token=${token}`,
    );
  }, [token]);
  const { requests, loading, error, live, actingKey, refresh, answer } =
    useApprovalRequests({ fetchFn: apiFetch, createSocket });

  const answerRequest = async (
    request: ApprovalRequest,
    decision: ApprovalDecision,
  ) => {
    const result = await answer(request, decision);
    if (result.ok) {
      toast.success(decision === "accept" ? "Approved" : "Denied");
    } else {
      toast.error(result.error);
    }
  };

  const pendingCount = requests.length;

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <ResourcePageHeader
          title="Approval requests"
          loading={loading}
          onRefresh={() => void refresh()}
          subtitle={`${pendingCount} pending · ${live ? "live updates" : "auto-refresh 5s"}`}
        />

        <ResourceError message={error} />

        {loading && requests.length === 0 ? (
          <ResourceLoading>Loading...</ResourceLoading>
        ) : requests.length === 0 ? (
          <ResourceEmptyState icon={ShieldAlert} className="py-8">
            No pending approvals.
          </ResourceEmptyState>
        ) : (
          <div className="overflow-hidden rounded border border-border bg-surface">
            {requests.map((request, idx) => {
              const requestId = String(request.id);
              const detail = requestDetail(request);
              return (
                <div
                  key={requestId}
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
                    {detail ? (
                      <p className="mt-2 line-clamp-2 text-[12px] text-muted-foreground">
                        {detail}
                      </p>
                    ) : null}
                    {request.params ? (
                      <pre className="mt-2 max-h-28 overflow-auto rounded border border-border bg-background px-2 py-1.5 font-mono text-[10.5px] text-muted-foreground">
                        {JSON.stringify(request.params, null, 2)}
                      </pre>
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
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ApprovalRequests;
