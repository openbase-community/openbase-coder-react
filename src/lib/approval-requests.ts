export type ApprovalRequest = {
  id: string | number;
  method?: string | null;
  params?: Record<string, unknown>;
  received_at?: string | null;
  thread_id?: string | null;
  turn_id?: string | null;
  // Present on fleet items only: the peer desktop the approval is pending on.
  // Answers must go directly to origin_host; ids are device-local.
  origin_device?: string | null;
  origin_host?: string | null;
};

/** Stable key for an approval across the fleet (ids are device-local). */
export function approvalRequestKey(request: ApprovalRequest): string {
  return `${request.origin_host ?? "local"}:${String(request.id)}`;
}

type ApprovalRequestsMessage = {
  type: "approval_requests";
  data: {
    requests: ApprovalRequest[];
  };
};

export function parseApprovalRequestsMessage(
  raw: unknown,
): ApprovalRequestsMessage | null {
  if (typeof raw !== "string") return null;

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!value || typeof value !== "object") return null;
  const message = value as Record<string, unknown>;
  if (message.type !== "approval_requests") return null;
  if (!message.data || typeof message.data !== "object") return null;

  const data = message.data as Record<string, unknown>;
  if (!Array.isArray(data.requests)) return null;
  if (
    data.requests.some(
      (request) =>
        !request ||
        typeof request !== "object" ||
        (!("id" in request) ||
          (typeof request.id !== "string" && typeof request.id !== "number")),
    )
  ) {
    return null;
  }

  return value as ApprovalRequestsMessage;
}
