import { describe, expect, it } from "vitest";

import { voicePromptForDisplay } from "../voice-display";

describe("voicePromptForDisplay", () => {
  it("removes a complete voice transport envelope", () => {
    expect(voicePromptForDisplay("<voice>fix the login bug</voice>")).toBe(
      "fix the login bug",
    );
  });

  it("preserves transcript whitespace and restores escaped speech", () => {
    expect(
      voicePromptForDisplay(
        "<voice>  compare &lt;old&gt; &amp; &amp;lt;new&amp;gt;\nnext  </voice>",
      ),
    ).toBe("  compare <old> & &lt;new&gt;\nnext  ");
  });

  it("leaves tag mentions and malformed wrappers unchanged", () => {
    expect(voicePromptForDisplay("Document <voice> tags")).toBe(
      "Document <voice> tags",
    );
    expect(voicePromptForDisplay("<voice>nested</voice><voice>tag</voice>")).toBe(
      "<voice>nested</voice><voice>tag</voice>",
    );
    expect(voicePromptForDisplay("<VOICE>case matters</VOICE>")).toBe(
      "<VOICE>case matters</VOICE>",
    );
  });
});
