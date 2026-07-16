import { StatusBadge } from "@/components/StatusBadge";
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
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full text-left p-3 hover:bg-gray-50 rounded-lg">
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
      <CollapsibleContent className="pl-9 pr-3 pb-3 space-y-2">
        <div className="text-xs text-gray-500 space-x-4">
          {run.started_at && <span>Started: {new Date(run.started_at).toLocaleString()}</span>}
          {run.completed_at && <span>Completed: {new Date(run.completed_at).toLocaleString()}</span>}
          {run.reasoning_effort && <span>Reasoning: {run.reasoning_effort}</span>}
        </div>
        <div className="rounded border border-border bg-surface-muted px-2.5 py-1.5">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            prompt
          </p>
          <pre className="mt-1 whitespace-pre-wrap break-words font-sans text-[12.5px] text-foreground">
            {run.prompt}
          </pre>
        </div>
        {run.accumulated_output && (
          <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto max-h-96 overflow-y-auto whitespace-pre-wrap">
            {run.accumulated_output}
          </pre>
        )}
        {run.accumulated_stderr && (
          <pre className="text-xs bg-red-950 text-red-200 p-3 rounded-lg overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap">
            {run.accumulated_stderr}
          </pre>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
