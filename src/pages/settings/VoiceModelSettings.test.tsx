// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
      description:
        "OpenAI's full-duplex voice model. Runs through Openbase Cloud with your Openbase account.",
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
  render(<VoiceModelSettings onEngineChange={onEngineChange} />);

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

it("shows GPT-Live as the current default with its description and the applies hint", async () => {
  vi.mocked(apiFetch).mockResolvedValueOnce(response(gptLiveSettings));
  const onEngineChange = vi.fn();
  renderSettings(onEngineChange);

  expect(await screen.findByText("Current: GPT-Live 1 (Live)")).toBeTruthy();
  expect(screen.getAllByText("Default").length).toBeGreaterThan(0);
  expect(
    screen.getByText(
      "OpenAI's full-duplex voice model. Runs through Openbase Cloud with your Openbase account.",
    ),
  ).toBeTruthy();
  expect(
    screen.getByText("The new voice model applies to the next voice call."),
  ).toBeTruthy();
  // GPT-Live always runs through Openbase Cloud: no source picker, no key hint.
  expect(screen.queryByText("GPT-Live source")).toBeNull();
  expect(screen.queryByText("OPENAI_API_KEY")).toBeNull();
  expect(apiFetch).toHaveBeenCalledWith("/api/settings/voice-model/");
  await waitFor(() => expect(onEngineChange).toHaveBeenCalledWith("live"));
});

it("shows the classic pipeline without a default badge and reports the pipeline engine", async () => {
  vi.mocked(apiFetch).mockResolvedValueOnce(response(pipelineSettings));
  const onEngineChange = vi.fn();
  renderSettings(onEngineChange);

  expect(
    await screen.findByText("Current: Classic pipeline (Classic pipeline)"),
  ).toBeTruthy();
  expect(screen.queryByText("Default")).toBeNull();
  await waitFor(() => expect(onEngineChange).toHaveBeenCalledWith("pipeline"));
});

it("disables Save while the selection matches the saved value and follows the server on Refresh", async () => {
  vi.mocked(apiFetch).mockResolvedValueOnce(response(gptLiveSettings));
  const onEngineChange = vi.fn();
  renderSettings(onEngineChange);

  await screen.findByText("Current: GPT-Live 1 (Live)");
  const saveButton = screen.getByRole("button", { name: "Save" });
  expect((saveButton as HTMLButtonElement).disabled).toBe(true);

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
