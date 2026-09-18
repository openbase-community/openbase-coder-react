import type { RuntimeFreshness } from "@/lib/runtime-freshness";
import { AlertTriangle } from "lucide-react";

export function RuntimeFreshnessWarning({ freshness }: { freshness: RuntimeFreshness | null }) {
  if (!freshness?.enabled) return null;
  const affected = freshness.components.filter((item) => item.state !== "current");
  if (affected.length === 0) return null;
  const stale = affected.filter((item) => item.state === "stale").length;
  const unknown = affected.length - stale;
  const summary = stale
    ? `Development code changed — ${stale} component${stale === 1 ? "" : "s"} need${stale === 1 ? "s" : ""} refreshing.`
    : `Cannot verify ${unknown} running component${unknown === 1 ? "" : "s"}.`;

  return (
    <details className="rounded border border-warning/40 bg-warning/10 px-3 py-1.5 text-[12px] text-warning">
      <summary className="flex cursor-pointer items-start gap-2">
        <AlertTriangle aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span role="status">{summary}{stale > 0 && unknown > 0 ? ` ${unknown} also unverified.` : ""}</span>
        <span className="ml-auto shrink-0 underline underline-offset-2">View details</span>
      </summary>
      <ul className="mt-2 space-y-2 pl-5">
        {affected.map((item) => (
          <li key={item.component}>
            <strong>{item.component}</strong>: {item.reason}{" "}
            <span className="opacity-80">{item.action}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 pl-5 opacity-75">{freshness.coverage} Refresh manually when your calls and coding sessions can be interrupted.</p>
    </details>
  );
}
