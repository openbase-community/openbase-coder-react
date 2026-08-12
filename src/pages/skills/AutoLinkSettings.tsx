import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, RefreshCw } from "lucide-react";

import type { AutoLinkSettings as AutoLinkSettingsData, AutoLinkSyncResult } from "./types";

interface AutoLinkSettingsProps {
  settings: AutoLinkSettingsData;
  sync: AutoLinkSyncResult | null;
  saving: boolean;
  onToggle: (enabled: boolean) => void;
  onScan: () => void;
}

export function AutoLinkSettings({
  settings,
  sync,
  saving,
  onToggle,
  onScan,
}: AutoLinkSettingsProps) {
  return (
    <div className="rounded border border-border bg-surface px-3 py-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex min-w-0 items-center gap-2">
          <Checkbox
            checked={settings.auto_link_personal_skills}
            disabled={saving}
            onCheckedChange={(checked) => onToggle(checked === true)}
          />
          <span className="min-w-0">
            <span className="block text-[13px] font-medium text-foreground">
              Auto-link personal skills
            </span>
            <span className="block truncate text-[11.5px] text-muted-foreground">
              Symlink normal Codex and Claude Code skills into the Openbase
              homes when this page refreshes.
            </span>
          </span>
        </label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-2.5 text-[12px]"
          disabled={saving}
          onClick={onScan}
        >
          {saving ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          Scan now
        </Button>
      </div>
      {sync ? (
        <div className="mt-2 flex flex-wrap gap-1.5 text-[10.5px]">
          <Badge variant="secondary">linked {sync.created}</Badge>
          <Badge variant="outline">already linked {sync.already_linked}</Badge>
          {sync.conflicts ? (
            <Badge variant="outline" className="border-warning/40 text-warning">
              conflicts {sync.conflicts}
            </Badge>
          ) : null}
          {sync.errors ? (
            <Badge
              variant="outline"
              className="border-destructive/40 text-destructive"
            >
              errors {sync.errors}
            </Badge>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
