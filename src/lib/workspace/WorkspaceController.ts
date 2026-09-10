import { createMemoryHistory } from "@remix-run/router";
import {
  Actions,
  DockLocation,
  GroupAction,
  Model,
  TabNode,
  type Action,
  type IJsonModel,
  type IJsonRowNode,
  type IJsonTabSetNode,
} from "flexlayout-react";
import { workspaceTabTitle, type WorkspaceTabTarget } from "../workspace-tabs";
import { layoutTabIds, validPanelPath } from "./layout-storage";

const defaults = {
  tabEnablePopout: false,
  tabEnableRename: false,
  tabSetEnableClose: false,
  tabSetEnableCloseButton: false,
  tabSetMinWidth: 220,
  tabSetMinHeight: 140,
};
const layoutActions = new Set([
  Actions.ADD_TAB,
  Actions.DELETE_TAB,
  Actions.MOVE_NODE,
  Actions.ADJUST_WEIGHTS,
  Actions.MAXIMIZE_TOGGLE,
  Actions.SET_TAB_PINNED,
]);

export type PanelRuntime = {
  history: ReturnType<typeof createMemoryHistory>;
  drafts: Map<string, string>;
};

export function freshWorkspace(): Model {
  return Model.fromJson({
    global: defaults,
    layout: {
      type: "row",
      children: [
        {
          type: "tabset",
          active: true,
          children: [
            {
              type: "tab",
              id: "initial",
              component: "route",
              name: "Overview",
              config: { path: "/dashboard" },
            },
          ],
        },
      ],
    },
  });
}

/** FlexLayout owns the layout tree. This adapter owns Openbase navigation and tab lifetimes. */
export class WorkspaceController {
  model: Model;
  private listeners = new Set<() => void>();
  private revision = 0;
  private runtimes = new Map<string, PanelRuntime>();
  private undoStack: IJsonModel[] = [];
  private redoStack: IJsonModel[] = [];
  private normalizing = false;
  private beforeLayout?: IJsonModel;
  urlChange: "push" | "replace" = "replace";
  compact = false;
  private previousMaximized?: string;

  constructor(model = freshWorkspace()) {
    this.model = model;
    this.attachModel();
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  getSnapshot = () => this.revision;
  changed = () => {
    this.revision++;
    this.listeners.forEach((listener) => listener());
  };
  get tabs(): TabNode[] {
    const tabs: TabNode[] = [];
    this.model.visitNodes((node) => {
      if (node instanceof TabNode) tabs.push(node);
    });
    return tabs;
  }
  get focused(): TabNode | undefined {
    const node = this.model.getActiveTabset()?.getSelectedNode();
    return node instanceof TabNode ? node : this.tabs[0];
  }
  get path(): string {
    return this.focused?.getConfig()?.path ?? "/dashboard";
  }
  get canUndo() {
    return this.undoStack.length > 0;
  }
  get canRedo() {
    return this.redoStack.length > 0;
  }

  private attachModel() {
    this.model.doAction(Actions.updateModelAttributes(defaults));
    this.normalize();
    this.model.addChangeListener({
      onBeforeAction: (action) => {
        if (
          action.type === Actions.SELECT_TAB ||
          action.type === Actions.SET_ACTIVE_TABSET
        )
          this.urlChange = "replace";
        if (
          !this.normalizing &&
          layoutActions.has(action.type) &&
          !action.isAdjusting()
        ) {
          this.beforeLayout = this.model.toJson();
        }
      },
      onAfterAction: () => {
        if (this.normalizing) return;
        if (this.beforeLayout) {
          this.undoStack.push(this.beforeLayout);
          this.undoStack = this.undoStack.slice(-30);
          this.redoStack = [];
          this.beforeLayout = undefined;
        }
        this.normalize();
        this.pruneRuntimes();
        this.changed();
      },
    });
  }
  private normalize() {
    this.normalizing = true;
    const multiple = this.tabs.length > 1;
    this.model.doAction(
      Actions.updateModelAttributes({
        tabSetEnableTabStrip: multiple,
        tabEnableClose: multiple,
      }),
    );
    if (this.compact) {
      const group = this.focused?.getParent();
      const maximized = this.model.getMaximizedTabset();
      if (group && maximized?.getId() !== group.getId()) {
        if (maximized)
          this.model.doAction(Actions.maximizeToggle(maximized.getId()));
        this.model.doAction(Actions.maximizeToggle(group.getId()));
      }
    }
    this.normalizing = false;
  }

  setCompact(compact: boolean) {
    if (compact === this.compact) return;
    this.normalizing = true;
    if (compact)
      this.previousMaximized = this.model.getMaximizedTabset()?.getId();
    else {
      const maximized = this.model.getMaximizedTabset();
      if (maximized)
        this.model.doAction(Actions.maximizeToggle(maximized.getId()));
      if (
        this.previousMaximized &&
        this.model.getNodeById(this.previousMaximized)
      )
        this.model.doAction(Actions.maximizeToggle(this.previousMaximized));
    }
    this.compact = compact;
    this.normalize();
    this.changed();
  }

  serialize(): IJsonModel {
    const layout = this.model.toJson();
    if (this.compact) {
      const clearMaximized = (node: IJsonRowNode | IJsonTabSetNode) => {
        if (node.type === "tabset")
          (node as IJsonTabSetNode).maximized =
            node.id === this.previousMaximized;
        else (node as IJsonRowNode).children.forEach(clearMaximized);
      };
      clearMaximized(layout.layout);
    }
    return layout;
  }

  runtime(id: string): PanelRuntime {
    const existing = this.runtimes.get(id);
    if (existing) return existing;
    const node = this.model.getNodeById(id) as TabNode;
    const history = createMemoryHistory({
      initialEntries: [node.getConfig().path],
      v5Compat: true,
    });
    const runtime = { history, drafts: new Map<string, string>() };
    this.runtimes.set(id, runtime);
    history.listen(({ location, action }) => {
      const path = location.pathname + location.search + location.hash;
      if (!validPanelPath(path) || !this.model.getNodeById(id)) return;
      this.urlChange = action === "PUSH" ? "push" : "replace";
      if ((this.model.getNodeById(id) as TabNode).getConfig().path === path) {
        this.changed();
        return;
      }
      this.model.doAction(
        Actions.updateNodeAttributes(id, {
          config: { path },
          name: workspaceTabTitle(path),
        }),
      );
    });
    return runtime;
  }
  navigate(path: string, id = this.focused?.getId(), replace = false) {
    if (!id || !validPanelPath(path)) return;
    const history = this.runtime(id).history;
    const current = history.location;
    if (current.pathname + current.search + current.hash === path) return;
    if (replace) history.replace(path);
    else history.push(path);
  }
  focus(id: string) {
    const node = this.model.getNodeById(id);
    if (!(node instanceof TabNode) || this.focused?.getId() === id) return;
    this.urlChange = "replace";
    this.model.doAction(Actions.selectTab(id));
    this.model.doAction(Actions.setActiveTabset(node.getParent()!.getId()));
  }
  openTab(
    target: WorkspaceTabTarget,
    direction = DockLocation.CENTER,
    sourceId = this.focused?.getId(),
  ) {
    this.urlChange = "replace";
    const source = sourceId ? this.model.getNodeById(sourceId) : this.focused;
    const group = source?.getParent() ?? this.model.getFirstTabSet();
    if (!group || !validPanelPath(target.path)) return;
    const node = this.model.doAction(
      Actions.addTab(
        {
          type: "tab",
          component: "route",
          name: target.title,
          config: { path: target.path },
        },
        group.getId(),
        direction,
        -1,
        true,
      ),
    ) as TabNode;
    this.focus(node.getId());
  }
  split(direction: DockLocation, id = this.focused?.getId()) {
    const tab = this.model.getNodeById(id ?? "");
    if (tab instanceof TabNode)
      this.openTab(
        { path: tab.getConfig().path, title: tab.getName() },
        direction,
        id,
      );
  }
  rename(id: string, title: string) {
    const node = this.model.getNodeById(id);
    if (node instanceof TabNode && node.getName() !== title)
      this.model.doAction(Actions.renameTab(id, title));
  }
  hasDrafts(id?: string) {
    const runtimes = id ? [this.runtimes.get(id)] : [...this.runtimes.values()];
    return runtimes.some(
      (runtime) =>
        runtime &&
        [...runtime.drafts.keys()].some(
          (key) => !key.startsWith("report-mode:"),
        ),
    );
  }
  allowAction(
    action: Action,
    confirmDiscard: () => boolean,
  ): Action | undefined {
    if (action instanceof GroupAction) {
      return action.actions.every((child) =>
        this.allowAction(child, confirmDiscard),
      )
        ? action
        : undefined;
    }
    if (action.type === Actions.DELETE_TAB) {
      if (this.tabs.length <= 1) return undefined;
      if (this.hasDrafts(action.data.node) && !confirmDiscard())
        return undefined;
    }
    return action;
  }
  close(id: string, confirmDiscard: () => boolean) {
    const action = this.allowAction(Actions.deleteTab(id), confirmDiscard);
    if (action) this.model.doAction(action);
  }
  private restore(layout: IJsonModel) {
    this.model = Model.fromJson(layout, this.model);
    this.attachModel();
    for (const tab of this.tabs)
      this.navigate(tab.getConfig().path, tab.getId(), true);
    this.changed();
  }
  private pruneRuntimes() {
    const retained = new Set(this.tabs.map((tab) => tab.getId()));
    for (const layout of [...this.undoStack, ...this.redoStack])
      for (const id of layoutTabIds(layout)) retained.add(id);
    for (const id of this.runtimes.keys())
      if (!retained.has(id)) this.runtimes.delete(id);
  }
  private allowRestore(
    layout: IJsonModel | undefined,
    confirmDiscard: () => boolean,
  ) {
    if (!layout) return false;
    const retained = layoutTabIds(layout);
    return (
      !this.tabs.some(
        (tab) => !retained.has(tab.getId()) && this.hasDrafts(tab.getId()),
      ) || confirmDiscard()
    );
  }
  undo(confirmDiscard = () => false) {
    if (!this.allowRestore(this.undoStack.at(-1), confirmDiscard)) return;
    const previous = this.undoStack.pop();
    if (!previous) return;
    this.redoStack.push(this.model.toJson());
    this.restore(previous);
  }
  redo(confirmDiscard = () => false) {
    if (!this.allowRestore(this.redoStack.at(-1), confirmDiscard)) return;
    const next = this.redoStack.pop();
    if (!next) return;
    this.undoStack.push(this.model.toJson());
    this.restore(next);
  }
}
