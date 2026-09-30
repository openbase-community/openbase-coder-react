import { OpenbaseMark } from "@/components/OpenbaseMark";
import { ProviderLogo } from "@/components/ProviderLogo";
import { backendProvider, modelProvider } from "@/lib/model-provider";
import { isDispatcherThread } from "@/lib/thread-display";
import { cn } from "@/lib/utils";
import type { ThreadInfo } from "@/types/session";
import { MessageSquare } from "lucide-react";

/**
 * Leading icon for a thread row: the Openbase mark for Dispatcher, otherwise the
 * vendor mark of the engine the thread runs on (from its backend, falling
 * back to its model), otherwise a generic thread glyph.
 */
export function ThreadGlyph({
  thread,
  className,
}: {
  thread: ThreadInfo;
  className?: string;
}) {
  const classes = cn("h-3 w-3 shrink-0 text-muted-foreground", className);
  if (isDispatcherThread(thread)) {
    return <OpenbaseMark className={classes} />;
  }
  const provider =
    backendProvider(thread.backend) ??
    modelProvider(thread.model ?? thread.current_turn?.model);
  if (provider) {
    return <ProviderLogo provider={provider} className={classes} />;
  }
  return <MessageSquare className={classes} />;
}
