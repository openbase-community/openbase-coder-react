import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { Play, Square } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";

type LiveKitCompanionSession = {
  roomUrl: string;
  companionToken: string;
  companionTokenExpiresAt?: string;
};

type LiveKitCompanionState = "off" | "starting" | "sharing" | "stopping" | "error";

type LiveKitCompanionResponse = {
  ok?: boolean;
  state?: LiveKitCompanionState;
  error?: string;
};

type LiveKitCompanionSessionPayload = LiveKitCompanionSession & {
  detail?: string;
  roomName?: string;
};

declare global {
  interface Window {
    __OPENBASE_LIVEKIT_COMPANION__?: {
      startScreenShare: (session: LiveKitCompanionSession) => Promise<LiveKitCompanionResponse>;
      stopScreenShare: () => Promise<LiveKitCompanionResponse>;
      status: () => Promise<LiveKitCompanionResponse>;
    };
    __OPENBASE_LIVEKIT_COMPANION_SESSION__?: {
      setSession: (session: LiveKitCompanionSession | null) => void;
      getSession: () => LiveKitCompanionSession | null;
      clearSession: () => void;
    };
  }
}

export const LiveKitCompanionSettings: React.FC = () => {
  const [session, setSession] = useState<LiveKitCompanionSession | null>(null);
  const sessionRef = useRef<LiveKitCompanionSession | null>(null);
  const [state, setState] = useState<LiveKitCompanionState>("off");
  const [error, setError] = useState<string | null>(null);
  const companion =
    typeof window === "undefined"
      ? undefined
      : window.__OPENBASE_LIVEKIT_COMPANION__;

  const updateSession = useCallback((nextSession: LiveKitCompanionSession | null) => {
    sessionRef.current = nextSession;
    setSession(nextSession);
    setError(null);
  }, []);

  const loadCompanionSession = useCallback(
    async ({ showErrors = false }: { showErrors?: boolean } = {}) => {
      try {
        const response = await apiFetch("/api/livekit-companion-session/");
        const payload = (await response
          .json()
          .catch(() => ({}))) as Partial<LiveKitCompanionSessionPayload>;

        if (!response.ok) {
          updateSession(null);
          if (showErrors) {
            setError(payload.detail ?? "No active LiveKit voice room was found.");
          }
          return null;
        }

        if (!payload.roomUrl || !payload.companionToken) {
          throw new Error("LiveKit companion session response is missing required fields.");
        }

        const nextSession: LiveKitCompanionSession = {
          roomUrl: payload.roomUrl,
          companionToken: payload.companionToken,
          companionTokenExpiresAt: payload.companionTokenExpiresAt,
        };
        updateSession(nextSession);
        return nextSession;
      } catch (caughtError) {
        updateSession(null);
        if (showErrors) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to prepare LiveKit screen sharing.",
          );
        }
        return null;
      }
    },
    [updateSession],
  );

  useEffect(() => {
    window.__OPENBASE_LIVEKIT_COMPANION_SESSION__ = {
      setSession: updateSession,
      getSession: () => sessionRef.current,
      clearSession: () => updateSession(null),
    };

    function handleSessionEvent(event: Event) {
      const customEvent = event as CustomEvent<LiveKitCompanionSession | null>;
      updateSession(customEvent.detail ?? null);
    }

    window.addEventListener("openbase:livekit-companion-session", handleSessionEvent);
    return () => {
      window.removeEventListener("openbase:livekit-companion-session", handleSessionEvent);
      if (window.__OPENBASE_LIVEKIT_COMPANION_SESSION__?.getSession() === sessionRef.current) {
        delete window.__OPENBASE_LIVEKIT_COMPANION_SESSION__;
      }
    };
  }, [updateSession]);

  useEffect(() => {
    if (!companion) {
      return;
    }

    void loadCompanionSession();

    function refreshSessionWhenVisible() {
      if (document.visibilityState === "visible") {
        void loadCompanionSession();
      }
    }

    window.addEventListener("focus", refreshSessionWhenVisible);
    document.addEventListener("visibilitychange", refreshSessionWhenVisible);
    return () => {
      window.removeEventListener("focus", refreshSessionWhenVisible);
      document.removeEventListener("visibilitychange", refreshSessionWhenVisible);
    };
  }, [companion, loadCompanionSession]);

  async function handleToggle() {
    console.info("[livekit-companion-ui] settings test toggle click", {
      state,
      hasSession: Boolean(session),
      hasCompanionBridge: Boolean(companion),
    });

    if (!companion) {
      setState("error");
      setError("Electron companion bridge is unavailable.");
      return;
    }

    try {
      if (state === "sharing") {
        setState("stopping");
        const response = await companion.stopScreenShare();
        setState(response.state ?? "off");
        setError(response.ok === false ? response.error ?? "Unable to stop screen share." : null);
        return;
      }

      setState("starting");
      const activeSession = sessionRef.current ?? (await loadCompanionSession({ showErrors: true }));

      if (!activeSession) {
        setState("error");
        return;
      }

      const response = await companion.startScreenShare(activeSession);
      setState(response.state ?? "sharing");
      setError(response.ok === false ? response.error ?? "Unable to start screen share." : null);
    } catch (caughtError) {
      setState("error");
      setError(caughtError instanceof Error ? caughtError.message : "LiveKit companion failed.");
    }
  }

  const isBusy = state === "starting" || state === "stopping";
  const label =
    state === "sharing"
      ? "Test Stop Share Screen"
      : state === "starting"
        ? "Starting..."
        : state === "stopping"
          ? "Stopping..."
          : "Test Share Screen";

  return (
    <div className="overflow-hidden rounded border border-border bg-surface">
      <div className="flex flex-col gap-3 px-3 py-2.5 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-medium text-foreground">
            LiveKit companion screen sharing
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Start or stop the macOS companion display share for the active voice room.
          </p>
          {error ? (
            <p className="mt-1 text-[12px] text-destructive">{error}</p>
          ) : null}
        </div>
        <Button
          variant={state === "sharing" ? "destructive" : "outline"}
          size="sm"
          className="h-7 px-2.5 text-[12px]"
          onClick={() => {
            void handleToggle();
          }}
          disabled={isBusy}
          title={
            session
              ? "Toggle LiveKit companion full-display sharing"
              : "Waiting for the active LiveKit room URL and companion token"
          }
        >
          {state === "sharing" ? (
            <Square className="h-3 w-3" />
          ) : (
            <Play className="h-3 w-3" />
          )}
          {label}
        </Button>
      </div>
    </div>
  );
};
