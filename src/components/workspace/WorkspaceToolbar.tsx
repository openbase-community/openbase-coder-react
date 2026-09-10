import { DockLocation } from "flexlayout-react";
import {
  Columns2,
  Rows2,
  Undo2,
  Redo2,
  PanelsTopLeft,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/contexts/workspace-tabs";
import { confirmDiscardDrafts } from "./WorkspaceTabMenu";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export function WorkspaceToolbar({
  tabId,
  compact = false,
}: {
  tabId?: string;
  compact?: boolean;
}) {
  const { controller } = useWorkspace();
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7"
        title="Split right"
        aria-label="Split right"
        onClick={() => controller.split(DockLocation.RIGHT, tabId)}
      >
        <Columns2 className="h-3.5 w-3.5" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7"
        title="Split down"
        aria-label="Split down"
        onClick={() => controller.split(DockLocation.BOTTOM, tabId)}
      >
        <Rows2 className="h-3.5 w-3.5" />
      </Button>
      {!compact && (
        <>
          {controller.tabs.length > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  title="Open views"
                  aria-label="Open views"
                >
                  <PanelsTopLeft className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="max-h-80 max-w-72 overflow-y-auto"
              >
                {controller.tabs.map((tab) => (
                  <DropdownMenuItem
                    key={tab.getId()}
                    onSelect={() => controller.focus(tab.getId())}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {tab.getName()}
                    </span>
                    {controller.focused?.getId() === tab.getId() && (
                      <Check className="ml-2 h-3.5 w-3.5 shrink-0" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            title="Undo layout change"
            aria-label="Undo layout change"
            disabled={!controller.canUndo}
            onClick={() => controller.undo(confirmDiscardDrafts)}
          >
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            title="Redo layout change"
            aria-label="Redo layout change"
            disabled={!controller.canRedo}
            onClick={() => controller.redo(confirmDiscardDrafts)}
          >
            <Redo2 className="h-3.5 w-3.5" />
          </Button>
        </>
      )}
    </div>
  );
}
