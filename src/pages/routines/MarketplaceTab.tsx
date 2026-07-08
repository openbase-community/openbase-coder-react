import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  describeRoutineSchedule,
  fetchMarketplaceRoutinesCatalog,
  installMarketplaceRoutine,
  type MarketplaceRoutineEntry,
  type MarketplaceRoutinesCatalog,
} from "@/lib/marketplace";
import { CalendarClock, Download, Loader2, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

interface MarketplaceTabProps {
  initialSlug?: string;
  onInstalled?: () => void | Promise<void>;
}

const localTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    return "";
  }
};

const MarketplaceTab = ({ initialSlug, onInstalled }: MarketplaceTabProps) => {
  const [catalog, setCatalog] = useState<MarketplaceRoutinesCatalog | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState(initialSlug ?? "");
  const [category, setCategory] = useState("");
  const [selectedSlug, setSelectedSlug] = useState(initialSlug ?? "");
  const [installingSlug, setInstallingSlug] = useState("");

  const fetchCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMarketplaceRoutinesCatalog(query, category);
      setCatalog(data);
      setSelectedSlug((current) => {
        if (current && data.entries.some((entry) => entry.slug === current)) {
          return current;
        }
        return data.entries[0]?.slug ?? "";
      });
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to load the routines marketplace",
      );
    }
    setLoading(false);
  }, [category, query]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchCatalog();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [fetchCatalog]);

  const selectedEntry = useMemo(
    () => catalog?.entries.find((entry) => entry.slug === selectedSlug) ?? null,
    [catalog?.entries, selectedSlug],
  );

  const installRoutine = async (entry: MarketplaceRoutineEntry) => {
    setInstallingSlug(entry.slug);
    try {
      const result = await installMarketplaceRoutine(entry.slug, {
        timezone: localTimezone(),
      });
      const parts = [`Installed "${result.installed_name}"`];
      if (result.installed_skills.length > 0) {
        parts.push(`with skills: ${result.installed_skills.join(", ")}`);
      }
      toast.success(parts.join(" "));
      if (result.manual_dependencies.length > 0) {
        toast.warning(
          `Requires manual setup: ${result.manual_dependencies
            .map((dep) => dep.name)
            .join(", ")}`,
        );
      }
      await fetchCatalog();
      await onInstalled?.();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : `Failed to install ${entry.slug}`,
      );
    }
    setInstallingSlug("");
  };

  return (
    <div className="grid gap-3 lg:grid-cols-[13rem_minmax(0,1fr)_18rem]">
      <div className="overflow-hidden rounded border border-border bg-surface">
        <button
          type="button"
          onClick={() => setCategory("")}
          className={`flex w-full items-center justify-between border-b border-border px-3 py-2 text-left text-[12px] ${
            !category
              ? "bg-surface-muted text-foreground"
              : "text-muted-foreground hover:bg-surface-muted"
          }`}
        >
          <span>All categories</span>
          <span>
            {catalog?.categories.reduce(
              (count, item) => count + item.count,
              0,
            ) ?? 0}
          </span>
        </button>
        <div className="max-h-[30rem] overflow-auto">
          {(catalog?.categories ?? []).map((item) => (
            <button
              key={item.name}
              type="button"
              onClick={() => setCategory(item.name)}
              className={`flex w-full items-center justify-between border-b border-border px-3 py-2 text-left font-mono text-[11.5px] last:border-b-0 ${
                category === item.name
                  ? "bg-surface-muted text-foreground"
                  : "text-muted-foreground hover:bg-surface-muted"
              }`}
            >
              <span className="truncate">{item.name}</span>
              <span className="ml-2 text-[10px]">{item.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search routines"
            className="h-8 pl-7 text-[12.5px]"
          />
        </div>
        <div className="overflow-hidden rounded border border-border bg-surface">
          {loading && !catalog ? (
            <div className="flex h-40 items-center justify-center gap-2 text-[12px] text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading marketplace…
            </div>
          ) : (catalog?.entries.length ?? 0) === 0 ? (
            <div className="px-4 py-8 text-center text-[12px] text-muted-foreground">
              No matching routines.
            </div>
          ) : (
            <div className="max-h-[32rem] overflow-auto">
              {catalog?.entries.map((entry, idx) => (
                <button
                  key={entry.slug}
                  type="button"
                  onClick={() => setSelectedSlug(entry.slug)}
                  className={`grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 px-3 py-2 text-left transition-colors hover:bg-surface-muted ${
                    idx > 0 ? "border-t border-border" : ""
                  } ${selectedSlug === entry.slug ? "bg-surface-muted" : ""}`}
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <CalendarClock className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <span className="truncate font-mono text-[12.5px] font-medium text-foreground">
                        {entry.name}
                      </span>
                      <span className="truncate text-[10.5px] text-muted-foreground">
                        {describeRoutineSchedule(entry)}
                      </span>
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-[11.5px] leading-snug text-muted-foreground">
                      {entry.tagline || entry.description}
                    </span>
                  </span>
                  <span className="flex items-center gap-1">
                    {entry.installed ? (
                      <Badge
                        variant="secondary"
                        className="px-1.5 py-0 text-[10px]"
                      >
                        installed
                      </Badge>
                    ) : null}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded border border-border bg-surface">
        {selectedEntry ? (
          <div className="space-y-3 p-3">
            <div>
              <div className="font-mono text-[13px] font-medium text-foreground">
                {selectedEntry.name}
              </div>
              {selectedEntry.tagline ? (
                <div className="mt-1 text-[12px] font-medium text-foreground">
                  {selectedEntry.tagline}
                </div>
              ) : null}
              <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
                {selectedEntry.description}
              </p>
            </div>
            <div className="space-y-1.5 text-[11px] text-muted-foreground">
              <div className="flex justify-between gap-2">
                <span>Schedule</span>
                <span className="truncate font-mono">
                  {describeRoutineSchedule(selectedEntry)}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span>Category</span>
                <span className="truncate font-mono">
                  {selectedEntry.category}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span>Installs</span>
                <span className="font-mono">{selectedEntry.install_count}</span>
              </div>
            </div>
            {(selectedEntry.prompt || selectedEntry.command) ? (
              <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded border border-border bg-background px-2 py-1.5 text-[11px] leading-relaxed text-muted-foreground">
                {selectedEntry.prompt || selectedEntry.command}
              </pre>
            ) : null}
            {selectedEntry.required_skills.length > 0 ? (
              <div className="space-y-1">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Required skills
                </div>
                <div className="flex flex-wrap gap-1">
                  {selectedEntry.required_skills.map((skill) => (
                    <Badge
                      key={skill.slug}
                      variant={skill.installed ? "secondary" : "outline"}
                      className="px-1.5 py-0 text-[10px]"
                    >
                      {skill.name}
                      {skill.kind !== "skill" ? " (manual)" : ""}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="border-t border-border pt-3">
              <Button
                type="button"
                size="sm"
                className="h-8 w-full text-[12px]"
                disabled={
                  selectedEntry.installed ||
                  installingSlug === selectedEntry.slug
                }
                onClick={() => void installRoutine(selectedEntry)}
              >
                {installingSlug === selectedEntry.slug ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                {selectedEntry.installed ? "Installed" : "Install routine"}
              </Button>
              <p className="mt-1.5 text-center text-[10.5px] text-muted-foreground">
                Installs into your local routines and any required skills
              </p>
            </div>
          </div>
        ) : (
          <div className="px-4 py-8 text-center text-[12px] text-muted-foreground">
            Select a routine.
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketplaceTab;
