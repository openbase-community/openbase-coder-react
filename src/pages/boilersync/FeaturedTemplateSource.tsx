import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Sparkles } from "lucide-react";

type FeaturedTemplateSourceProps = {
  busy: boolean;
  onDismiss: () => void;
  onImport: () => void;
};

export function FeaturedTemplateSource({
  busy,
  onDismiss,
  onImport,
}: FeaturedTemplateSourceProps) {
  return (
    <Panel className="border-primary/30 bg-gradient-to-br from-primary/10 via-surface to-surface">
      <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="rounded-md border border-primary/20 bg-primary/10 p-2 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">
                Openbase community templates
              </h2>
              <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                Featured
              </span>
            </div>
            <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-muted-foreground">
              Start with Openbase-maintained project templates. They are
              opinionated, production-oriented, and designed to work especially
              well with Openbase PaaS deployments.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 px-3 text-[12px]"
            disabled={busy}
            onClick={onDismiss}
          >
            Not now
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 px-3 text-[12px]"
            disabled={busy}
            onClick={onImport}
          >
            {busy ? "Importing…" : "Import templates"}
          </Button>
        </div>
      </div>
    </Panel>
  );
}
