import { StatusBadge } from "@/components/StatusBadge";
import { TurnBody } from "@/components/TurnBody";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { TurnInfo } from "@/types/session";
import { ChevronRight } from "lucide-react";
import { useState } from "react";

export function RunDetail({
  run,
  defaultOpen = true,
}: {
  run: TurnInfo;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible className="ob-run-detail" open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg p-3 text-left hover:bg-gray-50">
        <ChevronRight
          className={`h-4 w-4 transition-transform ${open ? "rotate-90" : ""}`}
        />
        <span className="flex-1 text-sm font-medium truncate">
          {run.prompt}
        </span>
        <StatusBadge status={run.status} />
        {run.reasoning_effort ? (
          <span className="rounded border border-border bg-surface-muted px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
            reasoning {run.reasoning_effort}
          </span>
        ) : null}
        {run.return_code !== null && (
          <span className="text-xs text-gray-500">
            exit {run.return_code}
          </span>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2 pb-3 pl-9 pr-3">
        <div className="text-xs text-gray-500 space-x-4">
          {run.started_at && <span>Started: {new Date(run.started_at).toLocaleString()}</span>}
          {run.completed_at && <span>Completed: {new Date(run.completed_at).toLocaleString()}</span>}
          {run.reasoning_effort && <span>Reasoning: {run.reasoning_effort}</span>}
        </div>
        <TurnBody turn={run} />
      </CollapsibleContent>
    </Collapsible>
  );
}
