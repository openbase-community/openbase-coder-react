import { describe, expect, it } from "vitest";
import { MAX_THREAD_NAME_LENGTH, normalizeThreadName } from "../thread-name";

describe("normalizeThreadName", () => {
  it("collapses whitespace and trims", () => {
    expect(normalizeThreadName("  Fix   the\tlogin \n")).toBe("Fix the login");
  });

  it("returns empty for blank input", () => {
    expect(normalizeThreadName("   ")).toBe("");
  });

  it("caps the length", () => {
    expect(normalizeThreadName("x".repeat(500))).toHaveLength(
      MAX_THREAD_NAME_LENGTH,
    );
  });
});
