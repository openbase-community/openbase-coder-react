import { Button } from "@/components/ui/button";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Panel } from "@/components/ui/panel";
import {
  Brain,
  ChevronDown,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

import type { MemoryEntry, MemorySection } from "./types";

interface MemoriesListProps {
  openMemory: (name: string, scope: string) => void;
  sections: MemorySection[];
  loading: boolean;
  setLoading: (loading: boolean) => void;
  listError: string | null;
  fetchMemories: () => Promise<void>;
  collapsedSections: Record<string, boolean>;
  toggleSection: (sectionKey: string) => void;
}

function formatUpdatedAt(updatedAt?: string): string {
  if (!updatedAt) return "";
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function memoryBadge(memory: MemoryEntry): string {
  if (memory.is_index) return "index";
  return memory.memory_type || "";
}

export function MemoriesList({
  openMemory,
  sections,
  loading,
  setLoading,
  listError,
  fetchMemories,
  collapsedSections,
  toggleSection,
}: MemoriesListProps) {
  const totalMemories = sections.reduce(
    (count, section) => count + section.memories.length,
    0,
  );

  return (
    <>
      {listError ? (
        <ErrorBanner className="flex items-center justify-between gap-3">
          <span className="min-w-0">{listError}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-6 shrink-0 px-2 text-[11px]"
            onClick={() => {
              setLoading(true);
              void fetchMemories();
            }}
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </Button>
        </ErrorBanner>
      ) : null}

      {loading ? (
        <div className="text-[12px] text-muted-foreground">Loading…</div>
      ) : (
        <div className="space-y-3">
          {totalMemories === 0 ? (
            <div className="rounded border border-dashed border-border bg-surface px-4 py-6 text-center">
              <Brain className="mx-auto h-4 w-4 text-muted-foreground/40" />
              <p className="mt-2 text-[12px] text-muted-foreground">
                No memories yet. Agents save memories as they work; they will
                show up here.
              </p>
            </div>
          ) : null}
          {sections.map((section) => {
            const collapsed = !!collapsedSections[section.key];
            return (
              <Panel key={section.key}>
                <button
                  type="button"
                  onClick={() => toggleSection(section.key)}
                  className="flex w-full items-center gap-2 border-b border-border px-3 py-2 text-left transition-colors hover:bg-surface-muted"
                  aria-expanded={!collapsed}
                >
                  {collapsed ? (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-foreground">
                      {section.label}
                    </div>
                    <div className="truncate font-mono text-[10.5px] text-muted-foreground/70">
                      {section.memories_dir}
                    </div>
                  </div>
                  <span className="shrink-0 rounded bg-surface-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {section.memories.length}
                  </span>
                </button>
                {!collapsed
                  ? section.memories.map((memory, idx) => {
                      const badge = memoryBadge(memory);
                      const updated = formatUpdatedAt(memory.updated_at);
                      return (
                        <button
                          key={`${section.key}:${memory.name}`}
                          type="button"
                          onClick={() => openMemory(memory.name, section.key)}
                          className={`group grid w-full grid-cols-[minmax(6.5rem,14rem)_minmax(0,1fr)_auto] items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-surface-muted ${
                            idx > 0 ? "border-t border-border" : ""
                          }`}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <Brain className="h-3 w-3 shrink-0 text-muted-foreground" />
                            <span className="truncate font-mono text-[12.5px] font-medium text-foreground">
                              {memory.name}
                            </span>
                          </span>
                          <span
                            className="min-w-0 truncate text-left text-[11.5px] text-muted-foreground"
                            title={memory.description || memory.path}
                          >
                            {memory.description}
                          </span>
                          <span className="flex items-center justify-end gap-1.5">
                            {badge ? (
                              <span className="rounded bg-surface-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                {badge}
                              </span>
                            ) : null}
                            {updated ? (
                              <span className="text-[10.5px] text-muted-foreground/70">
                                {updated}
                              </span>
                            ) : null}
                            <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/40 group-hover:text-foreground" />
                          </span>
                        </button>
                      );
                    })
                  : null}
              </Panel>
            );
          })}
        </div>
      )}
    </>
  );
}
