// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
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
