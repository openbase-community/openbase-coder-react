import { useState } from "react";
import { CloudUpload, LoaderCircle } from "lucide-react";
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import {
  loadPushOptions,
  type DurableTarget,
  type PushOptions,
} from "@/lib/thread-push";
import type { ThreadInfo } from "@/types/session";

/**
 * "Push to durable machine" submenu: lists the user's durable machines
 * (the always-on sync hub today) with the reason each one cannot take the
 * thread right now. Choosing one hands off to the confirmation dialog,
 * which lives outside the menu so it survives the menu closing.
 */
export function PushToDurableMenu({
  thread,
  onChoose,
}: {
  thread: ThreadInfo;
  onChoose: (target: DurableTarget) => void;
}) {
  const [options, setOptions] = useState<PushOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setOptions(await loadPushOptions(thread));
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to check durable machines",
      );
    } finally {
      setLoading(false);
    }
  };
  const blocked = options?.blocked_reason ?? null;
  const targets = options?.targets ?? [];
  return (
    <DropdownMenuSub
      onOpenChange={(open) => {
        if (open) void load();
      }}
    >
      <DropdownMenuSubTrigger className="gap-2">
        <CloudUpload className="h-4 w-4" />
        Push to durable machine
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent className="w-72">
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            Pauses the thread here and continues it on a computer that stays on.
          </DropdownMenuLabel>
          {loading ? (
            <DropdownMenuItem disabled className="gap-2">
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              Checking durable machines…
            </DropdownMenuItem>
          ) : null}
          {error ? (
            <DropdownMenuItem disabled className="whitespace-normal">
              {error}
            </DropdownMenuItem>
          ) : null}
          {!loading && !error && options && targets.length === 0 ? (
            <DropdownMenuItem disabled className="whitespace-normal">
              {options.this_is_durable
                ? "This computer is your durable machine."
                : "No durable machine yet. Pair this computer with an always-on computer under Settings → Sync."}
            </DropdownMenuItem>
          ) : null}
          {!loading && !error
            ? targets.map((target) => {
                const reason = blocked ?? target.reason;
                return (
                  <DropdownMenuItem
                    key={target.key}
                    disabled={Boolean(reason)}
                    onSelect={() => onChoose(target)}
                    className="flex items-start gap-2"
                  >
                    <span className="min-w-0">
                      Push to {target.name}
                      {reason ? (
                        <span className="block whitespace-normal text-xs text-muted-foreground">
                          {reason}
                        </span>
                      ) : null}
                    </span>
                  </DropdownMenuItem>
                );
              })
            : null}
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  );
}
