import { describe, expect, it } from "vitest";
import {
  parseThreadTerminalControl,
  threadSupportsTerminal,
  threadTerminalStatusLabel,
} from "../thread-terminal";
import type { ThreadInfo } from "@/types/session";

describe("parseThreadTerminalControl", () => {
  it("parses a ready frame", () => {
    expect(
      parseThreadTerminalControl(
        JSON.stringify({
          type: "ready",
          data: {
            backend: "claude_code",
            target: "claude_code",
            command: "claude --resume abc",
            cwd: "/repo",
            reattached: true,
          },
        }),
      ),
    ).toEqual({
      type: "ready",
      data: {
        backend: "claude_code",
        target: "claude_code",
        command: "claude --resume abc",
        cwd: "/repo",
        reattached: true,
      },
    });
  });

  it("parses exit and error frames", () => {
    expect(
      parseThreadTerminalControl('{"type":"exit","data":{"code":1}}'),
    ).toEqual({ type: "exit", data: { code: 1 } });
    expect(
      parseThreadTerminalControl('{"type":"error","data":{"message":"nope"}}'),
    ).toEqual({ type: "error", data: { message: "nope" } });
  });

  it("ignores malformed or unknown frames", () => {
    expect(parseThreadTerminalControl("not json")).toBeNull();
    expect(parseThreadTerminalControl('{"type":"ready","data":{}}')).toBeNull();
    expect(parseThreadTerminalControl('{"type":"other","data":{}}')).toBeNull();
    expect(parseThreadTerminalControl(new ArrayBuffer(2))).toBeNull();
  });
});

describe("threadTerminalStatusLabel", () => {
  it("names the running backend and exit codes", () => {
    expect(
      threadTerminalStatusLabel({
        kind: "running",
        backend: "codex",
        target: "codex",
        command: "codex resume t",
        cwd: "/",
        reattached: false,
      }),
    ).toBe("Codex");
    expect(threadTerminalStatusLabel({ kind: "exited", code: 0 })).toBe(
      "Exited",
    );
    expect(threadTerminalStatusLabel({ kind: "exited", code: 2 })).toBe(
      "Exited (2)",
    );
  });
});

describe("threadSupportsTerminal", () => {
  it("keeps the dispatcher chat-only", () => {
    const worker = { thread_id: "t" } as ThreadInfo;
    const dispatcher = {
      thread_id: "d",
      voice_route: { role: "dispatcher" },
    } as ThreadInfo;
    expect(threadSupportsTerminal(worker)).toBe(true);
    expect(threadSupportsTerminal(dispatcher)).toBe(false);
  });
});
