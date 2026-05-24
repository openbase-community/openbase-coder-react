import { Button } from "@/components/ui/button";
import { RefreshCw, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type ResourcePageHeaderProps = {
  title: string;
  subtitle: ReactNode;
  loading?: boolean;
  refreshLabel?: string;
  refreshDisabled?: boolean;
  onRefresh: () => void;
};

export const ResourcePageHeader = ({
  title,
  subtitle,
  loading = false,
  refreshLabel = "Refresh",
  refreshDisabled = false,
  onRefresh,
}: ResourcePageHeaderProps) => (
  <div className="flex items-center justify-between gap-3">
    <div className="min-w-0">
      <h1 className="text-base font-semibold tracking-tight text-foreground">
        {title}
      </h1>
      <p className="mt-0.5 text-[12px] text-muted-foreground">{subtitle}</p>
    </div>
    <Button
      variant="outline"
      size="sm"
      className="h-7 px-2.5 text-[12px]"
      onClick={onRefresh}
      disabled={refreshDisabled || loading}
    >
      <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
      {refreshLabel}
    </Button>
  </div>
);

export const ResourceError = ({ message }: { message: string | null }) =>
  message ? (
    <div className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
      {message}
    </div>
  ) : null;

export const ResourceLoading = ({ children }: { children: ReactNode }) => (
  <div className="text-[12px] text-muted-foreground">{children}</div>
);

type ResourceEmptyStateProps = {
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
};

export const ResourceEmptyState = ({
  icon: Icon,
  children,
  className = "py-6",
}: ResourceEmptyStateProps) => (
  <div
    className={`rounded border border-dashed border-border bg-surface px-4 text-center ${className}`}
  >
    {Icon ? <Icon className="mx-auto h-4 w-4 text-muted-foreground/40" /> : null}
    <p className="mt-2 text-[12px] text-muted-foreground">{children}</p>
  </div>
);
