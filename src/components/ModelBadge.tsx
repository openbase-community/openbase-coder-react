import { ProviderLogo } from "@/components/ProviderLogo";
import { modelProvider, prettyModelLabel } from "@/lib/model-provider";
import { cn } from "@/lib/utils";

/** Compact "logo + model" chip. Renders nothing when no model is known. */
export function ModelBadge({
  model,
  engine,
  suffix,
  title,
  className,
}: {
  model: string | null | undefined;
  engine?: string | null;
  /** Extra text after the label, e.g. reasoning effort. */
  suffix?: string;
  title?: string;
  className?: string;
}) {
  const label = prettyModelLabel(model);
  if (!label) return null;
  const provider = modelProvider(model, engine);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] text-muted-foreground",
        className,
      )}
      title={title ?? model ?? label}
    >
      {provider ? <ProviderLogo provider={provider} className="h-3 w-3" /> : null}
      <span className="truncate">
        {label}
        {suffix ? ` · ${suffix}` : ""}
      </span>
    </span>
  );
}
