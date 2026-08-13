import { apiFetch } from "@/lib/api";
import {
  AGENT_STATE_ATTRIBUTE,
  AGENT_STATUS_TOPIC,
  getLiveKitServerUrl,
  LIVEKIT_DISPATCH_AGENT_NAME,
} from "@/lib/livekit-call";
import {
  Room,
  RoomEvent,
  Track,
  type RemoteParticipant,
  type RemoteTrack,
} from "livekit-client";
import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceCallStatus = "idle" | "connecting" | "connected";

/** Agent lifecycle values from the LiveKit agents framework. */
export type VoiceAgentState =
  | "initializing"
  | "listening"
  | "thinking"
  | "speaking"
  | null;

type RoomTokenResponse = {
  token?: string;
  room_name?: string;
  detail?: string;
  error?: string;
};

function roomTokenErrorMessage(status: number, payload: RoomTokenResponse) {
  if (payload.detail) return payload.detail;
  switch (status) {
    case 401:
      return "Sign in to Openbase Cloud to start a voice call.";
    case 402:
      return "An Openbase Cloud audio subscription is required for voice calls.";
    case 503:
      return "Openbase Cloud is unreachable; try again shortly.";
    default:
      return `Unable to start the call (HTTP ${status}).`;
  }
}

function readAgentState(participant: RemoteParticipant): VoiceAgentState {
  const state = participant.attributes?.[AGENT_STATE_ATTRIBUTE];
  if (
    state === "initializing" ||
    state === "listening" ||
    state === "thinking" ||
    state === "speaking"
  ) {
    return state;
  }
  return null;
}

/**
 * Browser voice call with the dispatcher agent: mints a room token from the
 * local CLI, joins the LiveKit room (which dispatches the agent), publishes
 * the microphone, and plays the agent's audio into `audioContainerRef`.
 */
export function useVoiceCall() {
  const [status, setStatus] = useState<VoiceCallStatus>("idle");
  const [muted, setMuted] = useState(false);
  const [agentState, setAgentState] = useState<VoiceAgentState>(null);
  const [roomName, setRoomName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const roomRef = useRef<Room | null>(null);
  const audioContainerRef = useRef<HTMLDivElement | null>(null);

  const teardown = useCallback(() => {
    roomRef.current = null;
    setStatus("idle");
    setAgentState(null);
    setRoomName(null);
    setMuted(false);
    if (audioContainerRef.current) {
      audioContainerRef.current.replaceChildren();
    }
  }, []);

  const end = useCallback(() => {
    const room = roomRef.current;
    if (room) {
      void room.disconnect();
    }
    teardown();
  }, [teardown]);

  useEffect(() => end, [end]);

  const start = useCallback(async () => {
    if (roomRef.current) return;
    setError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        "Microphone capture is unavailable here. Open the console over " +
          "localhost or HTTPS (or use the desktop app).",
      );
      return;
    }

    setStatus("connecting");
    try {
      // Acquire the microphone before connecting, matching the iOS call
      // flow. Browsers only reveal real host ICE candidates once the origin
      // holds the mic permission; with the pre-grant mDNS-obfuscated
      // candidates the same-host LiveKit server is unreachable and the
      // call times out in ICE checking.
      try {
        const probe = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        probe.getTracks().forEach((track) => track.stop());
      } catch (micError) {
        throw micError instanceof DOMException &&
          micError.name === "NotAllowedError"
          ? new Error(
              "Microphone access was denied. Allow microphone access and try again.",
            )
          : micError;
      }

      const response = await apiFetch("/api/livekit-room-token/", {
        method: "POST",
        body: JSON.stringify({
          livekit_dispatch_agent_name: LIVEKIT_DISPATCH_AGENT_NAME,
        }),
      });
      const payload = (await response
        .json()
        .catch(() => ({}))) as RoomTokenResponse;
      if (!response.ok || !payload.token) {
        throw new Error(roomTokenErrorMessage(response.status, payload));
      }

      const room = new Room();
      roomRef.current = room;

      room
        .on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
          if (track.kind !== Track.Kind.Audio) return;
          const element = track.attach();
          (audioContainerRef.current ?? document.body).appendChild(element);
        })
        .on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
          track.detach().forEach((element) => element.remove());
        })
        .on(RoomEvent.ParticipantAttributesChanged, (_changed, participant) => {
          if (participant.isLocal) return;
          const state = readAgentState(participant as RemoteParticipant);
          if (state) setAgentState(state);
        })
        .on(RoomEvent.ParticipantConnected, (participant) => {
          const state = readAgentState(participant);
          if (state) setAgentState(state);
        })
        .on(RoomEvent.DataReceived, (data, _participant, _kind, topic) => {
          if (topic !== AGENT_STATUS_TOPIC) return;
          try {
            const message = JSON.parse(new TextDecoder().decode(data)) as {
              type?: string;
              detail?: string;
            };
            if (message.type === "agent_error" && message.detail) {
              setError(message.detail);
            }
          } catch {
            // Ignore malformed packets; the contract is additive.
          }
        })
        .on(RoomEvent.Disconnected, () => {
          if (roomRef.current === room) teardown();
        });

      await room.connect(getLiveKitServerUrl(), payload.token);
      setRoomName(payload.room_name ?? room.name ?? null);

      try {
        await room.localParticipant.setMicrophoneEnabled(true);
      } catch (micError) {
        await room.disconnect();
        throw micError instanceof DOMException &&
          micError.name === "NotAllowedError"
          ? new Error(
              "Microphone access was denied. Allow microphone access and try again.",
            )
          : micError;
      }

      for (const participant of room.remoteParticipants.values()) {
        const state = readAgentState(participant);
        if (state) setAgentState(state);
      }
      setStatus("connected");
    } catch (caughtError) {
      teardown();
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to start the voice call.",
      );
    }
  }, [teardown]);

  const toggleMute = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const nextMuted = !muted;
    setMuted(nextMuted);
    try {
      await room.localParticipant.setMicrophoneEnabled(!nextMuted);
    } catch {
      setMuted(muted);
    }
  }, [muted]);

  return {
    status,
    muted,
    agentState,
    roomName,
    error,
    audioContainerRef,
    start,
    end,
    toggleMute,
  };
}
