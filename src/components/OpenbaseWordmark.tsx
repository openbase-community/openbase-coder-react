import wordmarkUrl from "@/assets/openbase-logo-and-text.svg";
import { cn } from "@/lib/utils";

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
