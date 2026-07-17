import { apiFetch } from "@/lib/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { KeyRound, PlugZap, RefreshCw, Save, TriangleAlert } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  extractErrorMessage,
  type CodingBackendSettingsResponse,
  type CodexPluginSettingsResponse,
  type OpenbaseServicesResponse,
} from "./settingsApi";
import { CodingBackendChangeDialog } from "./CodingBackendChangeDialog";

type Props = {
  onRestartScheduled: (data: OpenbaseServicesResponse, delayMs: number) => void;
};

export const CodingBackendSettings: React.FC<Props> = ({
  onRestartScheduled,
}) => {
  const [settings, setSettings] = useState<CodingBackendSettingsResponse | null>(
    null,
  );
  const [selectedBackend, setSelectedBackend] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncingClaudeAuth, setSyncingClaudeAuth] = useState(false);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [codexPlugins, setCodexPlugins] =
    useState<CodexPluginSettingsResponse | null>(null);
  const [loadingCodexPlugins, setLoadingCodexPlugins] = useState(false);
  const [togglingCodexPlugin, setTogglingCodexPlugin] = useState<string | null>(
    null,
  );
  const [codexPluginRestartOpen, setCodexPluginRestartOpen] = useState(false);
  const [schedulingPluginRestart, setSchedulingPluginRestart] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/settings/coding-backend/");
      if (!res.ok) {
        setError(
          await extractErrorMessage(
            res,
            `Unable to load coding backend: ${res.status}`,
          ),
        );
        setLoading(false);
        return;
      }
      const data = (await res.json()) as CodingBackendSettingsResponse;
      const supportedIds = new Set(data.supported_backends.map((option) => option.id));
      setSettings(data);
      setSelectedBackend(supportedIds.has(data.backend) ? data.backend : "");
      setMessage(null);
      setError(
        supportedIds.has(data.backend)
          ? null
          : `Unsupported current backend: ${data.backend}`,
      );
    } catch {
      setError("Unable to reach the local API.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  const fetchCodexPlugins = useCallback(async () => {
    setLoadingCodexPlugins(true);
    try {
      const res = await apiFetch("/api/settings/coding-backend/codex-plugins/");
      if (!res.ok) {
        setError(
          await extractErrorMessage(
            res,
            `Unable to load Codex plugins: ${res.status}`,
          ),
        );
        setLoadingCodexPlugins(false);
        return;
      }
      setCodexPlugins((await res.json()) as CodexPluginSettingsResponse);
    } catch {
      setError("Unable to reach the local API.");
    }
    setLoadingCodexPlugins(false);
  }, []);

  const selectedOption = useMemo(
    () =>
      settings?.supported_backends.find(
        (option) => option.id === selectedBackend,
      ) ?? null,
    [selectedBackend, settings],
  );

  const saveBackend = useCallback(async () => {
    if (!selectedBackend) {
      return;
    }
    setSaving(true);
    setMessage(null);
    setError(null);
    let backendSaved = false;
    try {
      const res = await apiFetch("/api/settings/coding-backend/", {
        method: "PUT",
        body: JSON.stringify({ backend: selectedBackend }),
      });
      if (!res.ok) {
        setError(
          await extractErrorMessage(
            res,
            `Unable to save coding backend: ${res.status}`,
          ),
        );
        setSaving(false);
        return;
      }
      const data = (await res.json()) as CodingBackendSettingsResponse;
      setSettings(data);
      setSelectedBackend(data.backend);
      backendSaved = true;

      if (data.restart_required) {
        const restartRes = await apiFetch("/api/settings/restart/", {
          method: "POST",
          body: JSON.stringify({ recreate_dispatcher: true }),
        });
        if (!restartRes.ok) {
          setError(
            `Backend saved, but the automatic restart failed: ${await extractErrorMessage(
              restartRes,
              `restart request returned ${restartRes.status}`,
            )}. Restart Openbase services and recreate the dispatcher before starting new work.`,
          );
          setSaving(false);
          return;
        }
        const restartData =
          (await restartRes.json()) as OpenbaseServicesResponse;
        onRestartScheduled(restartData, 4000);
        setMessage(
          "Backend saved. Restarting Openbase services and recreating the dispatcher.",
        );
      }
    } catch {
      setError(
        backendSaved
          ? "Backend saved, but the automatic restart could not be scheduled. Restart Openbase services and recreate the dispatcher before starting new work."
          : "Unable to reach the local API.",
      );
    }
    setSaving(false);
  }, [onRestartScheduled, selectedBackend]);

  const syncClaudeAuth = useCallback(async () => {
    setSyncingClaudeAuth(true);
    setMessage(null);
    setError(null);
    try {
      const res = await apiFetch("/api/settings/coding-backend/claude-auth/", {
        method: "POST",
      });
      if (!res.ok) {
        setError(
          await extractErrorMessage(
            res,
            `Unable to sync Claude auth: ${res.status}`,
          ),
        );
        setSyncingClaudeAuth(false);
        return;
      }
      const claudeAuth = await res.json();
      setSettings((current) =>
        current ? { ...current, claude_auth: claudeAuth } : current,
      );
      setMessage(
        claudeAuth.logged_in
          ? "Claude auth synced. Openbase Claude Code auth is ready."
          : "Claude auth synced, but Openbase Claude Code is still not logged in.",
      );
    } catch {
      setError("Unable to reach the local API.");
    }
    setSyncingClaudeAuth(false);
  }, []);

  const toggleCodexPlugin = useCallback(
    async (plugin: string, enabled: boolean) => {
      setTogglingCodexPlugin(plugin);
      setMessage(null);
      setError(null);
      try {
        const res = await apiFetch("/api/settings/coding-backend/codex-plugins/", {
          method: "PUT",
          body: JSON.stringify({ plugin, enabled }),
        });
        if (!res.ok) {
          setError(
            await extractErrorMessage(
              res,
              `Unable to update Codex plugin: ${res.status}`,
            ),
          );
          setTogglingCodexPlugin(null);
          return;
        }
        const data = (await res.json()) as CodexPluginSettingsResponse;
        setCodexPlugins(data);
        if (data.restart_required) {
          setCodexPluginRestartOpen(true);
        }
        const changed = data.plugins.find((item) => item.id === plugin);
        setMessage(
          changed
            ? `${changed.label} plugin ${enabled ? "enabled" : "removed"}.`
            : "Codex plugin setting updated.",
        );
      } catch {
        setError("Unable to reach the local API.");
      }
      setTogglingCodexPlugin(null);
    },
    [],
  );

  const recreateDispatcherForPlugins = useCallback(async () => {
    setSchedulingPluginRestart(true);
    setError(null);
    try {
      const restartRes = await apiFetch("/api/settings/restart/", {
        method: "POST",
        body: JSON.stringify({ recreate_dispatcher: true }),
      });
      if (!restartRes.ok) {
        setError(
          `Plugin setting changed, but the automatic restart failed: ${await extractErrorMessage(
            restartRes,
            `restart request returned ${restartRes.status}`,
          )}. Recreate the dispatcher before starting new work.`,
        );
        setSchedulingPluginRestart(false);
        return;
      }
      const restartData = (await restartRes.json()) as OpenbaseServicesResponse;
      onRestartScheduled(restartData, 4000);
      setCodexPluginRestartOpen(false);
      setMessage(
        "Recreating the dispatcher so Codex can reload plugin skills and tools.",
      );
    } catch {
      setError(
        "Plugin setting changed, but the automatic restart could not be scheduled. Recreate the dispatcher before starting new work.",
      );
    }
    setSchedulingPluginRestart(false);
  }, [onRestartScheduled]);

  const currentOption = settings?.supported_backends.find(
    (option) => option.id === settings.backend,
  );
  const configuredBackend =
    settings?.configured_backend ?? settings?.backend ?? "";
  const showClaudeAuth = configuredBackend === "claude_code";
  const showCodexPlugins = selectedBackend === "codex";
  const canSave =
    Boolean(selectedBackend) &&
    Boolean(settings) &&
    selectedBackend !== configuredBackend &&
    !loading &&
    !saving;

  useEffect(() => {
    if (showCodexPlugins) {
      void fetchCodexPlugins();
    }
  }, [fetchCodexPlugins, showCodexPlugins]);

  return (
    <div className="overflow-hidden rounded border border-border bg-surface">
      <div className="flex flex-col gap-3 border-b border-border px-3 py-2.5 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-medium text-foreground">
            Coding backend
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Select the backend used for Super Agents coding sessions.
          </p>
          {settings ? (
            <p className="mt-1 truncate text-[11px] text-muted-foreground">
              Current: {currentOption?.label ?? settings.backend}
            </p>
          ) : null}
          {settings?.backend_note ? (
            <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
              {settings.backend_note}
            </p>
          ) : null}
          {selectedOption ? (
            <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
              {selectedOption.summary} {selectedOption.description}
            </p>
          ) : null}
          {showClaudeAuth ? (
            <div className="mt-1 space-y-0.5 font-mono text-[11px] text-muted-foreground">
              <p>
                Claude auth loggedIn:{" "}
                {settings?.claude_auth?.logged_in ? "true" : "false"}
              </p>
              <p>
                {settings?.claude_auth?.command ??
                  "openbase-coder claude sync-state"}
              </p>
            </div>
          ) : null}
          {showCodexPlugins ? (
            <div className="mt-2 grid gap-1.5 sm:max-w-xl sm:grid-cols-2">
              {(codexPlugins?.plugins ?? []).map((plugin) => (
                <div
                  key={plugin.id}
                  className="flex min-h-14 items-center justify-between gap-3 rounded border border-border bg-background px-2.5 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-medium text-foreground">
                      {plugin.label}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[10.5px] leading-3.5 text-muted-foreground">
                      {plugin.plugin_id}
                      {plugin.version ? ` · ${plugin.version}` : ""}
                    </p>
                  </div>
                  <Switch
                    checked={plugin.enabled}
                    onCheckedChange={(checked) => {
                      void toggleCodexPlugin(plugin.id, checked);
                    }}
                    disabled={
                      loading ||
                      saving ||
                      loadingCodexPlugins ||
                      togglingCodexPlugin !== null
                    }
                    aria-label={`${plugin.label} plugin`}
                  />
                </div>
              ))}
              {loadingCodexPlugins && !codexPlugins ? (
                <div className="flex min-h-14 items-center gap-2 rounded border border-border bg-background px-2.5 py-2 text-[11px] text-muted-foreground">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Loading Codex plugins…
                </div>
              ) : null}
              {!loadingCodexPlugins && codexPlugins?.plugins.length === 0 ? (
                <div className="rounded border border-border bg-background px-2.5 py-2 text-[11px] text-muted-foreground">
                  No Codex plugin toggles available.
                </div>
              ) : null}
            </div>
          ) : null}
          {message ? (
            <p className="mt-1 text-[12px] text-success">{message}</p>
          ) : null}
          {error ? (
            <p className="mt-1 text-[12px] text-destructive">{error}</p>
          ) : null}
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
          <Select
            value={selectedBackend}
            onValueChange={(value) => {
              setSelectedBackend(value);
              setMessage(null);
              setError(null);
            }}
            disabled={loading || saving}
          >
            <SelectTrigger className="h-8 min-w-0 text-[12px] sm:w-56">
              <SelectValue
                placeholder={loading ? "Loading…" : "Select backend"}
              />
            </SelectTrigger>
            <SelectContent>
              {settings?.supported_backends.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-[12px]"
            onClick={() => {
              void fetchSettings();
              if (showCodexPlugins) {
                void fetchCodexPlugins();
              }
            }}
            disabled={loading || saving}
            title="Refresh coding backend"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-[12px]"
            onClick={() => {
              setConfirmationOpen(true);
            }}
            disabled={!canSave}
          >
            <Save className="h-3 w-3" />
            {saving ? "Changing…" : "Save backend"}
          </Button>
          {showClaudeAuth ? (
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 text-[12px]"
              onClick={() => {
                void syncClaudeAuth();
              }}
              disabled={loading || saving || syncingClaudeAuth}
              title={
                settings?.claude_auth?.command ?? "openbase-coder claude sync-state"
              }
            >
              <KeyRound
                className={`h-3 w-3 ${syncingClaudeAuth ? "animate-pulse" : ""}`}
              />
              {syncingClaudeAuth ? "Syncing…" : "Sync Claude auth"}
            </Button>
          ) : null}
        </div>
      </div>

      <CodingBackendChangeDialog
        open={confirmationOpen}
        currentLabel={currentOption?.label ?? configuredBackend}
        selectedLabel={selectedOption?.label ?? selectedBackend}
        saving={saving}
        canConfirm={canSave}
        onOpenChange={setConfirmationOpen}
        onConfirm={() => {
          void saveBackend();
        }}
      />
      <AlertDialog
        open={codexPluginRestartOpen}
        onOpenChange={setCodexPluginRestartOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-base">
              <TriangleAlert className="h-4 w-4 text-warning" />
              Recreate dispatcher?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm leading-5">
                <p>
                  The Codex plugin setting changed. Recreate the dispatcher
                  thread so the next voice session loads the updated plugin
                  skills and tools.
                </p>
                <p>
                  This may interrupt an active voice call. Existing Super Agent
                  threads and project files are not deleted.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={schedulingPluginRestart}>
              Later
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={schedulingPluginRestart}
              onClick={() => {
                void recreateDispatcherForPlugins();
              }}
            >
              <PlugZap className="h-3 w-3" />
              Recreate dispatcher
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
