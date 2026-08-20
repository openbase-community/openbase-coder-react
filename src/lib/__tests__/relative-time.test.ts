import { describe, expect, it } from "vitest";
import { relativeTimeShort } from "../relative-time";

describe("relativeTimeShort", () => {
  const now = new Date("2026-08-19T12:00:00Z");

  it("returns empty string for missing values", () => {
    expect(relativeTimeShort(null, now)).toBe("");
    expect(relativeTimeShort(undefined, now)).toBe("");
    expect(relativeTimeShort("not-a-date", now)).toBe("");
  });

  it("treats very recent and future times as 'just now'", () => {
    expect(relativeTimeShort("2026-08-19T11:59:40Z", now)).toBe("just now");
    expect(relativeTimeShort("2026-08-19T12:00:30Z", now)).toBe("just now");
  });

  it("formats minutes, hours, and days", () => {
    expect(relativeTimeShort("2026-08-19T11:57:00Z", now)).toBe("3m ago");
    expect(relativeTimeShort("2026-08-19T09:00:00Z", now)).toBe("3h ago");
    expect(relativeTimeShort("2026-08-17T12:00:00Z", now)).toBe("2d ago");
    expect(relativeTimeShort("2026-08-05T12:00:00Z", now)).toBe("2w ago");
  });

  it("falls back to a locale date once weeks-old", () => {
    const result = relativeTimeShort("2026-06-01T12:00:00Z", now);
    expect(result).not.toMatch(/ago|just now/);
    expect(result.length).toBeGreaterThan(0);
  });
});
