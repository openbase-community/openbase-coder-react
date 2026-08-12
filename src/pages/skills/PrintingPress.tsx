import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { Download, Loader2, Search, Zap } from "lucide-react";

import { printingPressTargets } from "./types";
import type { UsePrintingPressResult } from "./usePrintingPress";

export function PrintingPress({
  catalog,
  loading,
  query,
  setQuery,
  category,
  setCategory,
  selectedName,
  setSelectedName,
  selectedTargets,
  toggleTarget,
  installingSkill,
  selectedEntry,
  installSkill,
}: UsePrintingPressResult) {
  return (
    <div className="grid gap-3 lg:grid-cols-[13rem_minmax(0,1fr)_18rem]">
      <Panel>
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
      </Panel>

      <div className="space-y-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search Printing Press skills"
            className="h-8 pl-7 text-[12.5px]"
          />
        </div>
        <Panel>
          {loading ? (
            <div className="flex h-40 items-center justify-center gap-2 text-[12px] text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading catalog…
            </div>
          ) : (catalog?.entries.length ?? 0) === 0 ? (
            <div className="px-4 py-8 text-center text-[12px] text-muted-foreground">
              No matching skills.
            </div>
          ) : (
            <div className="max-h-[32rem] overflow-auto">
              {catalog?.entries.map((entry, idx) => (
                <button
                  key={entry.name}
                  type="button"
                  onClick={() => setSelectedName(entry.name)}
                  className={`grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 px-3 py-2 text-left transition-colors hover:bg-surface-muted ${
                    idx > 0 ? "border-t border-border" : ""
                  } ${selectedName === entry.name ? "bg-surface-muted" : ""}`}
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <Zap className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <span className="truncate font-mono text-[12.5px] font-medium text-foreground">
                        /{entry.skill_name}
                      </span>
                      <span className="truncate text-[10.5px] text-muted-foreground">
                        {entry.category}
                      </span>
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-[11.5px] leading-snug text-muted-foreground">
                      {entry.description}
                    </span>
                  </span>
                  <span className="flex items-center gap-1">
                    {Object.values(entry.installed_targets).some(Boolean) ? (
                      <Badge
                        variant="secondary"
                        className="px-1.5 py-0 text-[10px]"
                      >
                        installed
                      </Badge>
                    ) : null}
                    {entry.mcp ? (
                      <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                        MCP
                      </Badge>
                    ) : null}
                  </span>
                </button>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <Panel>
        {selectedEntry ? (
          <div className="space-y-3 p-3">
            <div>
              <div className="font-mono text-[13px] font-medium text-foreground">
                /{selectedEntry.skill_name}
              </div>
              <div className="mt-1 text-[12px] font-medium text-foreground">
                {selectedEntry.api}
              </div>
              <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
                {selectedEntry.description}
              </p>
            </div>
            <div className="space-y-1.5 text-[11px] text-muted-foreground">
              <div className="flex justify-between gap-2">
                <span>CLI</span>
                <span className="truncate font-mono">
                  {selectedEntry.release.cli_name}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span>Version</span>
                <span className="font-mono">
                  {selectedEntry.release.version || "unknown"}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span>Printer</span>
                <span className="truncate">
                  {selectedEntry.printer_name || selectedEntry.printer}
                </span>
              </div>
              {selectedEntry.mcp ? (
                <div className="flex justify-between gap-2">
                  <span>MCP auth</span>
                  <span className="truncate font-mono">
                    {selectedEntry.mcp.auth_type || "none"}
                  </span>
                </div>
              ) : null}
            </div>
            <div className="border-t border-border pt-3">
              <div className="mb-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                Install targets
              </div>
              <div className="space-y-2">
                {printingPressTargets.map((target) => {
                  const installed = selectedEntry.installed_targets[target.key];
                  return (
                    <label
                      key={target.key}
                      className="flex items-center gap-2 text-[12px] text-foreground"
                    >
                      <Checkbox
                        checked={selectedTargets.includes(target.key)}
                        onCheckedChange={() => toggleTarget(target.key)}
                      />
                      <span className="flex-1">{target.label}</span>
                      {installed ? (
                        <span className="rounded bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-success">
                          installed
                        </span>
                      ) : null}
                    </label>
                  );
                })}
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              className="h-8 w-full text-[12px]"
              disabled={
                selectedTargets.length === 0 ||
                installingSkill === selectedEntry.name
              }
              onClick={() => installSkill(selectedEntry)}
            >
              {installingSkill === selectedEntry.name ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Install
            </Button>
          </div>
        ) : (
          <div className="px-4 py-8 text-center text-[12px] text-muted-foreground">
            Select a skill.
          </div>
        )}
      </Panel>
    </div>
  );
}
