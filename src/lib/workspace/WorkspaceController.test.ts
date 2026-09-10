// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Actions, DockLocation, Model } from "flexlayout-react";
import { WorkspaceController } from "./WorkspaceController";
import { workspaceItemHref } from "./urls";
import { readWorkspaceLayout, saveWorkspaceLayout } from "./layout-storage";

const values = new Map<string, string>();
const storage = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => {
    values.set(key, value);
  },
};
beforeEach(() => values.clear());

describe("workspace navigation and layout", () => {
  it("keeps pane links valid in reverse-proxy consoles and desktop hash routing", () => {
    expect(
      workspaceItemHref("/dashboard/threads/one", "/console/team/", "web"),
    ).toBe("/console/team/dashboard/threads/one");
    expect(
      workspaceItemHref("/dashboard/reports?report=plan.md", "/", "electron"),
    ).toBe("#/dashboard/reports?report=plan.md");
  });
  it("replaces only the focused tab and keeps independent navigation histories", () => {
    const workspace = new WorkspaceController();
    const first = workspace.focused!.getId();
    workspace.navigate("/dashboard/threads");
    workspace.openTab({ path: "/dashboard/reports", title: "Reports" });
    const second = workspace.focused!.getId();
    workspace.navigate("/dashboard/projects");
    expect(workspace.tabs).toHaveLength(2);
    expect(workspace.tabs[0].getConfig().path).toBe("/dashboard/threads");
    workspace.runtime(second).history.go(-1);
    expect(workspace.path).toBe("/dashboard/reports");
    workspace.focus(first);
    expect(workspace.path).toBe("/dashboard/threads");
  });

  it("keeps tab identity, history, and drafts through moving and undoing a split", () => {
    const workspace = new WorkspaceController();
    const first = workspace.focused!.getId();
    const runtime = workspace.runtime(first);
    runtime.drafts.set("thread-prompt:one", "Unsent text");
    workspace.split(DockLocation.RIGHT);
    const otherGroup = workspace.focused!.getParent()!.getId();
    workspace.model.doAction(
      Actions.moveNode(first, otherGroup, DockLocation.CENTER, -1),
    );
    expect(workspace.runtime(first)).toBe(runtime);
    expect(workspace.model.getRootRow().getChildren()).toHaveLength(1);
    workspace.undo();
    expect(workspace.tabs).toHaveLength(2);
    expect(workspace.runtime(first).drafts.get("thread-prompt:one")).toBe(
      "Unsent text",
    );
    workspace.redo();
    expect(workspace.tabs[0].getParent()).toBe(workspace.tabs[1].getParent());
  });

  it("protects unfinished drafts and never closes the final tab", () => {
    const workspace = new WorkspaceController();
    workspace.openTab({ path: "/dashboard/reports", title: "Reports" });
    const id = workspace.focused!.getId();
    workspace.runtime(id).drafts.set("report-edit:plan", "Unsaved report");
    const confirm = vi.fn(() => false);
    workspace.close(id, confirm);
    expect(confirm).toHaveBeenCalledOnce();
    expect(workspace.tabs).toHaveLength(2);
    workspace.runtime(id).drafts.set("report-edit:plan", "");
    expect(workspace.hasDrafts(id)).toBe(true);
    workspace.close(id, () => true);
    expect(workspace.tabs).toHaveLength(1);
    workspace.close(workspace.focused!.getId(), () => true);
    expect(workspace.tabs).toHaveLength(1);
    expect(workspace.model.toJson().global?.tabSetEnableTabStrip).toBe(false);
  });

  it("removes an empty split and restores it through undo", () => {
    const workspace = new WorkspaceController();
    workspace.split(DockLocation.RIGHT);
    const second = workspace.focused!.getId();
    workspace.close(second, () => true);
    expect(workspace.model.getRootRow().getChildren()).toHaveLength(1);
    expect(workspace.model.toJson().global?.tabSetEnableTabStrip).toBe(false);
    workspace.undo();
    expect(workspace.model.getRootRow().getChildren()).toHaveLength(2);
    workspace.redo();
    expect(workspace.model.getRootRow().getChildren()).toHaveLength(1);
  });

  it("cleans empty panes saved by older layouts without allowing bulk close", () => {
    const workspace = new WorkspaceController(
      Model.fromJson({
        global: { tabSetEnableClose: false },
        layout: {
          type: "row",
          children: [
            {
              type: "tabset",
              children: [{
                type: "tab",
                component: "route",
                name: "Overview",
                config: { path: "/dashboard" },
              }],
            },
            { type: "tabset", children: [] },
          ],
        },
      }),
    );
    expect(workspace.model.getRootRow().getChildren()).toHaveLength(1);
    expect(
      workspace.allowAction(
        Actions.deleteTabset(workspace.focused!.getParent()!.getId()),
        () => true,
      ),
    ).toBeUndefined();
    expect(workspace.tabs).toHaveLength(1);
  });

  it("restores layout independently of URLs and rejects damaged or external destinations", () => {
    const workspace = new WorkspaceController();
    workspace.navigate("/dashboard/threads/one");
    workspace.openTab(
      { path: "/dashboard/reports?project=demo&report=plan.md", title: "Plan" },
      DockLocation.BOTTOM,
    );
    expect(saveWorkspaceLayout(storage, "layout", workspace.serialize())).toBe(
      true,
    );
    const restored = new WorkspaceController(
      readWorkspaceLayout(storage, "layout")!,
    );
    expect(restored.tabs.map((tab) => tab.getConfig().path)).toEqual(
      workspace.tabs.map((tab) => tab.getConfig().path),
    );
    expect(restored.path).toBe(workspace.path);
    storage.setItem("layout", "broken");
    expect(readWorkspaceLayout(storage, "layout")).toBeNull();
    const count = workspace.tabs.length;
    workspace.openTab({ path: "https://example.com", title: "External" });
    expect(workspace.tabs).toHaveLength(count);
  });

  it("protects drafts when undo would remove a newly opened tab", () => {
    const workspace = new WorkspaceController();
    workspace.openTab({ path: "/dashboard/reports", title: "Reports" });
    const id = workspace.focused!.getId();
    workspace.runtime(id).drafts.set("report-edit:plan", "");
    workspace.undo();
    expect(workspace.tabs).toHaveLength(2);
    workspace.undo(() => true);
    expect(workspace.tabs).toHaveLength(1);
    workspace.redo();
    expect(workspace.runtime(id).drafts.has("report-edit:plan")).toBe(true);
  });

  it("focuses one pane on narrow screens without destroying the desktop arrangement", () => {
    const workspace = new WorkspaceController();
    const first = workspace.focused!.getId();
    workspace.split(DockLocation.RIGHT);
    workspace.setCompact(true);
    expect(workspace.model.getMaximizedTabset()).toBe(
      workspace.focused!.getParent(),
    );
    workspace.focus(first);
    expect(workspace.model.getMaximizedTabset()).toBe(
      workspace.focused!.getParent(),
    );
    const saved = new WorkspaceController(readWorkspaceLayoutFrom(workspace));
    expect(saved.model.getMaximizedTabset()).toBeUndefined();
    workspace.setCompact(false);
    expect(workspace.model.getMaximizedTabset()).toBeUndefined();
    expect(workspace.tabs).toHaveLength(2);
  });
});

function readWorkspaceLayoutFrom(workspace: WorkspaceController) {
  saveWorkspaceLayout(storage, "compact", workspace.serialize());
  return readWorkspaceLayout(storage, "compact")!;
}
