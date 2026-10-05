// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  APPROVAL_REVIEW_MODE_STORAGE_KEY,
  APPROVAL_REVIEW_PREFERENCES_EVENT,
  APPROVALS_CARD_SWIPE_FEATURE_STORAGE_KEY,
  approvalsCardSwipeFeatureEnabled,
  readApprovalReviewMode,
  writeApprovalReviewMode,
} from "./approval-review-preferences";

beforeEach(() => {
  const stored = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => stored.set(key, value),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("approval review preferences", () => {
  it("defaults to the classic list", () => {
    expect(readApprovalReviewMode()).toBe("list");
  });

  it("round-trips the cards mode and notifies listeners", () => {
    const listener = vi.fn();
    window.addEventListener(APPROVAL_REVIEW_PREFERENCES_EVENT, listener);
    writeApprovalReviewMode("cards");
    expect(readApprovalReviewMode()).toBe("cards");
    expect(listener).toHaveBeenCalledTimes(1);
    writeApprovalReviewMode("list");
    expect(readApprovalReviewMode()).toBe("list");
    window.removeEventListener(APPROVAL_REVIEW_PREFERENCES_EVENT, listener);
  });

  it("ignores unknown stored values", () => {
    window.localStorage.setItem(
      "openbase-coder:approval-review-mode",
      "bogus",
    );
    expect(readApprovalReviewMode()).toBe("list");
  });

  it("is feature-flagged: the kill switch forces the list", () => {
    expect(approvalsCardSwipeFeatureEnabled()).toBe(true);
    writeApprovalReviewMode("cards");
    window.localStorage.setItem(APPROVALS_CARD_SWIPE_FEATURE_STORAGE_KEY, "off");
    expect(approvalsCardSwipeFeatureEnabled()).toBe(false);
    expect(readApprovalReviewMode()).toBe("list");
  });
});
