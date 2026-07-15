import { describe, expect, it } from "vitest";
import {
  hasHistoricalVoice,
  shouldDeemphasizeThread,
  threadAgentVoiceName,
  threadDisplayName,
  threadListDisplayNames,
  threadRoutePath,
  threadVoiceLabel,
} from "../thread-display";
import type { ThreadInfo, ThreadStatus } from "../../types/session";

const thread = (
  status: ThreadStatus,
  overrides: Partial<ThreadInfo> = {},
): ThreadInfo => ({
  thread_id: "thread-1",
  directory: "/tmp/project",
  display_name: "project",
  created_at: "2026-05-21T00:00:00.000Z",
  updated_at: "2026-05-21T00:00:00.000Z",
  current_turn: null,
  turn_history: [],
  status,
  ...overrides,
});

describe("shouldDeemphasizeThread", () => {
  it("keeps running threads active-looking", () => {
    expect(shouldDeemphasizeThread(thread("running"))).toBe(false);
  });

  it("deemphasizes non-running normal threads", () => {
    expect(shouldDeemphasizeThread(thread("idle"))).toBe(true);
    expect(shouldDeemphasizeThread(thread("waiting"))).toBe(true);
    expect(shouldDeemphasizeThread(thread("completed"))).toBe(true);
    expect(shouldDeemphasizeThread(thread("error"))).toBe(true);
  });

  it("keeps dispatcher and current voice threads active-looking", () => {
    expect(
      shouldDeemphasizeThread(thread("idle", { voice_route: { role: "dispatcher", active: true } })),
    ).toBe(false);
    expect(
      shouldDeemphasizeThread(
        thread("waiting", { voice_route: { role: "active_target", active: true } }),
      ),
    ).toBe(false);
  });
});

describe("threadDisplayName", () => {
  it("uses dispatcher for dispatch threads instead of the Codex preview", () => {
    expect(
      threadDisplayName(
        thread("idle", {
          name: "dispatcher",
          display_name: "dispatcher",
          voice_route: { role: "dispatcher", active: true },
          preview: "Hey, you're in there.",
        }),
      ),
    ).toBe("dispatcher");
  });

  it("uses API-provided names when a list contains multiple dispatchers", () => {
    const threads = [
      thread("idle", {
          thread_id: "dispatcher-a",
          name: "dispatcher",
          display_name: "dispatcher",
          voice_route: { role: "dispatcher", active: true },
        }),
      thread("idle", {
          thread_id: "normal",
          name: "Normal thread",
          display_name: "Normal thread",
        }),
      thread("idle", {
          thread_id: "dispatcher-b",
          name: "dispatcher",
          display_name: "dispatcher",
          voice_route: { role: "dispatcher", active: true },
        }),
    ];

    const names = threadListDisplayNames(threads);

    expect(names.get("dispatcher-a")).toBe("dispatcher");
    expect(names.get("dispatcher-b")).toBe("dispatcher");
    expect(names.get("normal")).toBe("Normal thread");
  });

  it("uses the thread name before the agent voice name", () => {
    expect(
      threadDisplayName(
        thread("idle", {
          name: "Build thread",
          title: "Build thread",
          display_name: "Build thread",
          voice_assignment: {
            thread_id: "thread-1",
            agent_name: "Dottie",
            voice_id: "voice-dottie",
            voice_name: "Dottie",
            source: "test",
          },
        }),
      ),
    ).toBe("Build thread");
  });

  it("keeps the agent voice name as separate metadata", () => {
    expect(
      threadAgentVoiceName(
        thread("idle", {
          name: "Build thread",
          display_name: "Build thread",
          voice_assignment: {
            thread_id: "thread-1",
            agent_name: "Dottie",
            voice_id: "voice-dottie",
            voice_name: "Dottie",
            source: "test",
          },
        }),
      ),
    ).toBe("Dottie");
  });
});

describe("threadVoiceLabel", () => {
  it("uses the active target voice name when present", () => {
    expect(
      threadVoiceLabel(
        thread("idle", {
          voice_route: { role: "active_target", active: true },
          voice_assignment: {
            thread_id: "thread-1",
            agent_name: "Alice",
            voice_id: "voice-1",
            voice_name: "Alice",
            source: "route_state",
          },
        }),
      ),
    ).toBe("Alice");
  });

  it("falls back to the generic voice label", () => {
    expect(threadVoiceLabel(thread("idle", { voice_route: { role: "active_target", active: true } }))).toBe(
      "voice",
    );
  });

  it("uses the dispatcher voice name when present", () => {
    expect(
      threadVoiceLabel(
        thread("idle", {
          voice_route: { role: "dispatcher", active: true },
          voice_assignment: {
            thread_id: "thread-1",
            agent_name: "dispatcher",
            voice_id: "voice-jacqueline",
            voice_name: "Jacqueline",
            source: "route_state",
          },
        }),
      ),
    ).toBe("Jacqueline");
  });

  it("uses a historical voice name when a thread is not active", () => {
    const historicalThread = thread("idle", {
      voice_route: { role: "none", active: false },
      voice_assignment: {
        thread_id: "thread-1",
        agent_name: "Alice",
        voice_id: "voice-1",
        voice_name: "Alice",
        source: "test",
      },
    });

    expect(hasHistoricalVoice(historicalThread)).toBe(true);
    expect(threadVoiceLabel(historicalThread)).toBe("Alice");
  });
});

describe("threadRoutePath", () => {
  it("routes dispatcher threads to the dispatcher page", () => {
    expect(
      threadRoutePath(
        thread("idle", {
          thread_id: "dispatcher-thread-id",
          voice_route: { role: "dispatcher", active: true },
        }),
      ),
    ).toBe("/dashboard/dispatch");
  });

  it("routes normal threads to encoded thread detail paths", () => {
    expect(
      threadRoutePath(thread("idle", { thread_id: "thread/with/slash" }), {
        fromProject: "/tmp/project",
      }),
    ).toBe("/dashboard/threads/thread%2Fwith%2Fslash?fromProject=%2Ftmp%2Fproject");
  });
});
