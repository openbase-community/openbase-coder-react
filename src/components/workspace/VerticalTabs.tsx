import { useEffect, useRef, useState, type DragEvent } from "react";
import { Actions, DockLocation, type TabNode } from "flexlayout-react";
import { Pin, X } from "lucide-react";
import { useWorkspace } from "@/contexts/workspace-tabs";
import { confirmDiscardDrafts, showWorkspaceTabMenu } from "./WorkspaceTabMenu";
import { WorkspaceToolbar } from "./WorkspaceToolbar";

export function VerticalTabs() {
  const { controller } = useWorkspace();
  const root = useRef<HTMLElement>(null);
  const dragged = useRef<TabNode | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    id: string;
    after: boolean;
  } | null>(null);
  const groups = [...new Set(controller.tabs.map((tab) => tab.getParent()!))];
  const focusTab = (tab: TabNode) => {
    controller.focus(tab.getId());
    root.current
      ?.querySelector<HTMLElement>(`[data-tab-id="${tab.getId()}"]`)
      ?.focus();
  };
  const focusedId = controller.focused?.getId();
  useEffect(() => {
    root.current
      ?.querySelector('[data-focused="true"]')
      ?.scrollIntoView?.({ block: "nearest" });
  }, [focusedId]);
  const closeTab = (tab: TabNode) => {
    controller.close(tab.getId(), confirmDiscardDrafts);
    if (controller.model.getNodeById(tab.getId())) return;
    requestAnimationFrame(() => {
      const selected = controller.focused;
      if (selected) focusTab(selected);
    });
  };
  const dropAfter = (event: DragEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return event.clientY >= rect.top + rect.height / 2;
  };
  return (
    <nav
      ref={root}
      aria-label="Workspace tabs"
      className="workspace-vertical-tabs"
    >
      {groups.map((group, groupIndex) => {
        const tabs = controller.tabs.filter((tab) => tab.getParent() === group);
        return (
          <section key={group.getId()} className="border-b border-border pb-1">
            {groups.length > 1 && (
              <div className="flex items-center justify-between gap-1 px-2 py-1 text-xs text-muted-foreground">
                <span>Pane {groupIndex + 1}</span>
                <WorkspaceToolbar
                  tabId={tabs.find((tab) => tab.isSelected())?.getId()}
                  compact
                />
              </div>
            )}
            <div
              role="tablist"
              aria-label={`Pane ${groupIndex + 1} tabs`}
              aria-orientation="vertical"
            >
              {tabs.map((tab, index) => (
                <div
                  key={tab.getId()}
                  className="workspace-vertical-tab-row"
                  data-selected={tab.isSelected()}
                  data-focused={controller.focused === tab}
                  data-drop={
                    dropTarget?.id === tab.getId()
                      ? dropTarget.after
                        ? "after"
                        : "before"
                      : undefined
                  }
                  onContextMenu={(event) =>
                    showWorkspaceTabMenu(tab, event, controller)
                  }
                  onAuxClick={(event) => {
                    if (event.button === 1) {
                      event.preventDefault();
                      closeTab(tab);
                    }
                  }}
                  onDragOver={(event) => {
                    if (dragged.current) {
                      event.preventDefault();
                      event.stopPropagation();
                      event.dataTransfer.dropEffect = "move";
                      setDropTarget({
                        id: tab.getId(),
                        after: dropAfter(event),
                      });
                    }
                  }}
                  onDragLeave={(event) => {
                    if (
                      !event.currentTarget.contains(
                        event.relatedTarget as Node | null,
                      )
                    )
                      setDropTarget(null);
                  }}
                  onDrop={(event) => {
                    const source = dragged.current;
                    if (!source) return;
                    event.preventDefault();
                    event.stopPropagation();
                    controller.model.doAction(
                      Actions.moveNode(
                        source.getId(),
                        group.getId(),
                        DockLocation.CENTER,
                        index + Number(dropAfter(event)),
                      ),
                    );
                    controller.focus(source.getId());
                    dragged.current = null;
                    setDropTarget(null);
                  }}
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab.isSelected()}
                    data-tab-id={tab.getId()}
                    tabIndex={tab.isSelected() ? 0 : -1}
                    className="workspace-vertical-tab"
                    title={tab.getName()}
                    draggable
                    onClick={() => controller.focus(tab.getId())}
                    onDragStart={(event) => {
                      dragged.current = tab;
                      event.dataTransfer.setData("text/plain", tab.getId());
                      event.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => {
                      dragged.current = null;
                      setDropTarget(null);
                    }}
                    onKeyDown={(event) => {
                      if (event.metaKey || event.ctrlKey || event.altKey)
                        return;
                      const next =
                        event.key === "ArrowDown"
                          ? tabs[(index + 1) % tabs.length]
                          : event.key === "ArrowUp"
                            ? tabs[(index + tabs.length - 1) % tabs.length]
                            : event.key === "Home"
                              ? tabs[0]
                              : event.key === "End"
                                ? tabs.at(-1)
                                : undefined;
                      if (next) {
                        event.preventDefault();
                        focusTab(next);
                      }
                      if (event.key === "Delete") {
                        event.preventDefault();
                        closeTab(tab);
                      }
                    }}
                  >
                    {controller.hasDrafts(tab.getId()) && (
                      <span
                        title="Unfinished text"
                        className="h-1.5 w-1.5 shrink-0 rounded-full bg-warning"
                      />
                    )}
                    {tab.isPinned() && (
                      <Pin className="h-3 w-3 shrink-0" aria-label="Pinned" />
                    )}
                    <span className="min-w-0 truncate">{tab.getName()}</span>
                  </button>
                  <button
                    type="button"
                    className="workspace-vertical-tab-close"
                    aria-label={`Close ${tab.getName()}`}
                    title="Close tab"
                    onClick={() => closeTab(tab)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </nav>
  );
}
