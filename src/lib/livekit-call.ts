import { getBackendBaseUrl } from "@/lib/runtime-config";

/**
 * Voice-call constants shared with the other clients. The agent name must
 * match the CLI worker registration (LIVEKIT_DISPATCH_AGENT_NAME in
 * cli/openbase_coder_cli/livekit_agent/config.py) and the iOS default.
 */
export const LIVEKIT_DISPATCH_AGENT_NAME = "livekit-agent";
export const LIVEKIT_SERVER_PORT = 7880;

/** Data topics published by the dispatcher agent during a call. */
export const AGENT_STATUS_TOPIC = "openbase.agent.status";
export const VOICE_LIFECYCLE_TOPIC = "openbase.voice.lifecycle";

/** Participant attribute the LiveKit agents framework sets on the agent. */
export const AGENT_STATE_ATTRIBUTE = "lk.agent.state";

/**
 * LiveKit signalling URL for the room join. Mirrors the iOS derivation
 * (Constants.liveKitUrl): same host as the CLI backend, LiveKit port,
 * ws/wss following the backend scheme.
 */
export function getLiveKitServerUrl(): string {
  const base = new URL(getBackendBaseUrl());
  const protocol = base.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${base.hostname}:${LIVEKIT_SERVER_PORT}`;
}
