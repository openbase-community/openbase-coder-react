// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ThreadHeader } from "../ThreadHeader";
import { apiFetch } from "@/lib/api";
import type { ThreadInfo } from "@/types/session";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const thread: ThreadInfo = {
  thread_id: "source", directory: "project", display_name: "Task", backend: "codex",
  created_at: "2026-09-17", updated_at: "2026-09-17", status: "idle", current_turn: null, turn_history: [],
};
afterEach(() => { cleanup(); vi.resetAllMocks(); });

async function openSwitch(onContinued = vi.fn()) {
  render(<ThreadHeader thread={thread} isConnected tagOptions={[]} onUpdateTags={vi.fn()}
    onToggleFavorite={vi.fn()} onArchive={vi.fn()} onOpenProject={vi.fn()} onContinued={onContinued} />);
  const trigger = screen.getByRole("button", { name: "Thread actions" });
  trigger.focus();
  fireEvent.keyDown(trigger, { key: "ArrowDown" });
  const submenu = await screen.findByRole("menuitem", { name: "Switch backend" });
  submenu.focus();
  fireEvent.keyDown(submenu, { key: "ArrowRight" });
  return onContinued;
}
const choices = () => new Response(JSON.stringify({ options: [
  { backend: "codex", label: "Codex", current: true, reason: "Current backend" },
  { backend: "claude_code", label: "Claude Code", current: false, reason: null },
] }));

it("switches through the API and reports the returned destination", async () => {
  const destination = { thread_id: "new", name: "Task · Claude Code", backend: "claude_code" };
  vi.mocked(apiFetch).mockResolvedValueOnce(choices()).mockResolvedValueOnce(new Response(JSON.stringify(destination)));
  const onContinued = await openSwitch();
  fireEvent.click(await screen.findByRole("menuitem", { name: "Claude Code" }));
  await waitFor(() => expect(onContinued).toHaveBeenCalledWith(destination));
  const [url, request] = vi.mocked(apiFetch).mock.calls[1];
  expect(url).toBe("/api/threads/source/continuations/");
  expect(JSON.parse(request!.body as string)).toMatchObject({ backend: "claude_code", request_id: expect.any(String) });
});

it("retains the idempotency key after an ambiguous network failure", async () => {
  vi.mocked(apiFetch).mockResolvedValueOnce(choices()).mockRejectedValueOnce(new Error("Connection closed"))
    .mockResolvedValueOnce(new Response(JSON.stringify({ thread_id: "new" })));
  const onContinued = await openSwitch();
  fireEvent.click(await screen.findByRole("menuitem", { name: "Claude Code" }));
  await waitFor(() => expect(screen.getByRole("menuitem", { name: "Claude Code" }).getAttribute("aria-disabled")).not.toBe("true"));
  expect(onContinued).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("menuitem", { name: "Claude Code" }));
  await waitFor(() => expect(onContinued).toHaveBeenCalled());
  expect(vi.mocked(apiFetch).mock.calls[1][1]!.body).toBe(vi.mocked(apiFetch).mock.calls[2][1]!.body);
});
