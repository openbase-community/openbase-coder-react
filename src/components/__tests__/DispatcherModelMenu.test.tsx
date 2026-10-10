// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { DispatcherModelMenu } from "@/components/thread/DispatcherModelMenu";
import { apiFetch } from "@/lib/api";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });

const settings = {
  backend: "codex", location: "local",
  roles: { dispatcher: { model: "gpt-test", engine: "codex" }, super_agents: { model: null, engine: "codex" } },
  models: { dispatcher: "gpt-test", super_agents: null },
  effective: { dispatcher: "gpt-test", super_agents: "gpt-test" },
  options: [], allows_custom: false, config_path: "", changed: false, restart_required: false, restart_hint: "",
};

it("cancels the up-front settings load on unmount and ignores a late response", async () => {
  let resolve!: (response: Response) => void;
  let signal: AbortSignal | null | undefined;
  vi.mocked(apiFetch).mockImplementation((_path, init) => {
    signal = init?.signal;
    return new Promise<Response>((r) => { resolve = r; });
  });
  const errors = vi.spyOn(console, "error").mockImplementation(() => {});
  const { unmount } = render(<MemoryRouter><DispatcherModelMenu /></MemoryRouter>);
  expect(screen.getByRole("button", { name: "Dispatcher model" })).toBeTruthy();
  expect(signal?.aborted).toBe(false);

  unmount();
  expect(signal?.aborted).toBe(true);
  // The response landing after unmount must not update state or throw.
  resolve(new Response(JSON.stringify(settings)));
  await new Promise((r) => setTimeout(r, 0));
  expect(errors).not.toHaveBeenCalled();
  errors.mockRestore();
});


it("offers exactly the API catalog even when the saved model is retired", async () => {
  const entries = [
    ["gpt-5.6-terra", "GPT-5.6-Terra"],
    ["gpt-6-luna", "GPT-6-Luna"],
    ["gpt-6.1-sol", "GPT-6.1-Sol"],
    ["gpt-6-astra", "GPT-6-Astra"],
    ["claude-haiku-4-5-20251001", "Claude Haiku 4.5"],
    ["claude-sonnet-5", "Claude Sonnet 5"],
    ["claude-opus-5-5", "Claude Opus 5.5"],
    ["claude-fable-5-1", "Claude Fable 5.1"],
  ];
  vi.mocked(apiFetch).mockResolvedValue(new Response(JSON.stringify({
    ...settings,
    roles: { ...settings.roles, dispatcher: { model: "gpt-5.5", engine: "codex" } },
    options: entries.map(([id, label]) => ({ id, label, engine: id.startsWith("claude") ? "claude" : "codex", available: true })),
  })));
  vi.stubGlobal("PointerEvent", MouseEvent);
  render(<MemoryRouter><DispatcherModelMenu /></MemoryRouter>);
  fireEvent.pointerDown(screen.getByRole("button", { name: "Dispatcher model" }), { button: 0, ctrlKey: false });
  await screen.findByRole("menuitem", { name: "GPT-6.1-Sol" });
  for (const [, label] of entries) expect(screen.getByRole("menuitem", { name: label })).toBeTruthy();
  expect(screen.queryByRole("menuitem", { name: "GPT-5.5" })).toBeNull();
  expect(screen.getAllByRole("menuitem")).toHaveLength(entries.length + 1); // All agent settings.
  vi.unstubAllGlobals();
});
