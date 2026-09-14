// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/api";
import { BackendModelSettings } from "./BackendModelSettings";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it("shows Haiku as the visible Openbase Cloud default for both roles", async () => {
  vi.mocked(apiFetch).mockResolvedValue({
    ok: true,
    json: async () => ({
      backend: "openbase_cloud",
      location: "cloud",
      roles: {
        dispatcher: { model: "haiku", engine: "claude" },
        super_agents: { model: "haiku", engine: "claude" },
      },
      models: { dispatcher: "haiku", super_agents: "haiku" },
      effective: { dispatcher: "haiku", super_agents: "haiku" },
      options: [
        {
          id: "haiku",
          label: "Claude Haiku",
          description: "Default Claude model for Openbase Cloud.",
          engine: "claude",
          available: true,
          is_default: true,
        },
        {
          id: "sonnet",
          label: "Claude Sonnet",
          description:
            "Claude Sonnet through Openbase Cloud. Trial accounts run Claude Haiku instead.",
          engine: "claude",
          available: true,
          is_default: false,
        },
      ],
      allows_custom: false,
      config_path: "~/.openbase/dispatcher-config.json",
      changed: false,
      restart_required: false,
      restart_hint: "Restart to apply.",
    }),
  } as Response);

  render(<BackendModelSettings />);

  expect(
    await screen.findAllByText("Current: Claude Haiku (default) (Claude Code)"),
  ).toHaveLength(2);
  expect(
    screen.getAllByText("Default Claude model for Openbase Cloud."),
  ).toHaveLength(2);
});
