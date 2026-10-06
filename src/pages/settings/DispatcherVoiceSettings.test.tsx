// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/api";
import {
  DispatcherVoiceSettings,
  PIPELINE_ONLY_NOTE,
} from "./DispatcherVoiceSettings";
import type { STTSettingsResponse, TTSSettingsResponse } from "./settingsApi";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));

const ttsSettings: TTSSettingsResponse = {
  provider: "cartesia",
  providers: [{ id: "cartesia", name: "Cartesia", local: false }],
  voices: [
    {
      id: "voice-1",
      name: "Jacqueline",
      provider: "cartesia",
      language: "en",
      country: null,
      gender: null,
    },
  ],
  voices_by_provider: {
    cartesia: [
      {
        id: "voice-1",
        name: "Jacqueline",
        provider: "cartesia",
        language: "en",
        country: null,
        gender: null,
      },
    ],
  },
  dispatcher_voice: { id: "voice-1", name: "Jacqueline", provider: "cartesia" },
  local_download: {
    provider: "kokoro",
    ready: false,
    required_files: 0,
    cached_files: 0,
    detail: null,
  },
};

const sttSettings: STTSettingsResponse = {
  provider: "assemblyai",
  providers: [{ id: "assemblyai", name: "AssemblyAI", local: false, model: null }],
  local_download: {
    provider: "local_mlx_whisper",
    ready: false,
    model: "mlx-community/whisper-large-v3-turbo",
    detail: null,
  },
};

const mockVoiceEndpoints = () => {
  vi.mocked(apiFetch).mockImplementation(async (path: string) => {
    if (path === "/api/settings/tts/") {
      return { ok: true, json: async () => ttsSettings } as Response;
    }
    if (path === "/api/settings/stt/") {
      return { ok: true, json: async () => sttSettings } as Response;
    }
    throw new Error(`Unexpected request: ${path}`);
  });
};

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

it("marks the STT/TTS pickers as classic-pipeline-only when the voice engine is live", async () => {
  mockVoiceEndpoints();
  render(
    <DispatcherVoiceSettings onRestartScheduled={vi.fn()} voiceEngine="live" />,
  );

  expect(await screen.findByText("Current: Cartesia · Jacqueline")).toBeTruthy();
  expect(screen.getAllByText("Classic pipeline only")).toHaveLength(2);
  expect(screen.getAllByText(PIPELINE_ONLY_NOTE)).toHaveLength(2);
  // Marked, not hidden: the provider pickers stay in the page.
  expect(screen.getByText("Text-to-speech provider")).toBeTruthy();
  expect(screen.getByText("Speech-to-text provider")).toBeTruthy();
  expect(document.querySelectorAll("[data-pipeline-only='true']")).toHaveLength(2);
});

it("shows the STT/TTS pickers unmarked for the classic pipeline", async () => {
  mockVoiceEndpoints();
  render(
    <DispatcherVoiceSettings
      onRestartScheduled={vi.fn()}
      voiceEngine="pipeline"
    />,
  );

  expect(await screen.findByText("Current: Cartesia · Jacqueline")).toBeTruthy();
  expect(screen.queryByText("Classic pipeline only")).toBeNull();
  expect(document.querySelectorAll("[data-pipeline-only='true']")).toHaveLength(0);
});
