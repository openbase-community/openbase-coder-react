// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ThreadListItem } from "../ThreadListItem";
import type { ThreadInfo } from "../../types/session";

const thread: ThreadInfo = {
  thread_id: "thread-1",
  directory: "/projects/openbase",
  display_name: "Openbase work",
  created_at: "2026-09-10T00:00:00.000Z",
  updated_at: "2026-09-10T00:00:00.000Z",
  current_turn: null,
  turn_history: [],
  status: "idle",
  tags: ["Openbase"],
};

describe("ThreadListItem", () => {
  it("lets a thread row add a new tag from the tag picker", async () => {
    const onTagsChange = vi.fn().mockResolvedValue(undefined);

    render(
      <ThreadListItem
        thread={thread}
        onClick={() => undefined}
        onTagsChange={onTagsChange}
        tagOptions={[{ slug: "openbase", label: "Openbase" }]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Tags" }));
    fireEvent.change(await screen.findByPlaceholderText("New tag"), {
      target: { value: "Security" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add tag" }));

    await waitFor(() => {
      expect(onTagsChange).toHaveBeenCalledWith(thread, [
        "Openbase",
        "Security",
      ]);
    });
  });
});
