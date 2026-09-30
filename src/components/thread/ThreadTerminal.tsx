import "@xterm/xterm/css/xterm.css";

import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { type ITheme, Terminal } from "@xterm/xterm";
import { RotateCcw } from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth";
import { peerWebSocketUrl } from "@/lib/fleet";
import { getValidAccessToken } from "@/lib/jwt-auth";
import { getBackendWebSocketUrl } from "@/lib/runtime-config";
import {
  parseThreadTerminalControl,
  type ThreadTerminalStatus,
  threadTerminalStatusLabel,
} from "@/lib/thread-terminal";

// ANSI palettes tuned for the app's light and dark surfaces; background and
// foreground come from the live theme tokens so the terminal sits flush.
const DARK_ANSI: ITheme = {
  black: "#1f2328",
  red: "#ff7b72",
  green: "#3fb950",
  yellow: "#d29922",
  blue: "#58a6ff",
  magenta: "#bc8cff",
  cyan: "#39c5cf",
  white: "#b1bac4",
  brightBlack: "#6e7681",
  brightRed: "#ffa198",
  brightGreen: "#56d364",
  brightYellow: "#e3b341",
  brightBlue: "#79c0ff",
  brightMagenta: "#d2a8ff",
  brightCyan: "#56d4dd",
  brightWhite: "#f0f6fc",
};

const LIGHT_ANSI: ITheme = {
  black: "#24292f",
  red: "#cf222e",
  green: "#116329",
  yellow: "#4d2d00",
  blue: "#0969da",
  magenta: "#8250df",
  cyan: "#1b7c83",
  white: "#6e7781",
  brightBlack: "#57606a",
  brightRed: "#a40e26",
  brightGreen: "#1a7f37",
  brightYellow: "#633c01",
  brightBlue: "#218bff",
  brightMagenta: "#a475f9",
  brightCyan: "#3192aa",
  brightWhite: "#8c959f",
};

function terminalTheme(host: HTMLElement, dark: boolean): ITheme {
  const style = window.getComputedStyle(host);
  const background = style.backgroundColor || (dark ? "#0d1117" : "#ffffff");
  const foreground = style.color || (dark ? "#e6edf3" : "#1f2328");
  return {
    ...(dark ? DARK_ANSI : LIGHT_ANSI),
    background,
    foreground,
    cursor: foreground,
    cursorAccent: background,
    selectionBackground: dark ? "#264f78" : "#b6d7ff",
  };
}

interface ThreadTerminalProps {
  threadId: string;
  originHost?: string | null;
  /** False while the tab is hidden; the session stays attached meanwhile. */
  active: boolean;
}

/**
 * The thread's native backend TUI (Codex or Claude Code), streamed from a PTY
 * on the thread's host. The server keeps the TUI alive across reconnects, so
 * leaving and returning to the tab picks up the same session.
 */
export function ThreadTerminal({
  threadId,
  originHost,
  active,
}: ThreadTerminalProps) {
  const { token } = useAuth();
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const hostRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout>>();
  const reconnectDelayRef = useRef(1000);
  const finishedRef = useRef(false);
  const [status, setStatus] = useState<ThreadTerminalStatus>({
    kind: "connecting",
  });

  const sendControl = useCallback((message: Record<string, unknown>) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
  }, []);

  const fit = useCallback(() => {
    const host = hostRef.current;
    if (!host || host.clientWidth === 0 || host.clientHeight === 0) return;
    try {
      fitRef.current?.fit();
    } catch {
      // The renderer can be mid-teardown; the next resize refits.
    }
  }, []);

  const connect = useCallback(async () => {
    const term = termRef.current;
    if (!term || !token) return;
    const freshToken = (await getValidAccessToken()) ?? token;
    if (termRef.current !== term) return;

    const path = `/ws/threads/${encodeURIComponent(threadId)}/terminal/`;
    const base = originHost
      ? peerWebSocketUrl(originHost, path)
      : getBackendWebSocketUrl(path);
    const query = new URLSearchParams({
      token: freshToken,
      cols: String(term.cols),
      rows: String(term.rows),
    });
    const ws = new WebSocket(`${base}?${query}`);
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;
    finishedRef.current = false;

    ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        term.write(new Uint8Array(event.data));
        return;
      }
      const control = parseThreadTerminalControl(event.data);
      if (!control) return;
      if (control.type === "ready") {
        reconnectDelayRef.current = 1000;
        if (!control.data.reattached) term.reset();
        setStatus({ kind: "running", ...control.data });
      } else if (control.type === "exit") {
        finishedRef.current = true;
        setStatus((prev) => ({
          kind: "exited",
          code: control.data.code,
          command: "command" in prev ? prev.command : undefined,
        }));
      } else {
        finishedRef.current = true;
        setStatus({ kind: "error", message: control.data.message });
      }
    };

    ws.onclose = () => {
      if (wsRef.current !== ws) return;
      wsRef.current = null;
      if (finishedRef.current) return;
      setStatus({ kind: "connecting" });
      reconnectRef.current = setTimeout(() => {
        reconnectDelayRef.current = Math.min(
          reconnectDelayRef.current * 2,
          30000,
        );
        void connect();
      }, reconnectDelayRef.current);
    };
  }, [originHost, threadId, token]);

  // One xterm instance per thread; the socket follows it.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const term = new Terminal({
      allowProposedApi: true,
      cursorBlink: true,
      fontFamily:
        'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
      fontSize: 12.5,
      lineHeight: 1.15,
      macOptionIsMeta: true,
      scrollback: 10000,
      theme: terminalTheme(host, dark),
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(
      new WebLinksAddon((_event, uri) => {
        window.open(uri, "_blank", "noopener,noreferrer");
      }),
    );
    term.open(host);
    termRef.current = term;
    fitRef.current = fitAddon;
    fit();

    const encoder = new TextEncoder();
    const input = term.onData((data) => {
      const ws = wsRef.current;
      if (ws?.readyState === WebSocket.OPEN) ws.send(encoder.encode(data));
    });
    const binaryInput = term.onBinary((data) => {
      const ws = wsRef.current;
      if (ws?.readyState !== WebSocket.OPEN) return;
      const bytes = new Uint8Array(data.length);
      for (let i = 0; i < data.length; i += 1) {
        bytes[i] = data.charCodeAt(i) & 0xff;
      }
      ws.send(bytes);
    });
    const resize = term.onResize(({ cols, rows }) =>
      sendControl({ type: "resize", cols, rows }),
    );
    const observer = new ResizeObserver(() => fit());
    observer.observe(host);

    void connect();

    return () => {
      observer.disconnect();
      input.dispose();
      binaryInput.dispose();
      resize.dispose();
      clearTimeout(reconnectRef.current);
      const ws = wsRef.current;
      wsRef.current = null;
      ws?.close();
      termRef.current = null;
      fitRef.current = null;
      term.dispose();
    };
    // Theme changes are applied below without rebuilding the terminal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connect, fit, sendControl]);

  useEffect(() => {
    const host = hostRef.current;
    if (host && termRef.current) {
      termRef.current.options.theme = terminalTheme(host, dark);
    }
  }, [dark]);

  useEffect(() => {
    if (!active) return;
    const frame = requestAnimationFrame(() => {
      fit();
      termRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [active, fit]);

  const restart = () => {
    const term = termRef.current;
    if (!term) return;
    term.reset();
    setStatus({ kind: "connecting" });
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      finishedRef.current = false;
      sendControl({ type: "restart" });
      return;
    }
    clearTimeout(reconnectRef.current);
    void connect();
  };

  const statusLabel = threadTerminalStatusLabel(status);
  const command = "command" in status ? status.command : undefined;
  const canRestart = status.kind === "exited" || status.kind === "error";

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-1.5 text-[11px]">
        <span
          aria-hidden="true"
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
            status.kind === "running"
              ? "bg-success"
              : status.kind === "connecting"
                ? "animate-pulse bg-warning"
                : "bg-muted-foreground"
          }`}
        />
        <span className="shrink-0 text-muted-foreground">{statusLabel}</span>
        {command ? (
          <code
            className="min-w-0 flex-1 truncate font-mono text-muted-foreground/80"
            title={command}
          >
            {command}
          </code>
        ) : (
          <span className="flex-1" />
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 shrink-0 px-2 text-[11px]"
          onClick={restart}
          disabled={status.kind === "connecting"}
          title={
            canRestart
              ? "Start the TUI again"
              : "Quit this TUI and start a fresh one"
          }
        >
          <RotateCcw className="h-3 w-3" />
          Restart
        </Button>
      </div>
      {status.kind === "error" ? (
        <div className="shrink-0 border-b border-warning/40 bg-warning/10 px-3 py-2 text-[12px] text-warning">
          {status.message}
        </div>
      ) : null}
      <div className="relative min-h-0 flex-1 bg-background px-2 pt-1.5 text-foreground">
        <div ref={hostRef} className="h-full w-full bg-background text-foreground" />
      </div>
    </div>
  );
}
