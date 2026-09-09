import { describe, expect, it } from "vitest";

import {
  type AppNotification,
  notificationTargetPath,
  parseNotificationsMessage,
} from "@/lib/notifications";

const notification = (
  overrides: Partial<AppNotification> = {},
): AppNotification => ({
  id: "thread:t-1",
  kind: "thread",
  entity_id: "t-1",
  thread_id: "t-1",
  title: "My thread",
  created_at: "2026-09-08T00:00:00Z",
  ...overrides,
});

describe("parseNotificationsMessage", () => {
  it("accepts a valid snapshot message", () => {
    const raw = JSON.stringify({
      type: "notifications",
      data: { notifications: [notification()], unread_count: 1 },
    });
    const message = parseNotificationsMessage(raw);
    expect(message).not.toBeNull();
    expect(message?.data.unread_count).toBe(1);
    expect(message?.data.notifications[0].id).toBe("thread:t-1");
  });

  it("rejects other message types, bad payloads, and non-strings", () => {
    expect(parseNotificationsMessage(42)).toBeNull();
    expect(parseNotificationsMessage("not json")).toBeNull();
    expect(
      parseNotificationsMessage(
        JSON.stringify({ type: "approval_requests", data: { requests: [] } }),
      ),
    ).toBeNull();
    expect(
      parseNotificationsMessage(
        JSON.stringify({ type: "notifications", data: { notifications: [{}] } }),
      ),
    ).toBeNull();
  });
});

describe("notificationTargetPath", () => {
  it("routes threads to the thread detail page", () => {
    expect(notificationTargetPath(notification())).toBe(
      "/dashboard/threads/t-1",
    );
  });

  it("routes reports to the reports page with project and report params", () => {
    const path = notificationTargetPath(
      notification({
        kind: "report",
        entity_id: "/Users/me/proj:sub/report.md",
        project_path: "/Users/me/proj",
        thread_id: null,
      }),
    );
    const params = new URLSearchParams(path.split("?")[1]);
    expect(path.startsWith("/dashboard/reports?")).toBe(true);
    expect(params.get("project")).toBe("/Users/me/proj");
    expect(params.get("report")).toBe("sub/report.md");
  });

  it("falls back to the reports list when project_path is missing", () => {
    expect(
      notificationTargetPath(
        notification({ kind: "report", entity_id: "x", project_path: null }),
      ),
    ).toBe("/dashboard/reports");
  });

  it("routes approvals and sync conflicts to their pages", () => {
    expect(
      notificationTargetPath(
        notification({ kind: "approval", entity_id: "appr-1" }),
      ),
    ).toBe("/dashboard/approvals");
    expect(
      notificationTargetPath(
        notification({ kind: "sync_conflict", entity_id: "c-1" }),
      ),
    ).toBe("/dashboard/threads/sync-conflicts");
  });
});
