import wordmarkUrl from "@/assets/openbase-logo-and-text.svg";
import { cn } from "@/lib/utils";

/**
 * Single source of truth for the Openbase brand lockup. Shared by the sign-in,
 * not-found, and sidebar surfaces across the browser console and Electron host
 * so the wordmark never drifts between the two.
 */
export function OpenbaseWordmark({
  className,
}: {
  className?: string;
}) {
  return (
    <img
      alt="Openbase"
      className={cn("h-[22px] w-auto select-none", className)}
      draggable={false}
      src={wordmarkUrl}
    />
  );
}

export default OpenbaseWordmark;
