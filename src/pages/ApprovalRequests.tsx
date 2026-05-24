import DashboardLayout from "@/components/layouts/ExampleLayout";
import {
  ResourceEmptyState,
  ResourceError,
  ResourceLoading,
  ResourcePageHeader,
} from "@/components/resource/ResourcePage";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { extractErrorMessage } from "@/lib/api-errors";
import { Check, ExternalLink, ShieldAlert, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

type ApprovalRequest = {
  id: string | number;
  method?: string | null;
  params?: Record<string, unknown>;
  received_at?: string | null;
  thread_id?: string | null;
  turn_id?: string | null;
};

type ApprovalDecision = "accept" | "decline";

const POLL_MS = 5000;

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function requestLabel(request: ApprovalRequest): string {
  const params = request.params ?? {};
  return (
    stringValue(params.command) ??
    stringValue(params.description) ??
    stringValue(params.toolName) ??
    stringValue(params.tool_name) ??
    stringValue(params.name) ??
    request.method ??
    "Approval request"
  );
}

function requestDetail(request: ApprovalRequest): string | null {
  const params = request.params ?? {};
  return (
    stringValue(params.justification) ??
    stringValue(params.reason) ??
    stringValue(params.path) ??
    stringValue(params.cwd)
  );
}

function formatReceivedAt(value?: string | null): string {
  if (!value) return "pending";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const ApprovalRequests = () => {
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingKey, setActingKey] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await apiFetch("/api/approval-requests/");
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

  useEffect(() => {
    void fetchRequests();
    const interval = window.setInterval(() => void fetchRequests(), POLL_MS);
    return () => window.clearInterval(interval);
  }, [fetchRequests]);

  const answerRequest = async (
    request: ApprovalRequest,
    decision: ApprovalDecision,
  ) => {
    const requestId = String(request.id);
    const key = `${requestId}:${decision}`;
    setActingKey(key);
    try {
      const res = await apiFetch(
        `/api/approval-requests/${encodeURIComponent(requestId)}/`,
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
      setRequests((prev) => prev.filter((item) => String(item.id) !== requestId));
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
          subtitle={`${pendingCount} pending · auto-refresh 5s`}
        />

        <ResourceError message={error} />

        {loading && sortedRequests.length === 0 ? (
          <ResourceLoading>Loading...</ResourceLoading>
        ) : sortedRequests.length === 0 ? (
          <ResourceEmptyState icon={ShieldAlert} className="py-8">
            No pending approvals.
          </ResourceEmptyState>
        ) : (
          <div className="overflow-hidden rounded border border-border bg-surface">
            {sortedRequests.map((request, idx) => {
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
