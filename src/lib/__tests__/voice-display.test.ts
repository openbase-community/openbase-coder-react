import { describe, expect, it } from "vitest";

import { userPromptForDisplay, voicePromptForDisplay } from "../voice-display";

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

// Spoken dispatcher turns as stored (QA, 2026-10-10: desktop showed these raw).
const SCOPE_NOTE =
  "[Openbase system note: answer only what the caller just said in this spoken request.]";
const ONBOARDING_NOTE =
  "[Openbase system note: onboarding is pending on this machine — ask them to choose [now] or [later].]";

describe("userPromptForDisplay", () => {
  it("prefers the server-cleaned display text", () => {
    expect(userPromptForDisplay(`${SCOPE_NOTE}\n\n<voice>hi</voice>`, "hi")).toBe("hi");
    expect(userPromptForDisplay("raw", "")).toBe("");
  });

  it("falls back to stripping stacked notes and the voice envelope behind them", () => {
    expect(
      userPromptForDisplay(
        `${ONBOARDING_NOTE}\n\n${SCOPE_NOTE}\n\n<voice>Please transfer me to Cooper</voice>`,
      ),
    ).toBe("Please transfer me to Cooper");
    expect(userPromptForDisplay(`${ONBOARDING_NOTE}\n\ntyped request`)).toBe(
      "typed request",
    );
  });

  it("keeps typed text and replaces note-only previews with a placeholder", () => {
    expect(userPromptForDisplay("what is [Openbase system note: x]?")).toBe(
      "what is [Openbase system note: x]?",
    );
    expect(userPromptForDisplay(SCOPE_NOTE)).toMatch(/only a system note/);
    expect(userPromptForDisplay("[Openbase system note: cut off")).toMatch(
      /truncated system note/,
    );
  });
});
