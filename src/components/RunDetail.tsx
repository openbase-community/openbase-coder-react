import { TurnBody } from "@/components/TurnBody";
import type { TurnInfo } from "@/types/session";

/**
 * A single history turn in the transcript. The chat rendering (prompt bubble,
 * steers, collapsible response, hover metadata) all lives in {@link TurnBody};
 * this wrapper just carries the default-open behaviour for history entries.
 */
export function RunDetail({
  run,
  defaultOpen = true,
}: {
  run: TurnInfo;
  defaultOpen?: boolean;
}) {
  return <TurnBody turn={run} defaultOpen={defaultOpen} />;
}
