import {
  promptAfterThreadTurnSubmission,
  threadTurnActionMessage,
  threadTurnActionPath,
} from "../thread-turn-actions";
import { describe, expect, it } from "vitest";

describe("thread turn actions", () => {
  it("keeps queue and steer endpoints distinct", () => {
    expect(threadTurnActionPath("thread-1", "queue")).toBe(
      "/api/threads/thread-1/turns/queue/",
    );
    expect(threadTurnActionPath("thread-1", "steer")).toBe(
      "/api/threads/thread-1/turns/steer/",
    );
  });

  it("reports backend fallback outcomes accurately", () => {
    expect(threadTurnActionMessage("steer", { steered: true })).toBe(
      "Steering sent",
    );
    expect(threadTurnActionMessage("steer", { queued: true })).toBe(
      "Active turn ended; follow-up queued",
    );
    expect(
      threadTurnActionMessage("steer", { startedImmediately: true }),
    ).toBe("Active turn ended; follow-up started");
  });

  it("retains failed and subsequently edited prompts", () => {
    expect(promptAfterThreadTurnSubmission("keep this", "keep this", false)).toBe(
      "keep this",
    );
    expect(promptAfterThreadTurnSubmission("edited", "original", true)).toBe(
      "edited",
    );
    expect(promptAfterThreadTurnSubmission("accepted", "accepted", true)).toBe("");
  });
});
