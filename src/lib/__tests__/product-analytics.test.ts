import { afterEach, describe, expect, it, vi } from "vitest";
import {
  configureProductAnalytics,
  isProductAnalyticsEnabled,
  productAnalyticsPreferenceAvailable,
  setProductAnalyticsEnabled,
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

  it("exposes an optional host-managed opt-in preference", () => {
    let enabled = false;
    configureProductAnalytics({
      isEnabled: () => enabled,
      setEnabled: (nextEnabled) => {
        enabled = nextEnabled;
      },
      track: vi.fn(),
    });

    expect(productAnalyticsPreferenceAvailable()).toBe(true);
    expect(isProductAnalyticsEnabled()).toBe(false);
    setProductAnalyticsEnabled(true);
    expect(isProductAnalyticsEnabled()).toBe(true);
  });

  it("hides the preference when the host only supports event delivery", () => {
    configureProductAnalytics({ track: vi.fn() });

    expect(productAnalyticsPreferenceAvailable()).toBe(false);
    expect(isProductAnalyticsEnabled()).toBe(false);
    expect(() => setProductAnalyticsEnabled(true)).not.toThrow();
  });
});
