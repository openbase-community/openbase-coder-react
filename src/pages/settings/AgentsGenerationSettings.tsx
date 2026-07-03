import { Switch } from "@/components/ui/switch";
import { apiFetch } from "@/lib/api";
import React, { useCallback, useEffect, useState } from "react";
import {
  extractErrorMessage,
  type AgentsGenerationSettingsResponse,
} from "./settingsApi";

export const AgentsGenerationSettings: React.FC = () => {
  const [settings, setSettings] =
    useState<AgentsGenerationSettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/settings/agents-generation/");
      if (!res.ok) {
        setError(
          await extractErrorMessage(
            res,
            `Unable to load instruction settings: ${res.status}`,
          ),
        );
        setLoading(false);
        return;
      }
      setSettings((await res.json()) as AgentsGenerationSettingsResponse);
      setError(null);
    } catch {
      setError("Unable to reach the local API.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  const saveSettings = useCallback(async (checked: boolean) => {
    setSaving(true);
    try {
      const res = await apiFetch("/api/settings/agents-generation/", {
        method: "PATCH",
        body: JSON.stringify({
          include_normal_codex_agents_in_openbase_agents: checked,
        }),
      });
      if (!res.ok) {
        setError(
          await extractErrorMessage(
            res,
            `Unable to save instruction settings: ${res.status}`,
          ),
        );
        setSaving(false);
        return;
      }
      setSettings((await res.json()) as AgentsGenerationSettingsResponse);
      setError(null);
    } catch {
      setError("Unable to reach the local API.");
    }
    setSaving(false);
  }, []);

  const checked =
    settings?.include_normal_codex_agents_in_openbase_agents ?? false;

  return (
    <div className="overflow-hidden rounded border border-border bg-surface">
      <div className="flex items-center gap-3 px-3 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-medium text-foreground">
            Include normal Codex instructions
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Merge the regular Codex AGENTS.md into generated Openbase instructions.
          </p>
        </div>
        <Switch
          checked={checked}
          disabled={loading || saving || !settings}
          onCheckedChange={(value) => {
            void saveSettings(value);
          }}
          aria-label="Include normal Codex instructions in Openbase generated instructions"
        />
      </div>
      {error ? (
        <p className="border-t border-border px-3 py-2 text-[12px] text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
};
