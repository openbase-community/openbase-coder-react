import { CircleHelp } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const DISPATCHER_HELP_TEXT =
  "The Dispatcher is the agent in charge of all your other agents, orchestrating them. Any thread can orchestrate other agents, but the Dispatcher is the always-on session for monitoring them.";

export function DispatcherHelp() {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="What is the Dispatcher?"
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground"
          >
            <CircleHelp className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-[12px] leading-relaxed">
          {DISPATCHER_HELP_TEXT}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
