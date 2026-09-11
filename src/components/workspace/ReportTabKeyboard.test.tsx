// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { WorkspacePanelContext } from "@/contexts/workspace-tabs";
import { ReportFileDetailView } from "@/components/reports/ReportFileDetailView";
import { WorkspaceController } from "@/lib/workspace/WorkspaceController";
import { useWorkspaceKeyboard } from "./useWorkspaceKeyboard";
import type { ReportsFile } from "@/types/session";

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

it("allows Command-number switching with an embedded report while preserving modal protection", () => {
  vi.spyOn(window.navigator, "platform", "get").mockReturnValue("MacIntel");
  const controller = new WorkspaceController();
  const first = controller.focused!;
  controller.openTab({ path: "/dashboard/reports", title: "Report" });
  const second = controller.focused!;
  const host = document.createElement("div");
  document.body.append(host);
  const props = {
    file: {
      name: "report.md",
      path: "report.md",
      kind: "markdown",
      size: 0,
      updated_at: 0,
    } satisfies ReportsFile,
    loading: true,
    metadata: null,
    onClose: vi.fn(),
    onDownload: vi.fn(),
    onDelete: vi.fn(),
  };
  function View({ embedded }: { embedded: boolean }) {
    useWorkspaceKeyboard(controller, host);
    return (
      <WorkspacePanelContext.Provider
        value={embedded ? { id: second.getId(), root: host } : null}
      >
        <ReportFileDetailView {...props} />
      </WorkspacePanelContext.Provider>
    );
  }
  const view = render(<View embedded />);
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(
    screen.getByRole("region", { name: "Report detail: report.md" }),
  ).toBeTruthy();
  fireEvent.keyDown(document, { key: "1", metaKey: true });
  expect(controller.focused).toBe(first);
  fireEvent.keyDown(document, { key: "2", metaKey: true });
  expect(controller.focused).toBe(second);
  view.rerender(<View embedded={false} />);
  expect(screen.getByRole("dialog")).toBeTruthy();
  act(() => fireEvent.keyDown(document, { key: "1", metaKey: true }));
  expect(controller.focused).toBe(second);
});
