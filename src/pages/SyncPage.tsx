import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
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
  type SyncPeer,
  type SyncPurgeResponse,
  type SyncSettingsResponse,
  type SyncSettingsUpdate,
  type SyncStatusResponse,
} from "./sync/syncApi";

const STATUS_POLL_MS = 5000;

type SyncConflictIgnoreFolderResponse = {
  ignore_pattern: string;
  added: boolean;
  resolved_count: number;
  apply_warning?: string;
};

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
  const [ignoring, setIgnoring] = useState<string | null>(null);
  const [removingPeer, setRemovingPeer] = useState<string | null>(null);

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

  const setFolderIgnores = useCallback(
    async (relpath: string, nextIgnores: string[]): Promise<boolean> => {
      const current = settings?.folders ?? [];
      return updateSettings({
        folders: current.map((entry) => ({
          relpath: entry.relpath,
          extra_ignores:
            entry.relpath === relpath ? nextIgnores : entry.extra_ignores,
        })),
      });
    },
    [settings, updateSettings],
  );

  const addIgnoreRule = useCallback(
    async (folder: SyncFolderSettings, pattern: string): Promise<boolean> => {
      const rule = pattern.trim();
      if (!rule) return false;
      if (folder.extra_ignores.includes(rule)) {
        toast.error("That ignore rule is already set for this folder.");
        return false;
      }
      const ok = await setFolderIgnores(folder.relpath, [
        ...folder.extra_ignores,
        rule,
      ]);
      if (ok) toast.success(`Ignoring "${rule}" in ~/${folder.relpath}`);
      return ok;
    },
    [setFolderIgnores],
  );

  const removeIgnoreRule = useCallback(
    async (folder: SyncFolderSettings, pattern: string) => {
      const ok = await setFolderIgnores(
        folder.relpath,
        folder.extra_ignores.filter((rule) => rule !== pattern),
      );
      if (ok) toast.success(`Removed "${pattern}" from ~/${folder.relpath}`);
    },
    [setFolderIgnores],
  );

  const removePeer = useCallback(async (peer: SyncPeer) => {
    setRemovingPeer(peer.device_id);
    try {
      const res = await apiFetch("/api/sync/peers/remove/", {
        method: "POST",
        body: JSON.stringify({ device_id: peer.device_id }),
      });
      if (!res.ok) {
        throw new Error(
          await extractErrorMessage(res, "Unable to remove sync peer."),
        );
      }
      setSettings((await res.json()) as SyncSettingsResponse);
      toast.success(`Removed ${peer.name} from sync`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Unable to remove sync peer.",
      );
    }
    setRemovingPeer(null);
  }, []);

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
          action === "keep_local"
            ? "Kept local version"
            : "Used remote version",
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

  const ignoreContainingFolder = useCallback(
    async (id: string) => {
      setIgnoring(id);
      try {
        const res = await apiFetch(
          "/api/sync/conflicts/ignore-containing-folder/",
          {
            method: "POST",
            body: JSON.stringify({ id }),
          },
        );
        if (!res.ok) {
          throw new Error(
            await extractErrorMessage(res, "Unable to ignore conflict folder."),
          );
        }
        const data = (await res.json()) as SyncConflictIgnoreFolderResponse;
        toast.success(
          `Ignoring ${data.ignore_pattern}; cleared ${data.resolved_count} conflict${
            data.resolved_count === 1 ? "" : "s"
          }`,
        );
        if (data.apply_warning) toast.warning(data.apply_warning);
        await fetchSettings();
        await fetchStatus();
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : "Unable to ignore conflict folder.",
        );
      }
      setIgnoring(null);
    },
    [fetchSettings, fetchStatus],
  );

  const refresh = useCallback(() => {
    void fetchSettings();
    if (enabled) void fetchStatus();
  }, [enabled, fetchSettings, fetchStatus]);

  const lastReconcile = formatReconcileTime(status?.last_reconcile_at ?? null);
  const reconcileSummary = status?.last_reconcile;
  const reconcileCounts =
    reconcileSummary && "at" in reconcileSummary
      ? ` (repos ${reconcileSummary.repo_count ?? 0}, ff ${
          reconcileSummary.fast_forwarded ?? 0
        }, errors ${reconcileSummary.errors ?? 0})`
      : "";
  const stalledFolders = (status?.folders ?? []).filter(
    (folder) => folder.error,
  );
  const engineErrors = status?.syncthing_errors ?? [];

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-semibold tracking-tight text-foreground">
              Sync
            </h1>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              Keep selected directories from your filesystem in sync across your
              computers.
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
            <Panel>
              <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-[12.5px] font-medium text-foreground">
                    Sync is on
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Files sync between your devices over your tailnet only.
                    {lastReconcile
                      ? ` Last reconcile ${lastReconcile}${reconcileCounts}.`
                      : ""}
                  </p>
                  {stalledFolders.length > 0 || engineErrors.length > 0 ? (
                    <p className="mt-1 text-[11px] text-destructive">
                      File sync is stalled:{" "}
                      {stalledFolders[0]?.error ??
                        engineErrors[engineErrors.length - 1]?.message}
                    </p>
                  ) : null}
                </div>
                <Switch
                  checked
                  disabled={saving}
                  onCheckedChange={(checked) => void setEnabled(checked)}
                  aria-label="Sync enabled"
                />
              </div>
            </Panel>

            <SyncFoldersCard
              folders={settings.folders}
              statusFolders={status?.folders ?? []}
              peers={settings.peers}
              busy={saving}
              onAddFolder={addFolder}
              onRemoveFolder={(folder) => void removeFolder(folder)}
              onAddIgnore={addIgnoreRule}
              onRemoveIgnore={(folder, pattern) =>
                void removeIgnoreRule(folder, pattern)
              }
            />

            <SyncPeersCard
              peers={settings.peers}
              statusFolders={status?.folders ?? []}
              removingDeviceId={removingPeer}
              onRemovePeer={(peer) => void removePeer(peer)}
            />

            <SyncHistoryCard
              usageBytes={settings.versions_usage_bytes}
              purging={purging}
              onPurge={() => void purgeHistory()}
            />

            {conflicts.length > 0 ? (
              <SyncConflictsCard
                conflicts={conflicts}
                resolving={resolving}
                ignoring={ignoring}
                onResolve={(id, action) => void resolveConflict(id, action)}
                onIgnoreContainingFolder={(id) =>
                  void ignoreContainingFolder(id)
                }
              />
            ) : null}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SyncPage;
