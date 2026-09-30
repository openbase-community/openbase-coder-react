// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  APPROVALS_CARD_SWIPE_FEATURE_STORAGE_KEY,
  readApprovalReviewMode,
} from "@/lib/approval-review-preferences";
import { ApprovalReviewSettings } from "./ApprovalReviewSettings";

beforeEach(() => {
  const stored = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => stored.set(key, value),
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ApprovalReviewSettings", () => {
  it("toggles the card swipe review mode", () => {
    render(<ApprovalReviewSettings />);
    const toggle = screen.getByRole("switch", {
      name: /card swipe approval review/i,
    });
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(toggle);
    expect(readApprovalReviewMode()).toBe("cards");
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(toggle);
    expect(readApprovalReviewMode()).toBe("list");
  });

  it("stays hidden while the feature flag is off", () => {
    window.localStorage.setItem(APPROVALS_CARD_SWIPE_FEATURE_STORAGE_KEY, "off");
    render(<ApprovalReviewSettings />);
    expect(screen.queryByRole("switch")).toBeNull();
  });
});
