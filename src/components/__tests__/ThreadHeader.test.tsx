// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ThreadHeader } from "../ThreadHeader";
import type { ThreadInfo } from "@/types/session";

const thread: ThreadInfo = {
  thread_id: "thread-one",
  directory: "demo",
  display_name: "Review the changes",
  backend: "codex",
  model: "test-model",
  reasoning_effort: "high",
  created_at: "2026-09-10T00:00:00Z",
  updated_at: "2026-09-10T00:00:00Z",
  status: "idle",
  current_turn: null,
  turn_history: [],
  tags: ["Review"],
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, "clipboard");
});

function header(overrides: Partial<ThreadInfo> = {}, isConnected = true) {
  const actions = {
    onUpdateTags: vi.fn(async () => {}),
    onToggleFavorite: vi.fn(async () => {}),
    onArchive: vi.fn(async () => {}),
    onOpenProject: vi.fn(),
  };
  render(
    <ThreadHeader
      thread={{ ...thread, ...overrides }}
      isConnected={isConnected}
      tagOptions={[]}
      {...actions}
    />,
  );
  return actions;
}

async function openMenu() {
  const trigger = screen.getByRole("button", { name: "Thread actions" });
  trigger.focus();
  fireEvent.keyDown(trigger, { key: "ArrowDown" });
  return screen.findByRole("menu");
}

it("keeps the title and tag access visible without exposing secondary controls", async () => {
  const actions = header();
  expect(screen.getByRole("heading").textContent).toBe(thread.display_name);
  expect(screen.getAllByRole("button")).toHaveLength(2);
  expect(screen.queryByText(thread.thread_id)).toBeNull();
  expect(screen.queryByText("Review")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Tags" }));
  fireEvent.change(await screen.findByPlaceholderText("New tag"), {
    target: { value: "Next" },
  });
  fireEvent.keyDown(screen.getByPlaceholderText("New tag"), { key: "Enter" });
  await waitFor(() =>
    expect(actions.onUpdateTags).toHaveBeenCalledWith(["Review", "Next"]),
  );
});

it("offers project and favorite actions in the keyboard-accessible menu", async () => {
  const actions = header();
  await openMenu();
  expect(screen.getByText(thread.thread_id)).toBeTruthy();
  expect(screen.getByText("Connected")).toBeTruthy();
  fireEvent.click(screen.getByRole("menuitem", { name: "Favorite thread" }));
  expect(actions.onToggleFavorite).toHaveBeenCalledOnce();
  await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
  await openMenu();
  fireEvent.click(screen.getByRole("menuitem", { name: /Open project/ }));
  expect(actions.onOpenProject).toHaveBeenCalledOnce();
});

it("requires archive confirmation and restores focus when canceled", async () => {
  const actions = header();
  await openMenu();
  fireEvent.click(screen.getByRole("menuitem", { name: "Archive thread" }));
  expect(await screen.findByRole("alertdialog")).toBeTruthy();
  expect(actions.onArchive).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  await waitFor(() =>
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Thread actions" }),
    ),
  );
  await openMenu();
  fireEvent.click(screen.getByRole("menuitem", { name: "Archive thread" }));
  fireEvent.click(await screen.findByRole("button", { name: "Archive" }));
  expect(actions.onArchive).toHaveBeenCalledOnce();
});

it("opens CLI instructions outside the menu and copies the command", async () => {
  const writeText = vi.fn(async () => {});
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  header();
  await openMenu();
  fireEvent.click(
    screen.getByRole("menuitem", { name: "Resume in Codex CLI" }),
  );
  expect(await screen.findByRole("dialog")).toBeTruthy();
  expect(screen.queryByRole("menu")).toBeNull();
  expect(screen.getByText(/two writers can fork/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Copy command" }));
  await waitFor(() =>
    expect(writeText).toHaveBeenCalledWith(
      "cd demo && codex resume thread-one",
    ),
  );
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  await waitFor(() =>
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Thread actions" }),
    ),
  );
});

it("keeps disconnection visible and hides unsupported dispatcher actions", async () => {
  header({ voice_route: { role: "dispatcher", active: true } }, false);
  expect(screen.getByLabelText("Disconnected")).toBeTruthy();
  await openMenu();
  expect(screen.queryByRole("menuitem", { name: "Archive thread" })).toBeNull();
  expect(
    screen.queryByRole("menuitem", { name: "Favorite thread" }),
  ).toBeNull();
});
