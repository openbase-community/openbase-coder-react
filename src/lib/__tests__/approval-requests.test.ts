import { describe, expect, it } from "vitest";

import { parseApprovalRequestsMessage } from "../approval-requests";

describe("parseApprovalRequestsMessage", () => {
  it("accepts a pending-request snapshot", () => {
    expect(
      parseApprovalRequestsMessage(
        JSON.stringify({
          type: "approval_requests",
          data: { requests: [{ id: "request-1", method: "tool/approval" }] },
        }),
      ),
    ).toEqual({
      type: "approval_requests",
      data: { requests: [{ id: "request-1", method: "tool/approval" }] },
    });
  });

  it.each([
    "not json",
    JSON.stringify({ type: "other", data: { requests: [] } }),
    JSON.stringify({ type: "approval_requests", data: {} }),
    JSON.stringify({ type: "approval_requests", data: { requests: [{}] } }),
  ])("rejects malformed or unrelated frames", (raw) => {
    expect(parseApprovalRequestsMessage(raw)).toBeNull();
  });
});
