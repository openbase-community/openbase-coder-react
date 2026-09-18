import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "../api";
import { answerApprovalRequest } from "../approval-requests";

vi.mock("../api", () => ({ apiFetch: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

describe("approval decision routing", () => {
  it("keeps remote decisions on the selected authenticated backend", async () => {
    vi.mocked(apiFetch).mockResolvedValue(new Response("{}"));
    await answerApprovalRequest({ id: "email:id ?", origin_host: "mini.example" }, "accept");
    expect(apiFetch).toHaveBeenCalledWith("/api/approval-requests/email%3Aid%20%3F/", {
      method: "POST",
      body: JSON.stringify({ decision: "accept", origin_host: "mini.example" }),
    });
  });

  it("preserves local decision requests", async () => {
    await answerApprovalRequest({ id: 42 }, "decline");
    expect(apiFetch).toHaveBeenCalledWith("/api/approval-requests/42/", {
      method: "POST",
      body: JSON.stringify({ decision: "decline" }),
    });
  });
});
