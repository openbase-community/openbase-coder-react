// @vitest-environment jsdom
import type { MouseEvent } from "react";
import { expect, it, vi } from "vitest";
import { showPopupMenu } from "flexlayout-react";
import { WorkspaceController } from "@/lib/workspace/WorkspaceController";
import { showWorkspaceTabMenu } from "./WorkspaceTabMenu";

vi.mock("flexlayout-react", async (importOriginal) => ({
  ...await importOriginal<typeof import("flexlayout-react")>(),
  showPopupMenu: vi.fn(),
}));

it("prevents a tab context menu from also opening its pane menu", () => {
  const controller = new WorkspaceController();
  vi.spyOn(controller.focused!, "getLayoutRef").mockReturnValue(
    document.createElement("div"),
  );
  const preventDefault = vi.fn();
  const stopPropagation = vi.fn();
  const event = { preventDefault, stopPropagation, clientX: 12, clientY: 34 };
  showWorkspaceTabMenu(
    controller.focused!,
    event as unknown as MouseEvent<HTMLElement>,
    controller,
  );
  expect(preventDefault).toHaveBeenCalledOnce();
  expect(stopPropagation).toHaveBeenCalledOnce();
  expect(showPopupMenu).toHaveBeenCalledOnce();
});
