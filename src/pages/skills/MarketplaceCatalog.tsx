import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { BookOpen, Download, ExternalLink, RefreshCw, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { MarketplaceInstallDialog } from "./MarketplaceInstallDialog";
import type {
  MarketplaceRoutine,
  MarketplaceScope,
  MarketplaceSkill,
} from "./marketplaceTypes";
import {
  installMarketplaceSkill,
  useMarketplaceCatalog,
} from "./useMarketplaceCatalog";

interface MarketplaceCatalogProps {
  kind: "skills" | "routines";
  onInstalled: () => Promise<void>;
}

export function MarketplaceCatalog({
  kind,
  onInstalled,
}: MarketplaceCatalogProps) {
  const catalog = useMarketplaceCatalog(kind);
  const [installingSkill, setInstallingSkill] =
    useState<MarketplaceSkill | null>(null);
  const [installing, setInstalling] = useState(false);
  const entries = catalog.data?.entries ?? [];

  const install = async (targets: MarketplaceScope[]) => {
    if (!installingSkill) return;
    setInstalling(true);
    try {
      await installMarketplaceSkill(installingSkill, targets);
      setInstallingSkill(null);
      await Promise.all([catalog.refresh(), onInstalled()]);
    } catch (caught) {
      toast.error(
        caught instanceof Error ? caught.message : "Failed to install skill",
      );
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div className="space-y-3">
      {kind === "routines" ? (
        <div className="rounded border border-border bg-surface-muted px-3 py-2 text-[12px] text-muted-foreground">
          Routine entries are read-only templates. Review their prompts,
          commands, schedules, and required skills here; the marketplace never
          creates or schedules them automatically.
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            aria-label={`Search marketplace ${kind}`}
            value={catalog.query}
            onChange={(event) => catalog.setQuery(event.target.value)}
            placeholder={`Search ${kind}`}
            className="h-8 pl-7 text-[12px]"
          />
        </div>
        <select
          aria-label="Filter by category"
          value={catalog.category}
          onChange={(event) => catalog.setCategory(event.target.value)}
          className="h-8 rounded border border-input bg-background px-2 text-[12px] text-foreground"
        >
          <option value="">All categories</option>
          {(catalog.data?.categories ?? []).map((category) => (
            <option key={category.name} value={category.name}>
              {category.name} ({category.count})
            </option>
          ))}
        </select>
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          onClick={() => void catalog.refresh()}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {catalog.error ? <ErrorBanner>{catalog.error}</ErrorBanner> : null}
      {catalog.loading ? (
        <div className="text-[12px] text-muted-foreground">Loading…</div>
      ) : entries.length === 0 ? (
        <div className="rounded border border-dashed border-border px-4 py-8 text-center text-[12px] text-muted-foreground">
          No matching {kind}.
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {kind === "skills"
            ? (entries as MarketplaceSkill[]).map((skill) => (
                <SkillCard
                  key={skill.slug}
                  skill={skill}
                  onInstall={() => setInstallingSkill(skill)}
                />
              ))
            : (entries as MarketplaceRoutine[]).map((routine) => (
                <RoutineCard key={routine.slug} routine={routine} />
              ))}
        </div>
      )}

      <MarketplaceInstallDialog
        skill={installingSkill}
        installing={installing}
        onClose={() => !installing && setInstallingSkill(null)}
        onInstall={install}
      />
    </div>
  );
}

function SkillCard({
  skill,
  onInstall,
}: {
  skill: MarketplaceSkill;
  onInstall: () => void;
}) {
  const installedCount = Object.values(skill.installed_targets).filter(
    (state) => state === "installed",
  ).length;
  return (
    <Panel className="flex flex-col gap-3 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            <h2 className="font-mono text-[13px] font-semibold text-foreground">
              /{skill.slug}
            </h2>
            <Badge variant="outline">{skill.kind}</Badge>
            {skill.featured ? <Badge>featured</Badge> : null}
          </div>
          <p className="mt-1 text-[12px] text-foreground">{skill.tagline}</p>
        </div>
        {skill.docs_url ? (
          <a
            href={skill.docs_url}
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground hover:text-foreground"
            aria-label={`Open documentation for ${skill.name}`}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : null}
      </div>
      <p className="line-clamp-3 text-[11.5px] text-muted-foreground">
        {skill.description}
      </p>
      <div className="mt-auto flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground">
          {skill.category}
          {installedCount ? ` · installed in ${installedCount}` : ""}
        </span>
        {skill.installable ? (
          <Button size="sm" className="h-7 text-[11px]" onClick={onInstall}>
            <Download className="h-3 w-3" />
            Review install
          </Button>
        ) : (
          <span className="text-[10.5px] text-muted-foreground">
            Documentation only
          </span>
        )}
      </div>
      {skill.source ? (
        <div className="truncate font-mono text-[10px] text-muted-foreground/70">
          pinned {skill.source.commit.slice(0, 12)} · {skill.source.path}
        </div>
      ) : null}
    </Panel>
  );
}

function RoutineCard({ routine }: { routine: MarketplaceRoutine }) {
  const schedule =
    routine.schedule_type === "daily"
      ? `daily at ${routine.time ?? "configured time"}`
      : `every ${routine.interval_seconds ?? "configured"} seconds`;
  return (
    <Panel className="flex flex-col gap-3 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
            <h2 className="font-mono text-[13px] font-semibold text-foreground">
              {routine.name}
            </h2>
            <Badge variant="outline">{routine.kind}</Badge>
          </div>
          <p className="mt-1 text-[12px] text-foreground">
            {routine.tagline}
          </p>
        </div>
        <Badge variant="secondary">template</Badge>
      </div>
      <p className="line-clamp-3 text-[11.5px] text-muted-foreground">
        {routine.description}
      </p>
      <div className="rounded border border-border bg-surface-muted p-2 font-mono text-[10.5px] text-muted-foreground">
        <div>{schedule}</div>
        <div className="mt-1 truncate">
          {routine.kind === "agent" ? routine.prompt : routine.command}
        </div>
      </div>
      <div className="text-[10.5px] text-muted-foreground">
        {routine.required_skills.length
          ? `Requires ${routine.required_skills.map((skill) => `/${skill}`).join(", ")}`
          : "No required skills"}
      </div>
    </Panel>
  );
}
