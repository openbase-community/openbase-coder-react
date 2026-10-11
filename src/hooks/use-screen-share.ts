import { apiFetch } from "@/lib/api";
import {
  REMOTE_CONTROL_INPUT_TYPE,
  REMOTE_CONTROL_SET_ENABLED_TYPE,
  REMOTE_CONTROL_STATUS_TYPE,
  SCREEN_SHARE_STOP_TYPE,
  type RemoteControlInput,
} from "@/lib/screen-share-control";
import {
  RoomEvent,
  Track,
  type RemoteTrack,
  type RemoteVideoTrack,
  type Room,
} from "livekit-client";
import { useCallback, useEffect, useRef, useState } from "react";

export type ScreenShareStatus = {
  /**
   * Whether this backend can share a screen, as it advertises through
   * livekit-companion-status. null until asked; false hides the control
   * (for example a cloud workspace without a display).
   */
  available: boolean | null;
  /** Why the backend cannot share, when `available` is false. */
  unavailableDetail: string | null;
  /** Waiting for the computer's video after "Share screen". */
  starting: boolean;
  /** Waiting for the computer to unpublish after Stop. */
  stopping: boolean;
  /** Why a start failed, for example a missing Screen Recording grant. */
  message: string | null;
  controlEnabled: boolean;
  /** Why remote control cannot act (missing Accessibility on the computer). */
  controlMessage: string | null;
};

const IDLE: ScreenShareStatus = {
  available: null,
  unavailableDetail: null,
  starting: false,
  stopping: false,
  message: null,
  controlEnabled: false,
  controlMessage: null,
};

function startFailureMessage(status: number, payload: Record<string, unknown>) {
  const detail = typeof payload.detail === "string" ? payload.detail : null;
  if (status >= 400) return detail ?? `Couldn't start screen sharing (HTTP ${status}).`;
  if (payload.started === true) return null;
  return detail ?? "This computer can't share its screen.";
}

/**
 * The backend computer's screen share into the current voice room, and
 * remote control of it. Stopping is real: Stop, ending the call and leaving
 * the page each tell the computer's companion to end capture.
 */
export function useScreenShare(room: Room | null, roomName: string | null) {
  const [track, setTrack] = useState<RemoteVideoTrack | null>(null);
  const [status, setStatus] = useState<ScreenShareStatus>(IDLE);
  const activityRef = useRef(false);

  useEffect(() => {
    if (!room) return;
    // Ask the backend whether it can share at all, so the control appears
    // only where it works (never guessed from the host type here).
    let cancelled = false;
    apiFetch("/api/livekit-companion-status/")
      .then(async (response) => {
        const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
        if (cancelled) return;
        const available = response.ok && payload.supported !== false;
        setStatus((previous) => ({
          ...previous,
          available,
          unavailableDetail: available
            ? null
            : typeof payload.detail === "string"
              ? payload.detail
              : "Screen sharing is not available on this computer.",
        }));
      })
      .catch(() => {
        if (!cancelled) setStatus((previous) => ({ ...previous, available: null }));
      });
    return () => {
      cancelled = true;
    };
  }, [room]);

  useEffect(() => {
    if (!room) {
      setTrack(null);
      setStatus(IDLE);
      activityRef.current = false;
      return;
    }
    const onSubscribed = (remote: RemoteTrack) => {
      if (remote.kind === Track.Kind.Video && remote.source === Track.Source.ScreenShare) {
        setTrack(remote as RemoteVideoTrack);
        setStatus((previous) => ({ ...previous, starting: false, message: null }));
      }
    };
    const onUnsubscribed = (remote: RemoteTrack) => {
      if (remote.source !== Track.Source.ScreenShare) return;
      setTrack((current) => (current === remote ? null : current));
      setStatus((previous) => ({ ...previous, stopping: false, controlEnabled: false, controlMessage: null }));
    };
    const onData = (data: Uint8Array, _participant: unknown, _kind: unknown, topic?: string) => {
      if (topic) return;
      try {
        const message = JSON.parse(new TextDecoder().decode(data)) as Record<string, unknown>;
        if (message.type !== REMOTE_CONTROL_STATUS_TYPE) return;
        const granted = message.accessibilityGranted !== false;
        const detail = typeof message.detail === "string" ? message.detail : "";
        setStatus((previous) => ({
          ...previous,
          controlMessage: granted
            ? null
            : detail || "Allow Accessibility for OpenbaseScreenShareCompanion on the computer, then try again.",
        }));
      } catch {
        // Not a JSON control message.
      }
    };
    room
      .on(RoomEvent.TrackSubscribed, onSubscribed)
      .on(RoomEvent.TrackUnsubscribed, onUnsubscribed)
      .on(RoomEvent.DataReceived, onData);
    for (const participant of room.remoteParticipants.values()) {
      for (const publication of participant.videoTrackPublications.values()) {
        if (publication.track) onSubscribed(publication.track as RemoteTrack);
      }
    }
    return () => {
      room
        .off(RoomEvent.TrackSubscribed, onSubscribed)
        .off(RoomEvent.TrackUnsubscribed, onUnsubscribed)
        .off(RoomEvent.DataReceived, onData);
    };
  }, [room]);

  const publish = useCallback(
    async (payload: Record<string, unknown>) => {
      if (!room) return false;
      try {
        await room.localParticipant.publishData(
          new TextEncoder().encode(JSON.stringify({ id: crypto.randomUUID(), ...payload })),
          { reliable: true },
        );
        return true;
      } catch {
        return false;
      }
    },
    [room],
  );

  const requestComputerStop = useCallback(
    async (reason: string) => {
      // The data message reaches the companion over the call; the API call
      // covers a companion that missed it. Either one is enough.
      await publish({ type: SCREEN_SHARE_STOP_TYPE, reason });
      await apiFetch("/api/livekit-companion-stop/", { method: "POST", body: "{}" }).catch(() => null);
    },
    [publish],
  );

  activityRef.current = track !== null || status.starting || status.stopping;

  const start = useCallback(async () => {
    if (!roomName || activityRef.current) return;
    setStatus((previous) => ({ ...IDLE, available: previous.available, unavailableDetail: previous.unavailableDetail, starting: true }));
    try {
      const response = await apiFetch("/api/livekit-companion-start/", {
        method: "POST",
        body: JSON.stringify({ room_name: roomName }),
      });
      const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      const message = startFailureMessage(response.status, payload);
      if (message) setStatus((previous) => ({ ...previous, starting: false, message }));
    } catch (error) {
      setStatus((previous) => ({
        ...previous,
        starting: false,
        message: error instanceof Error ? error.message : "Couldn't reach the computer to start screen sharing.",
      }));
    }
  }, [roomName]);

  const stop = useCallback(async () => {
    setStatus((previous) => ({ ...previous, stopping: true, controlEnabled: false, message: null }));
    await requestComputerStop("user_stop");
  }, [requestComputerStop]);

  /** Ends the share when the call ends or the page is left. */
  const stopForLeave = useCallback(
    async (reason: string) => {
      if (!activityRef.current) return;
      setStatus((previous) => ({ ...previous, stopping: true, controlEnabled: false }));
      await Promise.race([requestComputerStop(reason), new Promise((resolve) => setTimeout(resolve, 2500))]);
    },
    [requestComputerStop],
  );

  useEffect(() => {
    const onPageHide = () => {
      void stopForLeave("page_hidden");
    };
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, [stopForLeave]);

  const setControlEnabled = useCallback(
    async (enabled: boolean) => {
      if (await publish({ type: REMOTE_CONTROL_SET_ENABLED_TYPE, enabled })) {
        setStatus((previous) => ({
          ...previous,
          controlEnabled: enabled,
          controlMessage: enabled ? previous.controlMessage : null,
        }));
      }
    },
    [publish],
  );

  const sendInput = useCallback(
    async (inputs: RemoteControlInput[]) => {
      for (const input of inputs) {
        await publish({ type: REMOTE_CONTROL_INPUT_TYPE, ...input });
      }
    },
    [publish],
  );

  return { track, status, start, stop, stopForLeave, setControlEnabled, sendInput };
}
