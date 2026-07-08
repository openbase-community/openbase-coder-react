import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  fetchMarketplaceSkillsCatalog,
  installMarketplaceSkill,
  type MarketplaceSkillEntry,
  type MarketplaceSkillsCatalog,
} from "@/lib/marketplace";
import { Download, ExternalLink, Loader2, Search, Zap } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const OfficialCatalogTab = () => {
  const [catalog, setCatalog] = useState<MarketplaceSkillsCatalog | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [selectedSlug, setSelectedSlug] = useState("");
  const [installingSlug, setInstallingSlug] = useState("");

  const fetchCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMarketplaceSkillsCatalog(query, category);
      setCatalog(data);
      setSelectedSlug((current) => {
        if (current && data.entries.some((entry) => entry.slug === current)) {
          return current;
        }
        return data.entries[0]?.slug ?? "";
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load the skills catalog",
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
    () =>
      catalog?.entries.find((entry) => entry.slug === selectedSlug) ?? null,
    [catalog?.entries, selectedSlug],
  );

  const installSkill = async (entry: MarketplaceSkillEntry) => {
    setInstallingSlug(entry.slug);
    try {
      await installMarketplaceSkill(entry.slug);
      toast.success(`Installed /${entry.slug} for Claude Code + Codex`);
      await fetchCatalog();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : `Failed to install /${entry.slug}`,
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
            placeholder="Search the official catalog"
            className="h-8 pl-7 text-[12.5px]"
          />
        </div>
        <div className="overflow-hidden rounded border border-border bg-surface">
          {loading && !catalog ? (
            <div className="flex h-40 items-center justify-center gap-2 text-[12px] text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading catalog…
            </div>
          ) : (catalog?.entries.length ?? 0) === 0 ? (
            <div className="px-4 py-8 text-center text-[12px] text-muted-foreground">
              No matching entries.
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
                      <Zap className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <span className="truncate font-mono text-[12.5px] font-medium text-foreground">
                        {entry.name}
                      </span>
                      <span className="truncate text-[10.5px] text-muted-foreground">
                        {entry.category}
                      </span>
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-[11.5px] leading-snug text-muted-foreground">
                      {entry.tagline || entry.description}
                    </span>
                  </span>
                  <span className="flex items-center gap-1">
                    {entry.installed ? (
                      <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                        installed
                      </Badge>
                    ) : null}
                    {entry.kind !== "skill" ? (
                      <Badge variant="outline" className="px-1.5 py-0 text-[10px] uppercase">
                        {entry.kind}
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
                <span>Category</span>
                <span className="truncate font-mono">{selectedEntry.category}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span>Kind</span>
                <span className="font-mono uppercase">{selectedEntry.kind}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span>Installs</span>
                <span className="font-mono">{selectedEntry.install_count}</span>
              </div>
            </div>
            {selectedEntry.kind === "skill" ? (
              <div className="border-t border-border pt-3">
                {selectedEntry.installed ? (
                  <Badge variant="secondary" className="px-1.5 py-0.5 text-[10.5px]">
                    installed
                  </Badge>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  className="mt-2 h-8 w-full text-[12px]"
                  disabled={
                    selectedEntry.installed ||
                    installingSlug === selectedEntry.slug
                  }
                  onClick={() => void installSkill(selectedEntry)}
                >
                  {installingSlug === selectedEntry.slug ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  {selectedEntry.installed ? "Installed" : "Install"}
                </Button>
                <p className="mt-1.5 text-center text-[10.5px] text-muted-foreground">
                  Installs for Claude Code + Codex
                </p>
              </div>
            ) : (
              <div className="border-t border-border pt-3">
                <div className="mb-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                  Manual install
                </div>
                {selectedEntry.install_notes ? (
                  <p className="whitespace-pre-wrap text-[11.5px] leading-relaxed text-muted-foreground">
                    {selectedEntry.install_notes}
                  </p>
                ) : (
                  <p className="text-[11.5px] text-muted-foreground">
                    This entry is installed outside of Openbase Coder.
                  </p>
                )}
              </div>
            )}
            {selectedEntry.docs_url ? (
              <Button
                asChild
                type="button"
                variant="outline"
                size="sm"
                className="h-7 w-full text-[12px]"
              >
                <a
                  href={selectedEntry.docs_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink className="h-3 w-3" />
                  View docs
                </a>
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="px-4 py-8 text-center text-[12px] text-muted-foreground">
            Select an entry.
          </div>
        )}
      </div>
    </div>
  );
};

export default OfficialCatalogTab;
