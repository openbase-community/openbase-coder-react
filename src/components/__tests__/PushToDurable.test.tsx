// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { ThreadHeader } from "../ThreadHeader";
import { MovedThreadNotice } from "../thread/MovedThreadNotice";
import { apiFetch } from "@/lib/api";
import type { ThreadInfo } from "@/types/session";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const thread: ThreadInfo = {
  thread_id: "t-1",
  directory: "/Users/me/Projects/app",
  display_name: "Task",
  backend: "codex",
  created_at: "2026-10-08",
  updated_at: "2026-10-08",
  status: "idle",
  current_turn: null,
  turn_history: [],
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const options = (overrides: Record<string, unknown> = {}) =>
  json({
    thread_id: "t-1",
    this_is_durable: false,
    blocked_reason: null,
    moved_to: null,
    targets: [
      { key: "mini.ts.net", name: "mini", host: "mini.ts.net", kind: "sync_hub", online: true, reason: null },
    ],
    ...overrides,
  });

const moved = {
  state: "moved",
  thread_id: "t-1",
  operation_id: "op",
  moved_to: { state: "moved", device: "mini", host: "mini.ts.net", thread_id: "t-1" },
  turn_started: true,
  turn_error: null,
};

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  sessionStorage.clear();
});

async function openPushMenu(target: ThreadInfo = thread, onPushed = vi.fn()) {
  render(
    <MemoryRouter>
      <ThreadHeader
        thread={target}
        isConnected
        tagOptions={[]}
        onUpdateTags={vi.fn()}
        onToggleFavorite={vi.fn()}
        onArchive={vi.fn()}
        onOpenProject={vi.fn()}
        onPushed={onPushed}
      />
    </MemoryRouter>,
  );
  const trigger = screen.getByRole("button", { name: "Thread actions" });
  trigger.focus();
  fireEvent.keyDown(trigger, { key: "ArrowDown" });
  const submenu = await screen.findByRole("menuitem", { name: "Push to durable machine" });
  submenu.focus();
  fireEvent.keyDown(submenu, { key: "ArrowRight" });
  return onPushed;
}

it("pushes to the chosen durable machine with a follow-up message", async () => {
  vi.mocked(apiFetch).mockResolvedValueOnce(options()).mockResolvedValueOnce(json(moved));
  const onPushed = await openPushMenu();

  fireEvent.click(await screen.findByRole("menuitem", { name: "Push to mini" }));
  fireEvent.change(await screen.findByLabelText("Continue with (optional)"), {
    target: { value: "keep going" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Push to mini" }));

  await waitFor(() => expect(onPushed).toHaveBeenCalledWith(moved));
  const [url, request] = vi.mocked(apiFetch).mock.calls[1];
  expect(url).toBe("/api/threads/t-1/push/");
  expect(JSON.parse(request!.body as string)).toEqual({
    to: "mini.ts.net",
    message: "keep going",
    request_id: expect.any(String),
  });
});

it("shows why the thread cannot be pushed right now", async () => {
  vi.mocked(apiFetch).mockResolvedValueOnce(
    options({ blocked_reason: "A turn is running. Wait for it to finish (or stop it), then push." }),
  );
  await openPushMenu();

  const item = await screen.findByRole("menuitem", { name: /Push to mini/ });
  expect(item.getAttribute("aria-disabled")).toBe("true");
  expect(item.textContent).toContain("A turn is running");
});

it("explains when no durable machine is set up", async () => {
  vi.mocked(apiFetch).mockResolvedValueOnce(options({ targets: [] }));
  await openPushMenu();

  expect(await screen.findByText(/No durable machine yet/)).toBeTruthy();
});

it("keeps the request id across a dropped connection and reports refusals", async () => {
  vi.mocked(apiFetch)
    .mockResolvedValueOnce(options())
    .mockRejectedValueOnce(new Error("Connection closed"))
    .mockResolvedValueOnce(
      json({ error: "mini is not reachable.", code: "target_offline", safe_to_retry: true }, 409),
    );
  const onPushed = await openPushMenu();
  fireEvent.click(await screen.findByRole("menuitem", { name: "Push to mini" }));
  const push = await screen.findByRole("button", { name: "Push to mini" });

  fireEvent.click(push);
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(screen.getByRole("alert").textContent).toContain("Retry to finish it");
  fireEvent.click(screen.getByRole("button", { name: "Push to mini" }));
  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toContain(
      "mini is not reachable. You can try again.",
    ),
  );

  const bodies = vi.mocked(apiFetch).mock.calls.slice(1).map(([, init]) => JSON.parse(init!.body as string));
  expect(bodies[0].request_id).toBe(bodies[1].request_id);
  expect(onPushed).not.toHaveBeenCalled();
});

it("hides the push action on a copy that already moved", async () => {
  render(
    <MemoryRouter>
      <ThreadHeader
        thread={{ ...thread, moved_to: { state: "moved", device: "mini" } }}
        isConnected
        tagOptions={[]}
        onUpdateTags={vi.fn()}
        onToggleFavorite={vi.fn()}
        onArchive={vi.fn()}
        onOpenProject={vi.fn()}
        onPushed={vi.fn()}
      />
    </MemoryRouter>,
  );
  const trigger = screen.getByRole("button", { name: "Thread actions" });
  trigger.focus();
  fireEvent.keyDown(trigger, { key: "ArrowDown" });
  await screen.findByRole("menuitem", { name: "Copy thread ID" });
  expect(screen.queryByRole("menuitem", { name: "Push to durable machine" })).toBeNull();
});

it("marks a moved copy read-only and follows it on request", async () => {
  const onChanged = vi.fn();
  render(
    <MovedThreadNotice
      thread={{ ...thread, moved_to: { state: "moved", device: "mini", host: "mini.ts.net" } }}
      onChanged={onChanged}
    />,
  );

  expect(screen.getByRole("status").textContent).toContain(
    "Moved to mini. It continues there; this copy is read-only.",
  );
  fireEvent.click(screen.getByRole("button", { name: "Open on mini" }));
  await waitFor(() => expect(onChanged).toHaveBeenCalled());
});

it("retries or releases an unfinished push", async () => {
  vi.mocked(apiFetch).mockResolvedValue(json(moved));
  const onChanged = vi.fn();
  const uncertain: ThreadInfo = {
    ...thread,
    moved_to: { state: "uncertain", device: "mini", host: "mini.ts.net" },
  };
  render(<MovedThreadNotice thread={uncertain} onChanged={onChanged} />);

  fireEvent.click(screen.getByRole("button", { name: "Retry push" }));
  await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByRole("button", { name: "Keep it here" }));
  await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(2));

  const calls = vi.mocked(apiFetch).mock.calls;
  expect(calls[0][0]).toBe("/api/threads/t-1/push/");
  expect(JSON.parse(calls[0][1]!.body as string)).toEqual({ to: "mini.ts.net" });
  expect(calls[1][0]).toBe("/api/threads/t-1/push/cancel/");
});
