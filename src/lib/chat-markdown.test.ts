import { describe, expect, it } from "vitest";
import { normalizeChatMarkdown } from "./chat-markdown";

describe("normalizeChatMarkdown", () => {
  it("keeps a bare number reply a paragraph", () => {
    // Field test modern-voice-UX-1: "62." parsed as a one-item ordered list.
    expect(normalizeChatMarkdown("62.")).toBe("62\\.");
    expect(normalizeChatMarkdown("62)")).toBe("62\\)");
    expect(normalizeChatMarkdown("  67.\n")).toBe("67\\.");
    expect(normalizeChatMarkdown("1999. was a good year")).toBe(
      "1999\\. was a good year",
    );
  });

  it("leaves lists and other text alone", () => {
    for (const text of [
      "62",
      "6.2",
      "62.5 percent",
      "1234567890. too long",
      "The answer is 62.",
      "- 62.",
      "5. five\n6. six",
      "1. one\n2. two",
      "3. a\n   1. inner\n4. b",
    ]) {
      expect(normalizeChatMarkdown(text)).toBe(text);
    }
  });
});
