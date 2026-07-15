import { describe, expect, it } from "vitest";
import { reconcileThreadSnapshot } from "../thread-reconcile";
import type { ThreadInfo, ThreadStatus, TurnInfo } from "../../types/session";

const turn = (
  turnId: string,
  status: ThreadStatus,
  overrides: Partial<TurnInfo> = {},
): TurnInfo => ({
  turn_id: turnId,
  started_at: "2026-07-10T10:00:00Z",
  completed_at: null,
  status,
  accumulated_output: "",
  accumulated_stderr: "",
  return_code: null,
  prompt: `prompt for ${turnId}`,
  ...overrides,
});

const thread = (
  currentTurn: TurnInfo | null,
  history: TurnInfo[] = [],
  overrides: Partial<ThreadInfo> = {},
): ThreadInfo => ({
  thread_id: "thr-1",
  directory: "/tmp/project",
  display_name: "project",
  created_at: "2026-07-10T09:00:00Z",
  updated_at: "2026-07-10T10:00:00Z",
  current_turn: currentTurn,
  turn_history: history,
  status: currentTurn?.status ?? "idle",
  ...overrides,
});

describe("reconcileThreadSnapshot", () => {
  it("returns the snapshot when there is no previous state", () => {
    const next = thread(turn("turn-1", "running"));
    expect(reconcileThreadSnapshot(null, next)).toBe(next);
  });

  it("keeps the longer streamed output for the same turn", () => {
    const prev = thread(
      turn("turn-1", "running", { accumulated_output: "streamed ahead" }),
    );
    const next = thread(
      turn("turn-1", "running", { accumulated_output: "streamed" }),
    );
    const result = reconcileThreadSnapshot(prev, next);
    expect(result.current_turn?.accumulated_output).toBe("streamed ahead");
  });

  it("keeps the streaming turn when a stale snapshot still shows the previous turn", () => {
    // The clobber bug: turn-1 completed and turn-2 started over the socket,
    // but an HTTP refresh started before turn-2 resolves afterwards and
    // would show turn-1's prompt/output under the current-turn section.
    const prev = thread(
      turn("turn-2", "running", {
        started_at: "2026-07-10T10:05:00Z",
        accumulated_output: "new turn output",
      }),
    );
    const staleSnapshot = thread(
      turn("turn-1", "running", {
        started_at: "2026-07-10T10:00:00Z",
        accumulated_output: "old turn output",
      }),
    );
    const result = reconcileThreadSnapshot(prev, staleSnapshot);
    expect(result.current_turn?.turn_id).toBe("turn-2");
    expect(result.current_turn?.accumulated_output).toBe("new turn output");
  });

  it("accepts the snapshot once it includes the previous turn in history", () => {
    const prev = thread(turn("turn-1", "running"));
    const next = thread(turn("turn-2", "running"), [
      turn("turn-1", "completed", { completed_at: "2026-07-10T10:04:00Z" }),
    ]);
    const result = reconcileThreadSnapshot(prev, next);
    expect(result.current_turn?.turn_id).toBe("turn-2");
  });

  it("accepts a snapshot whose current turn started later", () => {
    const prev = thread(
      turn("turn-1", "running", { started_at: "2026-07-10T10:00:00Z" }),
    );
    const next = thread(
      turn("turn-2", "running", { started_at: "2026-07-10T10:06:00Z" }),
    );
    const result = reconcileThreadSnapshot(prev, next);
    expect(result.current_turn?.turn_id).toBe("turn-2");
  });

  it("accepts completion snapshots that clear the current turn", () => {
    const prev = thread(turn("turn-1", "running"));
    const next = thread(null, [turn("turn-1", "completed")], {
      status: "completed",
    });
    const result = reconcileThreadSnapshot(prev, next);
    expect(result.current_turn).toBeNull();
    expect(result.status).toBe("completed");
  });
});
