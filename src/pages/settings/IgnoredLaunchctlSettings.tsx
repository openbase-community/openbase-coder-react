import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { Eye, RefreshCw } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import {
  extractErrorMessage,
  type IgnoredLaunchctlLabelsResponse,
} from "./settingsApi";

export const IgnoredLaunchctlSettings: React.FC = () => {
  const [ignoredLabels, setIgnoredLabels] = useState<string[]>([]);
  const [loadingIgnoredLabels, setLoadingIgnoredLabels] = useState(true);
  const [ignoredLabelsError, setIgnoredLabelsError] = useState<string | null>(null);
  const [updatingLabel, setUpdatingLabel] = useState<string | null>(null);

  const fetchIgnoredLabels = useCallback(async () => {
    setLoadingIgnoredLabels(true);
    try {
      const res = await apiFetch("/api/settings/launchctl-ignored/");
      if (!res.ok) {
        setIgnoredLabelsError(
          await extractErrorMessage(
            res,
            `Unable to load ignored LaunchAgents: ${res.status}`,
          ),
        );
        setLoadingIgnoredLabels(false);
        return;
      }
      const data = (await res.json()) as IgnoredLaunchctlLabelsResponse;
      setIgnoredLabels(data.ignored_labels);
      setIgnoredLabelsError(null);
    } catch {
      setIgnoredLabelsError("Unable to reach the local API.");
    }
    setLoadingIgnoredLabels(false);
  }, []);

  useEffect(() => {
    void fetchIgnoredLabels();
  }, [fetchIgnoredLabels]);

  const handleUnignore = useCallback(
    async (label: string) => {
      setUpdatingLabel(label);
      try {
        const nextIgnoredLabels = ignoredLabels.filter((item) => item !== label);
        const res = await apiFetch("/api/settings/launchctl-ignored/", {
          method: "PATCH",
          body: JSON.stringify({ ignored_labels: nextIgnoredLabels }),
        });
        if (!res.ok) {
          setIgnoredLabelsError(
            await extractErrorMessage(
              res,
              `Unable to un-ignore LaunchAgent: ${res.status}`,
            ),
          );
          setUpdatingLabel(null);
          return;
        }
        const data = (await res.json()) as IgnoredLaunchctlLabelsResponse;
        setIgnoredLabels(data.ignored_labels);
        setIgnoredLabelsError(null);
      } catch {
        setIgnoredLabelsError("Unable to reach the local API.");
      }
      setUpdatingLabel(null);
    },
    [ignoredLabels],
  );

  return (
    <div className="overflow-hidden rounded border border-border bg-surface">
      <div className="flex items-center gap-3 border-b border-border px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-medium text-foreground">
            Ignored Launch Control items
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Items hidden from the normal Launch Control list.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2.5 text-[12px]"
          onClick={fetchIgnoredLabels}
          disabled={loadingIgnoredLabels || updatingLabel !== null}
        >
          <RefreshCw className={`h-3 w-3 ${loadingIgnoredLabels ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>
      {ignoredLabelsError ? (
        <div className="border-b border-border px-3 py-2 text-[12px] text-destructive">
          {ignoredLabelsError}
        </div>
      ) : null}
      {loadingIgnoredLabels && ignoredLabels.length === 0 ? (
        <div className="px-3 py-3 text-[12px] text-muted-foreground">
          Loading…
        </div>
      ) : ignoredLabels.length === 0 ? (
        <div className="px-3 py-3 text-[12px] text-muted-foreground">
          No ignored Launch Control items.
        </div>
      ) : (
        <div className="divide-y divide-border">
          {ignoredLabels.map((label) => (
            <div
              key={label}
              className="flex min-w-0 items-center gap-3 px-3 py-2.5"
            >
              <p className="min-w-0 flex-1 truncate font-mono text-[12px] text-foreground">
                {label}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-[12px]"
                onClick={() => {
                  void handleUnignore(label);
                }}
                disabled={updatingLabel !== null}
              >
                <Eye className="h-3 w-3" />
                {updatingLabel === label ? "…" : "Un-ignore"}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
