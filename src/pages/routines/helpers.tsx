import type { ReactNode } from "react";

import type { Routine } from "./types";

export const fieldLabelClass =
  "text-[10px] font-semibold uppercase tracking-wider text-muted-foreground";

export const fieldInputClass =
  "mt-1 h-8 w-full rounded border border-border bg-background px-2 text-[12px] outline-none focus:border-info";

export const monoFieldInputClass = `${fieldInputClass} font-mono`;

export function formatDateTime(value?: string | null): string {
  if (!value) return "not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function scheduleLabel(routine: Routine): string {
  return routine.scheduleType === "interval"
    ? `every ${routine.intervalSeconds ?? 60}s`
    : `${routine.time} ${routine.timezone ?? ""}`.trim();
}

export function loopBodyText(routine: Routine): string {
  return routine.kind === "command" ? routine.command || "" : routine.prompt;
}

export async function extractError(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => ({}));
  return body.error || body.detail || fallback;
}

export function DetailField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 border-t border-border px-3 py-2 first:border-t-0">
      <div className={fieldLabelClass}>{label}</div>
      <div className="mt-1 min-w-0 break-words font-mono text-[12px] text-foreground">
        {children || <span className="text-muted-foreground">not set</span>}
      </div>
    </div>
  );
}
