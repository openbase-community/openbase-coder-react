// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { VoiceModelProvider, useVoiceModel } from "./voice-model";
import { apiFetch } from "@/lib/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GptLiveMenuToggle } from "@/components/thread/GptLiveMenuToggle";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
let model: string;
let low: boolean;
let warningId: string;
let failSave: boolean;
const response = (body: unknown, ok = true) =>
  ({ ok, json: async () => body }) as Response;
beforeEach(() => {
  const storage = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  });
  model = "gpt-live-1";
  low = false;
  failSave = false;
  warningId = crypto.randomUUID();
  vi.mocked(apiFetch).mockImplementation(async (path, init) => {
    if (init?.method === "PUT") {
      if (failSave) return response({}, false);
      model = JSON.parse(init.body as string).model;
    }
    return path.endsWith("usage/")
      ? response({
          model,
          budget: {
            warning_id: warningId,
            low,
            shared: true,
            remaining_percent: low ? 10 : 11,
          },
        })
      : response({
          model,
          engine: model === "pipeline" ? "pipeline" : "live",
          options: [],
        });
  });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});
function Controls({ menu = false }: { menu?: boolean }) {
  const voice = useVoiceModel()!;
  return (
    <>
      <span data-testid="model">{voice.settings?.model}</span>
      <button onClick={() => void voice.refresh()}>Refresh</button>
      <button onClick={() => void voice.save("gpt-live-1")}>Enable live</button>
      {menu && (
        <DropdownMenu open>
          <DropdownMenuTrigger>Models</DropdownMenuTrigger>
          <DropdownMenuContent>
            <GptLiveMenuToggle />
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </>
  );
}
const mount = () =>
  render(
    <VoiceModelProvider enabled>
      <Controls />
    </VoiceModelProvider>,
  );

it("warns at the threshold once, including after remount and later polls", async () => {
  const view = mount();
  await screen.findByText("gpt-live-1");
  expect(screen.queryByRole("alertdialog")).toBeNull();
  low = true;
  fireEvent.click(screen.getByText("Refresh"));
  await screen.findByRole("alertdialog");
  await waitFor(() =>
    expect(document.activeElement).toBe(screen.getByText("Keep GPT Live")),
  );
  fireEvent.click(screen.getByText("Keep GPT Live"));
  fireEvent.click(screen.getByText("Refresh"));
  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  view.unmount();
  mount();
  await screen.findByText("gpt-live-1");
  expect(screen.queryByRole("alertdialog")).toBeNull();
});

it("switches only the saved picker value and permits opting back into live", async () => {
  low = true;
  mount();
  await screen.findByRole("alertdialog");
  fireEvent.click(screen.getByText("Switch to classic"));
  await screen.findByText("pipeline");
  expect(screen.getByTestId("model").textContent).toBe("pipeline");
  const writes = vi
    .mocked(apiFetch)
    .mock.calls.filter(([, init]) => init?.method === "PUT");
  expect(writes).toHaveLength(1);
  expect(writes[0][0]).toBe("/api/settings/voice-model/");
  expect(JSON.parse(writes[0][1]!.body as string)).toEqual({
    model: "pipeline",
  });
  fireEvent.click(screen.getByText("Enable live"));
  await screen.findByText("gpt-live-1");
  fireEvent.click(screen.getByText("Refresh"));
  expect(screen.queryByRole("alertdialog")).toBeNull();
});

it("keeps the warning and saved model when a save fails", async () => {
  low = true;
  failSave = true;
  mount();
  await screen.findByRole("alertdialog");
  fireEvent.click(screen.getByText("Switch to classic"));
  await waitFor(() =>
    expect(screen.getByText("Switch to classic").hasAttribute("disabled")).toBe(
      false,
    ),
  );
  expect(screen.getByTestId("model").textContent).toBe("gpt-live-1");
  expect(screen.getByRole("alertdialog")).toBeTruthy();
});

it("quick checkbox switches both ways without closing the picker", async () => {
  render(
    <VoiceModelProvider enabled>
      <Controls menu />
    </VoiceModelProvider>,
  );
  await screen.findByText("gpt-live-1");
  fireEvent.click(screen.getByRole("menuitemcheckbox"));
  await screen.findByText("pipeline");
  expect(
    screen.getByRole("menuitemcheckbox").getAttribute("aria-checked"),
  ).toBe("false");
  fireEvent.click(screen.getByRole("menuitemcheckbox"));
  await screen.findByText("gpt-live-1");
  expect(
    screen.getByRole("menuitemcheckbox").getAttribute("aria-checked"),
  ).toBe("true");
});

it("honors persisted dismissal and warns again only for a new allowance", async () => {
  low = true;
  window.localStorage.setItem(
    `openbase.live-voice-warning.${warningId}`,
    "shown",
  );
  mount();
  await screen.findByText("gpt-live-1");
  expect(screen.queryByRole("alertdialog")).toBeNull();
  warningId = crypto.randomUUID();
  fireEvent.click(screen.getByText("Refresh"));
  await screen.findByRole("alertdialog");
});
