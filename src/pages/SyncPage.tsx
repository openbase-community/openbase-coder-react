import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { apiFetch } from "@/lib/api";
import { extractErrorMessage } from "@/lib/api-errors";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { SyncConflictsCard } from "./sync/SyncConflictsCard";
import { SyncExplainerCard } from "./sync/SyncExplainerCard";
import { SyncFoldersCard } from "./sync/SyncFoldersCard";
import { SyncHistoryCard } from "./sync/SyncHistoryCard";
import { SyncPeersCard } from "./sync/SyncPeersCard";
import {
  formatBytes,
  type SyncConflict,
  type SyncConflictsResponse,
  type SyncFolderSettings,
  type SyncPurgeResponse,
  type SyncSettingsResponse,
  type SyncSettingsUpdate,
  type SyncStatusResponse,
} from "./sync/syncApi";

const STATUS_POLL_MS = 5000;

const formatReconcileTime = (value: string | null) => {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? value : new Date(parsed).toLocaleTimeString();
};

const SyncPage = () => {
  const [settings, setSettings] = useState<SyncSettingsResponse | null>(null);
  const [status, setStatus] = useState<SyncStatusResponse | null>(null);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [purging, setPurging] = useState(false);
  const [resolving, setResolving] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await apiFetch("/api/sync/settings/");
      if (!res.ok) {
        throw new Error(
          await extractErrorMessage(res, "Unable to load sync settings."),
        );
      }
      setSettings((await res.json()) as SyncSettingsResponse);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to reach the local API.",
      );
    }
    setLoading(false);
  }, []);

  const fetchConflicts = useCallback(async () => {
    try {
      const res = await apiFetch("/api/sync/conflicts/");
      if (!res.ok) return;
      const data = (await res.json()) as SyncConflictsResponse;
      setConflicts(data.conflicts);
    } catch {
      // Status polling will retry shortly; keep the last known conflicts.
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await apiFetch("/api/sync/status/");
      if (!res.ok) return;
      const data = (await res.json()) as SyncStatusResponse;
      setStatus(data);
      if (data.conflicts_count > 0) {
        void fetchConflicts();
      } else {
        setConflicts([]);
      }
    } catch {
      // Transient network failure; the poll interval will retry.
    }
  }, [fetchConflicts]);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  const enabled = Boolean(settings?.eligible && settings.enabled);

  useEffect(() => {
    if (!enabled) {
      setStatus(null);
      setConflicts([]);
      return;
    }
    void fetchStatus();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void fetchStatus();
    }, STATUS_POLL_MS);
    const handleFocus = () => void fetchStatus();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void fetchStatus();
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, fetchStatus]);

  const updateSettings = useCallback(
    async (update: SyncSettingsUpdate): Promise<boolean> => {
      setSaving(true);
      try {
        const res = await apiFetch("/api/sync/settings/", {
          method: "PUT",
          body: JSON.stringify(update),
        });
        if (!res.ok) {
          throw new Error(
            await extractErrorMessage(res, "Unable to update sync settings."),
          );
        }
        setSettings((await res.json()) as SyncSettingsResponse);
        setSaving(false);
        return true;
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : "Unable to update sync settings.",
        );
        setSaving(false);
        return false;
      }
    },
    [],
  );

  const setEnabled = useCallback(
    async (value: boolean) => {
      const ok = await updateSettings({ enabled: value });
      if (ok) toast.success(value ? "Sync enabled" : "Sync disabled");
    },
    [updateSettings],
  );

  const addFolder = useCallback(
    async (relpath: string): Promise<boolean> => {
      const current = settings?.folders ?? [];
      const ok = await updateSettings({
        folders: [
          ...current.map((folder) => ({
            relpath: folder.relpath,
            extra_ignores: folder.extra_ignores,
          })),
          { relpath },
        ],
      });
      if (ok) toast.success(`Now syncing ~/${relpath}`);
      return ok;
    },
    [settings, updateSettings],
  );

  const removeFolder = useCallback(
    async (folder: SyncFolderSettings) => {
      const current = settings?.folders ?? [];
      const ok = await updateSettings({
        folders: current
          .filter((entry) => entry.relpath !== folder.relpath)
          .map((entry) => ({
            relpath: entry.relpath,
            extra_ignores: entry.extra_ignores,
          })),
      });
      if (ok) toast.success(`Stopped syncing ~/${folder.relpath}`);
    },
    [settings, updateSettings],
  );

  const purgeHistory = useCallback(async () => {
    setPurging(true);
    try {
      const res = await apiFetch("/api/sync/versions/purge/", {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error(
          await extractErrorMessage(res, "Unable to purge sync history."),
        );
      }
      const data = (await res.json()) as SyncPurgeResponse;
      toast.success(`Purged history, freed ${formatBytes(data.freed_bytes)}`);
      await fetchSettings();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Unable to purge sync history.",
      );
    }
    setPurging(false);
  }, [fetchSettings]);

  const resolveConflict = useCallback(
    async (id: string, action: "keep_local" | "use_remote") => {
      setResolving(`${id}:${action}`);
      try {
        const res = await apiFetch("/api/sync/conflicts/resolve/", {
          method: "POST",
          body: JSON.stringify({ id, action }),
        });
        if (!res.ok) {
          throw new Error(
            await extractErrorMessage(res, "Unable to resolve conflict."),
          );
        }
        toast.success(
          action === "keep_local" ? "Kept local version" : "Used remote version",
        );
        await fetchStatus();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Unable to resolve conflict.",
        );
      }
      setResolving(null);
    },
    [fetchStatus],
  );

  const refresh = useCallback(() => {
    void fetchSettings();
    if (enabled) void fetchStatus();
  }, [enabled, fetchSettings, fetchStatus]);

  const lastReconcile = formatReconcileTime(status?.last_reconcile_at ?? null);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-semibold tracking-tight text-foreground">
              Sync
            </h1>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              Keep your code identical across your computers.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2.5 text-[12px]"
            disabled={loading}
            onClick={refresh}
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="text-[12px] text-muted-foreground">Loading…</div>
        ) : !settings ? (
          <div className="rounded border border-border bg-surface px-3 py-2.5">
            <p className="text-[12px] text-destructive">
              {error ?? "Unable to load sync settings."}
            </p>
          </div>
        ) : !settings.eligible ? (
          <SyncExplainerCard
            eligible={false}
            eligibleReason={settings.eligible_reason}
          />
        ) : !settings.enabled ? (
          <SyncExplainerCard
            eligible
            eligibleReason={settings.eligible_reason}
            enabling={saving}
            onEnable={() => void setEnabled(true)}
          />
        ) : (
          <>
            <div className="overflow-hidden rounded border border-border bg-surface">
              <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-[12.5px] font-medium text-foreground">
                    Sync is on
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Files sync between your devices over your tailnet only.
                    {lastReconcile ? ` Last reconcile ${lastReconcile}.` : ""}
                  </p>
                </div>
                <Switch
                  checked
                  disabled={saving}
                  onCheckedChange={(checked) => void setEnabled(checked)}
                  aria-label="Sync enabled"
                />
              </div>
            </div>

            {conflicts.length > 0 ? (
              <SyncConflictsCard
                conflicts={conflicts}
                resolving={resolving}
                onResolve={(id, action) => void resolveConflict(id, action)}
              />
            ) : null}

            <SyncFoldersCard
              folders={settings.folders}
              statusFolders={status?.folders ?? []}
              peers={settings.peers}
              busy={saving}
              onAddFolder={addFolder}
              onRemoveFolder={(folder) => void removeFolder(folder)}
            />

            <SyncPeersCard
              peers={settings.peers}
              statusFolders={status?.folders ?? []}
            />

            <SyncHistoryCard
              usageBytes={settings.versions_usage_bytes}
              purging={purging}
              onPurge={() => void purgeHistory()}
            />
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SyncPage;
