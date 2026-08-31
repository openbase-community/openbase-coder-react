import { afterEach, describe, expect, it, vi } from "vitest";
import {
  configureProductAnalytics,
  trackProductAnalytics,
} from "../product-analytics";

describe("product analytics bridge", () => {
  afterEach(() => configureProductAnalytics(null));

  it("forwards canonical events without user or content identifiers", () => {
    const track = vi.fn();
    configureProductAnalytics({ track });

    trackProductAnalytics("approval_resolved", {
      decision: "accept",
      request_type: "tool",
      prompt: "private prompt",
      source: "private source",
      workspace_path: "/private/workspace",
      user_id: "user-1",
      email: "private@example.com",
      username: "private-user",
    });

    expect(track).toHaveBeenCalledWith("approval_resolved", {
      decision: "accept",
      request_type: "tool",
    });
  });

  it("is a no-op when the host has not configured a sink", () => {
    expect(() => trackProductAnalytics("diff_reviewed", { action: "viewed" })).not.toThrow();
  });
});
