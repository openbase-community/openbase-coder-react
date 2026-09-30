import { ApprovalCardStack } from "@/components/approvals/ApprovalCardStack";
import { ApprovalRequestSummary } from "@/components/approvals/ApprovalRequestSummary";
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
import {
  answerApprovalRequest,
  approvalRequestKey,
  type ApprovalRequest,
} from "@/lib/approval-requests";
import {
  APPROVAL_REVIEW_PREFERENCES_EVENT,
  readApprovalReviewMode,
} from "@/lib/approval-review-preferences";
import { trackProductAnalytics } from "@/lib/product-analytics";
import { Check, ShieldAlert, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type ApprovalDecision = "accept" | "decline";

const POLL_MS = 5000;

const ApprovalRequests = () => {
  // Viewing the queue counts as reading approval notifications, including
  // ones that arrive while the page is open.
  useMarkKindReadWhileMounted("approval");
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingKey, setActingKey] = useState<string | null>(null);
  const [reviewMode, setReviewMode] = useState(() => readApprovalReviewMode());

  useEffect(() => {
    const refreshReviewMode = () => setReviewMode(readApprovalReviewMode());
    window.addEventListener(APPROVAL_REVIEW_PREFERENCES_EVENT, refreshReviewMode);
    window.addEventListener("storage", refreshReviewMode);
    return () => {
      window.removeEventListener(
        APPROVAL_REVIEW_PREFERENCES_EVENT,
        refreshReviewMode,
      );
      window.removeEventListener("storage", refreshReviewMode);
    };
  }, []);

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
  ): Promise<boolean> => {
    const requestKey = approvalRequestKey(request);
    const key = `${requestKey}:${decision}`;
    setActingKey(key);
    try {
      const res = await answerApprovalRequest(request, decision);
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
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to answer request.");
      return false;
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
        ) : reviewMode === "cards" ? (
          <ApprovalCardStack
            requests={sortedRequests}
            acting={actingKey !== null}
            onAnswer={answerRequest}
          />
        ) : (
          <Panel>
            {sortedRequests.map((request, idx) => (
              <div
                key={approvalRequestKey(request)}
                className={`grid gap-3 px-3 py-3 md:grid-cols-[minmax(0,1fr)_auto] ${
                  idx > 0 ? "border-t border-border" : ""
                }`}
              >
                <ApprovalRequestSummary request={request} />

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
            ))}
          </Panel>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ApprovalRequests;
