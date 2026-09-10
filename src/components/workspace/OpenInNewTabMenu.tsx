import * as ContextMenu from "@radix-ui/react-context-menu";
import { PanelTopOpen } from "lucide-react";
import { Columns2, Rows2 } from "lucide-react";
import { DockLocation } from "flexlayout-react";
import { useRef, type ReactElement } from "react";
import { useWorkspaceTabs } from "@/contexts/workspace-tabs";
import type { WorkspaceTabTarget } from "@/lib/workspace-tabs";

export function OpenInNewTabMenu({
  target,
  children,
}: {
  target: WorkspaceTabTarget;
  children: ReactElement;
}) {
  const workspace = useWorkspaceTabs();
  const opened = useRef(false);
  if (!workspace) return children;
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content
          onCloseAutoFocus={(event) => {
            if (opened.current) event.preventDefault();
            opened.current = false;
          }}
          className="z-50 min-w-40 rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <ContextMenu.Item
            className="flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground"
            onSelect={() => {
              opened.current = true;
              workspace.openTab(target);
            }}
          >
            <PanelTopOpen className="h-4 w-4" />
            Open in new tab
          </ContextMenu.Item>
          {[
            {
              direction: DockLocation.RIGHT,
              title: "Open to the right",
              Icon: Columns2,
            },
            {
              direction: DockLocation.BOTTOM,
              title: "Open below",
              Icon: Rows2,
            },
          ].map(({ direction, title, Icon }) => (
            <ContextMenu.Item
              key={title}
              className="flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground"
              onSelect={() => {
                opened.current = true;
                workspace.openTab(target, direction);
              }}
            >
              <Icon className="h-4 w-4" />
              {title}
            </ContextMenu.Item>
          ))}
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
