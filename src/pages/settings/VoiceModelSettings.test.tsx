// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/api";
import { VoiceModelSettings } from "./VoiceModelSettings";
import type { VoiceModelSettingsResponse } from "./settingsApi";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));

const gptLiveSettings: VoiceModelSettingsResponse = {
  model: "gpt-live-1",
  engine: "live",
  default: "gpt-live-1",
  options: [
    {
      id: "gpt-live-1",
      label: "GPT-Live 1",
      description: "OpenAI's full-duplex voice model.",
      engine: "live",
      is_default: true,
    },
    {
      id: "pipeline",
      label: "Classic pipeline",
      description: "Speech-to-text, then the agent's turn, then text-to-speech.",
      engine: "pipeline",
      is_default: false,
    },
  ],
  live_voice_provider: "openbase_cloud",
  live_voice_provider_options: [
    {
      id: "openbase_cloud",
      label: "Openbase Cloud",
      description: "GPT-Live through your Openbase account; no OpenAI key needed.",
      is_default: true,
    },
    {
      id: "openai",
      label: "OpenAI (your key)",
      description: "GPT-Live straight from OpenAI with your own key.",
      is_default: false,
    },
  ],
  pipeline_settings_relevant: false,
  config_path: "~/.openbase/dispatcher-config.json",
  changed: false,
  restart_required: false,
  applies_hint: "The new voice model applies to the next voice call.",
};

const pipelineSettings: VoiceModelSettingsResponse = {
  ...gptLiveSettings,
  model: "pipeline",
  engine: "pipeline",
  pipeline_settings_relevant: true,
};

const response = (data: VoiceModelSettingsResponse) =>
  ({ ok: true, json: async () => data }) as Response;

const renderSettings = (onEngineChange = vi.fn()) =>
  render(
    <MemoryRouter>
      <VoiceModelSettings onEngineChange={onEngineChange} />
    </MemoryRouter>,
  );

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

it("shows GPT-Live as the current default and the GPT-Live source picker", async () => {
  vi.mocked(apiFetch).mockResolvedValueOnce(response(gptLiveSettings));
  const onEngineChange = vi.fn();
  renderSettings(onEngineChange);

  expect(await screen.findByText("Current: GPT-Live 1 (Live)")).toBeTruthy();
  expect(screen.getAllByText("Default").length).toBeGreaterThan(0);
  expect(screen.getByText("OpenAI's full-duplex voice model.")).toBeTruthy();
  expect(screen.getByText("GPT-Live source")).toBeTruthy();
  expect(screen.getByText("Current: Openbase Cloud")).toBeTruthy();
  expect(
    screen.getByText("The new voice model applies to the next voice call."),
  ).toBeTruthy();
  expect(apiFetch).toHaveBeenCalledWith("/api/settings/voice-model/");
  await waitFor(() => expect(onEngineChange).toHaveBeenCalledWith("live"));
});

it("hides the GPT-Live source picker when the classic pipeline is selected", async () => {
  vi.mocked(apiFetch).mockResolvedValueOnce(response(pipelineSettings));
  const onEngineChange = vi.fn();
  renderSettings(onEngineChange);

  expect(
    await screen.findByText("Current: Classic pipeline (Classic pipeline)"),
  ).toBeTruthy();
  expect(screen.queryByText("GPT-Live source")).toBeNull();
  expect(screen.queryByText("Default")).toBeNull();
  await waitFor(() => expect(onEngineChange).toHaveBeenCalledWith("pipeline"));
});

it("explains that the OpenAI source needs a key and links to the env settings", async () => {
  vi.mocked(apiFetch).mockResolvedValueOnce(
    response({ ...gptLiveSettings, live_voice_provider: "openai" }),
  );
  renderSettings();

  expect(await screen.findByText("Current: OpenAI (your key)")).toBeTruthy();
  expect(screen.getByText("OPENAI_API_KEY")).toBeTruthy();
  const link = screen.getByRole("link", {
    name: "Advanced → Environment Variables",
  });
  expect(link.getAttribute("href")).toBe("/dashboard/settings?section=advanced");
});

it("disables Save while the selection matches the saved value and follows the server on Refresh", async () => {
  vi.mocked(apiFetch).mockResolvedValueOnce(response(gptLiveSettings));
  const onEngineChange = vi.fn();
  renderSettings(onEngineChange);

  await screen.findByText("Current: GPT-Live 1 (Live)");
  const saveButtons = screen.getAllByRole("button", { name: "Save" });
  expect(saveButtons).toHaveLength(2);
  expect(saveButtons.every((button) => (button as HTMLButtonElement).disabled)).toBe(
    true,
  );

  // Radix Select is not interactive under jsdom; a Refresh that returns the
  // pipeline model exercises the same apply path a successful save uses.
  vi.mocked(apiFetch).mockClear();
  vi.mocked(apiFetch).mockResolvedValueOnce(response(pipelineSettings));
  fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
  expect(apiFetch).toHaveBeenCalledWith("/api/settings/voice-model/");
  expect(
    await screen.findByText("Current: Classic pipeline (Classic pipeline)"),
  ).toBeTruthy();
  await waitFor(() => expect(onEngineChange).toHaveBeenLastCalledWith("pipeline"));
  expect(screen.queryByText("GPT-Live source")).toBeNull();
});

it("surfaces API errors", async () => {
  vi.mocked(apiFetch).mockResolvedValueOnce({
    ok: false,
    status: 500,
    json: async () => ({ error: "Voice settings unavailable." }),
  } as Response);
  renderSettings();

  expect(await screen.findByText("Voice settings unavailable.")).toBeTruthy();
});
