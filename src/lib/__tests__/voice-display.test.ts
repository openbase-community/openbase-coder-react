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

  it("unwraps the envelope when harness content trails it (Claude Code turns)", () => {
    // Claude Code user messages join content blocks with newlines, so the
    // envelope is often followed by system reminders or hook output.
    expect(
      voicePromptForDisplay(
        "<voice>ship it</voice>\n<system-reminder>context</system-reminder>",
      ),
    ).toBe("ship it\n<system-reminder>context</system-reminder>");
    expect(voicePromptForDisplay("<voice>ship it</voice>\n")).toBe("ship it");
    expect(voicePromptForDisplay("<voice>ship it</voice>  ")).toBe("ship it");
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
