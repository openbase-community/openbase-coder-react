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
 * Agent participant attribute naming the voice engine, published on join.
 * `pipeline` is the classic STT → LLM → TTS turn engine whose lifecycle
 * packets drive the phone clients' automatic mic mute; `live` is the
 * full-duplex engine, where the user may talk over the agent, so clients must
 * leave the mic exactly as the user set it. Absent on agents that predate the
 * attribute, which behave like `pipeline`.
 */
export const VOICE_ENGINE_ATTRIBUTE = "openbase.voice.engine";

export type VoiceEngine = "live" | "pipeline";

/**
 * Parse the `openbase.voice.engine` attribute. Unknown or empty values read
 * as "not announced" (null) so a typo on the agent side can never silently
 * switch a client into full-duplex mode.
 */
export function parseVoiceEngine(
  value: string | null | undefined,
): VoiceEngine | null {
  const normalized = value?.trim().toLowerCase();
  return normalized === "live" || normalized === "pipeline" ? normalized : null;
}

/**
 * Whether lifecycle packets and agent states may touch the microphone on this
 * engine. False only for `live`; an absent attribute keeps classic behaviour.
 * The browser client does not auto-mute today; this is the shared decision
 * the phone clients apply.
 */
export function lifecycleAutoMuteApplies(engine: VoiceEngine | null): boolean {
  return engine !== "live";
}

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
