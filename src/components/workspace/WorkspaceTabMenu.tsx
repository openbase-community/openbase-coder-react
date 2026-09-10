import {
  ContextMenuBuilder,
  DockLocation,
  showPopupMenu,
  TabNode,
  TabSetNode,
  type Node,
} from "flexlayout-react";
import { Columns2, Rows2 } from "lucide-react";
import type { MouseEvent } from "react";
import type { WorkspaceController } from "@/lib/workspace/WorkspaceController";

export const confirmDiscardDrafts = () =>
  window.confirm("Close this tab and discard unfinished text?");

export function showWorkspaceTabMenu(
  node: Node,
  event: MouseEvent<HTMLElement>,
  controller: WorkspaceController,
) {
  if (!(node instanceof TabNode) && !(node instanceof TabSetNode)) return;
  event.preventDefault();
  const tab = node instanceof TabNode ? node : node.getSelectedNode();
  if (!(tab instanceof TabNode)) return;
  const items = new ContextMenuBuilder(node, {
    onAction: (action) => {
      const allowed = controller.allowAction(action, confirmDiscardDrafts);
      if (allowed) controller.model.doAction(allowed);
    },
  })
    .addCustom({
      key: "split-right",
      label: "Split right",
      icon: <Columns2 size={14} />,
      onSelect: () => controller.split(DockLocation.RIGHT, tab.getId()),
    })
    .addCustom({
      key: "split-down",
      label: "Split down",
      icon: <Rows2 size={14} />,
      onSelect: () => controller.split(DockLocation.BOTTOM, tab.getId()),
    })
    .addDivider()
    .add("pin")
    .add("maximize")
    .addDivider()
    .add("closeOthers")
    .add("closeRight")
    .add("close")
    .build();
  showPopupMenu({
    anchor: { x: event.clientX, y: event.clientY },
    items,
    container: node.getLayoutRef()!,
    onClose: () => {},
    title: "Tab actions",
  });
}
