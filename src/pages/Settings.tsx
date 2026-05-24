import DashboardLayout from "@/components/layouts/ExampleLayout";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/auth";
import { apiFetch } from "@/lib/api";
import { getRuntimeShell } from "@/lib/runtime-config";
import {
  BUILT_IN_SIDEBAR_ITEMS,
  readHiddenSidebarItems,
  sidebarItemVisible,
  SIDEBAR_PREFERENCES_EVENT,
  writeHiddenSidebarItems,
  type SidebarItem,
} from "@/lib/sidebar-preferences";
import { usePluginRegistry } from "@/plugin-registry";
import { Eye, LogOut, Play, RefreshCw, Square } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

type IgnoredLaunchctlLabelsResponse = {
  ignored_labels: string[];
};

type OpenbaseService = {
  name: string;
  label: string;
  description: string;
  port: number | null;
  installed: boolean;
  running: boolean;
  pid: string | null;
  last_exit_code: string | null;
};

type OpenbaseServicesResponse = {
  services: OpenbaseService[];
  scheduled?: boolean;
  include_mcp?: boolean;
};

type LiveKitThreadRecreateResponse = {
  previous_dispatcher_thread_id: string | null;
  previous_active_target_thread_id: string | null;
  removed_paths: string[];
  livekit_agent: {
    name: string;
    description: string;
    installed: boolean;
    running: boolean;
    pid: string | null;
    last_exit_code: string | null;
  };
};

type CartesiaVoice = {
  id: string;
  name: string;
  language: string;
  country: string | null;
  gender: string | null;
};

type DispatcherVoice = {
  id: string;
  name: string;
};

type CartesiaVoiceSettingsResponse = {
  voices: CartesiaVoice[];
  dispatcher_voice: DispatcherVoice;
};

type DispatcherVoiceUpdateResponse = {
  dispatcher_voice: DispatcherVoice;
};

type LiveKitCompanionSession = {
  roomUrl: string;
  companionToken: string;
  companionTokenExpiresAt?: string;
};

type LiveKitCompanionState = "off" | "starting" | "sharing" | "stopping" | "error";

type LiveKitCompanionResponse = {
  ok?: boolean;
  state?: LiveKitCompanionState;
  error?: string;
};

type LiveKitCompanionSessionPayload = LiveKitCompanionSession & {
  detail?: string;
  roomName?: string;
};

declare global {
  interface Window {
    __OPENBASE_LIVEKIT_COMPANION__?: {
      startScreenShare: (session: LiveKitCompanionSession) => Promise<LiveKitCompanionResponse>;
      stopScreenShare: () => Promise<LiveKitCompanionResponse>;
      status: () => Promise<LiveKitCompanionResponse>;
    };
    __OPENBASE_LIVEKIT_COMPANION_SESSION__?: {
      setSession: (session: LiveKitCompanionSession | null) => void;
      getSession: () => LiveKitCompanionSession | null;
      clearSession: () => void;
    };
  }
}

const extractErrorMessage = async (
  res: Response,
  fallback: string,
): Promise<string> => {
  try {
    const data = (await res.json()) as { error?: string; detail?: string };
    return data.error ?? data.detail ?? fallback;
  } catch {
    return fallback;
  }
};

const LiveKitCompanionSettings: React.FC = () => {
  const [session, setSession] = useState<LiveKitCompanionSession | null>(null);
  const sessionRef = useRef<LiveKitCompanionSession | null>(null);
  const [state, setState] = useState<LiveKitCompanionState>("off");
  const [error, setError] = useState<string | null>(null);
  const companion =
    typeof window === "undefined"
      ? undefined
      : window.__OPENBASE_LIVEKIT_COMPANION__;

  const updateSession = useCallback((nextSession: LiveKitCompanionSession | null) => {
    sessionRef.current = nextSession;
    setSession(nextSession);
    setError(null);
  }, []);

  const loadCompanionSession = useCallback(
    async ({ showErrors = false }: { showErrors?: boolean } = {}) => {
      try {
        const response = await apiFetch("/api/livekit-companion-session/");
        const payload = (await response
          .json()
          .catch(() => ({}))) as Partial<LiveKitCompanionSessionPayload>;

        if (!response.ok) {
          updateSession(null);
          if (showErrors) {
            setError(payload.detail ?? "No active LiveKit voice room was found.");
          }
          return null;
        }

        if (!payload.roomUrl || !payload.companionToken) {
          throw new Error("LiveKit companion session response is missing required fields.");
        }

        const nextSession: LiveKitCompanionSession = {
          roomUrl: payload.roomUrl,
          companionToken: payload.companionToken,
          companionTokenExpiresAt: payload.companionTokenExpiresAt,
        };
        updateSession(nextSession);
        return nextSession;
      } catch (caughtError) {
        updateSession(null);
        if (showErrors) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to prepare LiveKit screen sharing.",
          );
        }
        return null;
      }
    },
    [updateSession],
  );

  useEffect(() => {
    window.__OPENBASE_LIVEKIT_COMPANION_SESSION__ = {
      setSession: updateSession,
      getSession: () => sessionRef.current,
      clearSession: () => updateSession(null),
    };

    function handleSessionEvent(event: Event) {
      const customEvent = event as CustomEvent<LiveKitCompanionSession | null>;
      updateSession(customEvent.detail ?? null);
    }

    window.addEventListener("openbase:livekit-companion-session", handleSessionEvent);
    return () => {
      window.removeEventListener("openbase:livekit-companion-session", handleSessionEvent);
      if (window.__OPENBASE_LIVEKIT_COMPANION_SESSION__?.getSession() === sessionRef.current) {
        delete window.__OPENBASE_LIVEKIT_COMPANION_SESSION__;
      }
    };
  }, [updateSession]);

  useEffect(() => {
    if (!companion) {
      return;
    }

    void loadCompanionSession();

    function refreshSessionWhenVisible() {
      if (document.visibilityState === "visible") {
        void loadCompanionSession();
      }
    }

    window.addEventListener("focus", refreshSessionWhenVisible);
    document.addEventListener("visibilitychange", refreshSessionWhenVisible);
    return () => {
      window.removeEventListener("focus", refreshSessionWhenVisible);
      document.removeEventListener("visibilitychange", refreshSessionWhenVisible);
    };
  }, [companion, loadCompanionSession]);

  async function handleToggle() {
    console.info("[livekit-companion-ui] settings test toggle click", {
      state,
      hasSession: Boolean(session),
      hasCompanionBridge: Boolean(companion),
    });

    if (!companion) {
      setState("error");
      setError("Electron companion bridge is unavailable.");
      return;
    }

    try {
      if (state === "sharing") {
        setState("stopping");
        const response = await companion.stopScreenShare();
        setState(response.state ?? "off");
        setError(response.ok === false ? response.error ?? "Unable to stop screen share." : null);
        return;
      }

      setState("starting");
      const activeSession = sessionRef.current ?? (await loadCompanionSession({ showErrors: true }));

      if (!activeSession) {
        setState("error");
        return;
      }

      const response = await companion.startScreenShare(activeSession);
      setState(response.state ?? "sharing");
      setError(response.ok === false ? response.error ?? "Unable to start screen share." : null);
    } catch (caughtError) {
      setState("error");
      setError(caughtError instanceof Error ? caughtError.message : "LiveKit companion failed.");
    }
  }

  const isBusy = state === "starting" || state === "stopping";
  const label =
    state === "sharing"
      ? "Test Stop Share Screen"
      : state === "starting"
        ? "Starting..."
        : state === "stopping"
          ? "Stopping..."
          : "Test Share Screen";

  return (
    <div className="overflow-hidden rounded border border-border bg-surface">
      <div className="flex flex-col gap-3 px-3 py-2.5 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-medium text-foreground">
            LiveKit companion screen sharing
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Start or stop the macOS companion display share for the active voice room.
          </p>
          {error ? (
            <p className="mt-1 text-[12px] text-destructive">{error}</p>
          ) : null}
        </div>
        <Button
          variant={state === "sharing" ? "destructive" : "outline"}
          size="sm"
          className="h-7 px-2.5 text-[12px]"
          onClick={() => {
            void handleToggle();
          }}
          disabled={isBusy}
          title={
            session
              ? "Toggle LiveKit companion full-display sharing"
              : "Waiting for the active LiveKit room URL and companion token"
          }
        >
          {state === "sharing" ? (
            <Square className="h-3 w-3" />
          ) : (
            <Play className="h-3 w-3" />
          )}
          {label}
        </Button>
      </div>
    </div>
  );
};

const Settings: React.FC = () => {
  const { logout } = useAuth();
  const { pluginConsolePages } = usePluginRegistry();
  const [openbaseServices, setOpenbaseServices] = useState<OpenbaseService[]>(
    [],
  );
  const [loadingOpenbaseServices, setLoadingOpenbaseServices] = useState(true);
  const [openbaseServicesError, setOpenbaseServicesError] = useState<
    string | null
  >(null);
  const [serviceActionKey, setServiceActionKey] = useState<string | null>(null);
  const [recreatingLiveKitThread, setRecreatingLiveKitThread] = useState(false);
  const [liveKitThreadError, setLiveKitThreadError] = useState<string | null>(
    null,
  );
  const [liveKitThreadResult, setLiveKitThreadResult] =
    useState<LiveKitThreadRecreateResponse | null>(null);
  const [cartesiaVoices, setCartesiaVoices] = useState<CartesiaVoice[]>([]);
  const [dispatcherVoice, setDispatcherVoice] =
    useState<DispatcherVoice | null>(null);
  const [selectedDispatcherVoiceId, setSelectedDispatcherVoiceId] =
    useState("");
  const [loadingDispatcherVoices, setLoadingDispatcherVoices] = useState(true);
  const [savingDispatcherVoice, setSavingDispatcherVoice] = useState(false);
  const [dispatcherVoiceError, setDispatcherVoiceError] = useState<
    string | null
  >(null);
  const [dispatcherVoiceMessage, setDispatcherVoiceMessage] = useState<
    string | null
  >(null);
  const [ignoredLabels, setIgnoredLabels] = useState<string[]>([]);
  const [loadingIgnoredLabels, setLoadingIgnoredLabels] = useState(true);
  const [ignoredLabelsError, setIgnoredLabelsError] = useState<string | null>(
    null,
  );
  const [updatingLabel, setUpdatingLabel] = useState<string | null>(null);
  const [hiddenSidebarItems, setHiddenSidebarItems] = useState<string[]>(() =>
    readHiddenSidebarItems(),
  );

  const fetchOpenbaseServices = useCallback(async () => {
    setLoadingOpenbaseServices(true);
    try {
      const res = await apiFetch("/api/settings/openbase-services/");
      if (!res.ok) {
        setOpenbaseServicesError(
          await extractErrorMessage(
            res,
            `Unable to load Openbase services: ${res.status}`,
          ),
        );
        setLoadingOpenbaseServices(false);
        return;
      }
      const data = (await res.json()) as OpenbaseServicesResponse;
      setOpenbaseServices(data.services);
      setOpenbaseServicesError(null);
    } catch {
      setOpenbaseServicesError("Unable to reach the local API.");
    }
    setLoadingOpenbaseServices(false);
  }, []);

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

  const fetchDispatcherVoices = useCallback(async () => {
    setLoadingDispatcherVoices(true);
    try {
      const res = await apiFetch("/api/settings/cartesia-voices/");
      if (!res.ok) {
        setDispatcherVoiceError(
          await extractErrorMessage(
            res,
            `Unable to load Cartesia voices: ${res.status}`,
          ),
        );
        setLoadingDispatcherVoices(false);
        return;
      }
      const data = (await res.json()) as CartesiaVoiceSettingsResponse;
      setCartesiaVoices(data.voices);
      setDispatcherVoice(data.dispatcher_voice);
      setSelectedDispatcherVoiceId(data.dispatcher_voice.id);
      setDispatcherVoiceError(null);
      setDispatcherVoiceMessage(null);
    } catch {
      setDispatcherVoiceError("Unable to reach the local API.");
    }
    setLoadingDispatcherVoices(false);
  }, []);

  useEffect(() => {
    void fetchOpenbaseServices();
    void fetchIgnoredLabels();
    void fetchDispatcherVoices();
  }, [fetchDispatcherVoices, fetchIgnoredLabels, fetchOpenbaseServices]);

  useEffect(() => {
    const refreshSidebarPreferences = () =>
      setHiddenSidebarItems(readHiddenSidebarItems());
    window.addEventListener(SIDEBAR_PREFERENCES_EVENT, refreshSidebarPreferences);
    window.addEventListener("storage", refreshSidebarPreferences);
    return () => {
      window.removeEventListener(
        SIDEBAR_PREFERENCES_EVENT,
        refreshSidebarPreferences,
      );
      window.removeEventListener("storage", refreshSidebarPreferences);
    };
  }, []);

  const handleServiceAction = useCallback(
    async (serviceName: string, action: "start" | "stop" | "restart") => {
      const key = `${serviceName}:${action}`;
      setServiceActionKey(key);
      try {
        const res = await apiFetch(
          `/api/settings/openbase-services/${encodeURIComponent(serviceName)}/`,
          {
            method: "POST",
            body: JSON.stringify({ action }),
          },
        );
        if (!res.ok) {
          setOpenbaseServicesError(
            await extractErrorMessage(
              res,
              `Unable to ${action} Openbase service: ${res.status}`,
            ),
          );
          setServiceActionKey(null);
          return;
        }
        const data = (await res.json()) as OpenbaseServicesResponse;
        setOpenbaseServices(data.services);
        setOpenbaseServicesError(null);
        window.setTimeout(() => {
          void fetchOpenbaseServices();
        }, data.scheduled ? 3000 : 1000);
      } catch {
        setOpenbaseServicesError("Unable to reach the local API.");
      }
      setServiceActionKey(null);
    },
    [fetchOpenbaseServices],
  );

  const handleRestartAllServices = useCallback(async () => {
    const key = "__all__:restart";
    setServiceActionKey(key);
    try {
      const res = await apiFetch("/api/settings/openbase-services/restart-all/", {
        method: "POST",
      });
      if (!res.ok) {
        setOpenbaseServicesError(
          await extractErrorMessage(
            res,
            `Unable to restart Openbase services: ${res.status}`,
          ),
        );
        setServiceActionKey(null);
        return;
      }
      const data = (await res.json()) as OpenbaseServicesResponse;
      setOpenbaseServices(data.services);
      setOpenbaseServicesError(null);
      window.setTimeout(() => {
        void fetchOpenbaseServices();
      }, 4000);
    } catch {
      setOpenbaseServicesError("Unable to reach the local API.");
    }
    setServiceActionKey(null);
  }, [fetchOpenbaseServices]);

  const handleRestartSuperAgentsMcp = useCallback(async () => {
    const key = "__super_agents_mcp__:restart";
    setServiceActionKey(key);
    try {
      const res = await apiFetch(
        "/api/settings/openbase-services/super-agents-mcp/restart/",
        {
          method: "POST",
        },
      );
      if (!res.ok) {
        setOpenbaseServicesError(
          await extractErrorMessage(
            res,
            `Unable to restart Super Agents MCP: ${res.status}`,
          ),
        );
        setServiceActionKey(null);
        return;
      }
      const data = (await res.json()) as OpenbaseServicesResponse;
      setOpenbaseServices(data.services);
      setOpenbaseServicesError(null);
      window.setTimeout(() => {
        void fetchOpenbaseServices();
      }, 3000);
    } catch {
      setOpenbaseServicesError("Unable to reach the local API.");
    }
    setServiceActionKey(null);
  }, [fetchOpenbaseServices]);

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

  const handleRecreateLiveKitThread = useCallback(async () => {
    setRecreatingLiveKitThread(true);
    setLiveKitThreadError(null);
    try {
      const res = await apiFetch("/api/settings/livekit-thread/recreate/", {
        method: "POST",
      });
      if (!res.ok) {
        setLiveKitThreadError(
          await extractErrorMessage(
            res,
            `Unable to recreate LiveKit thread: ${res.status}`,
          ),
        );
        setRecreatingLiveKitThread(false);
        return;
      }
      setLiveKitThreadResult((await res.json()) as LiveKitThreadRecreateResponse);
    } catch {
      setLiveKitThreadError("Unable to reach the local API.");
    }
    setRecreatingLiveKitThread(false);
  }, []);

  const handleSaveDispatcherVoice = useCallback(async () => {
    if (!selectedDispatcherVoiceId) {
      return;
    }
    setSavingDispatcherVoice(true);
    setDispatcherVoiceError(null);
    setDispatcherVoiceMessage(null);
    try {
      const res = await apiFetch("/api/settings/dispatcher-voice/", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voice_id: selectedDispatcherVoiceId }),
      });
      if (!res.ok) {
        setDispatcherVoiceError(
          await extractErrorMessage(
            res,
            `Unable to save dispatcher voice: ${res.status}`,
          ),
        );
        setSavingDispatcherVoice(false);
        return;
      }
      const data = (await res.json()) as DispatcherVoiceUpdateResponse;
      setDispatcherVoice(data.dispatcher_voice);
      setSelectedDispatcherVoiceId(data.dispatcher_voice.id);
      setDispatcherVoiceMessage(
        "Saved. Recreate the dispatcher thread to apply this voice.",
      );
    } catch {
      setDispatcherVoiceError("Unable to reach the local API.");
    }
    setSavingDispatcherVoice(false);
  }, [selectedDispatcherVoiceId]);

  const selectedDispatcherVoice = cartesiaVoices.find(
    (voice) => voice.id === selectedDispatcherVoiceId,
  );

  const sidebarPreferenceItems = useMemo<SidebarItem[]>(() => {
    const pluginItems: SidebarItem[] = pluginConsolePages
      .filter((page) => page.sidebar)
      .map((page) => ({
        key: `plugin:${page.pluginId}:${page.key}`,
        path: page.route,
        icon: Square,
        title: page.title,
        section: "plugins",
      }));
    return [...BUILT_IN_SIDEBAR_ITEMS, ...pluginItems];
  }, [pluginConsolePages]);

  const handleSidebarVisibilityChange = useCallback(
    (item: SidebarItem, visible: boolean) => {
      if (item.locked) {
        return;
      }
      const nextHiddenItems = visible
        ? hiddenSidebarItems.filter((key) => key !== item.key)
        : [...hiddenSidebarItems, item.key];
      writeHiddenSidebarItems(nextHiddenItems);
      setHiddenSidebarItems(readHiddenSidebarItems());
    },
    [hiddenSidebarItems],
  );

  const sidebarItemsBySection = useMemo(
    () => ({
      workspace: sidebarPreferenceItems.filter(
        (item) => item.section === "workspace",
      ),
      system: sidebarPreferenceItems.filter((item) => item.section === "system"),
      plugins: sidebarPreferenceItems.filter(
        (item) => item.section === "plugins",
      ),
    }),
    [sidebarPreferenceItems],
  );

  const renderSidebarPreferenceRows = (items: SidebarItem[]) =>
    items.map((item) => {
      const visible = sidebarItemVisible(item, hiddenSidebarItems);
      return (
        <div
          key={item.key}
          className="flex min-w-0 items-center gap-3 px-3 py-2.5"
        >
          <item.icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-medium text-foreground">
              {item.title}
            </p>
            <p className="mt-0.5 truncate font-mono text-[10.5px] text-muted-foreground">
              {item.path}
            </p>
          </div>
          <Switch
            checked={visible}
            disabled={item.locked}
            onCheckedChange={(checked) =>
              handleSidebarVisibilityChange(item, checked)
            }
            aria-label={`${visible ? "Hide" : "Show"} ${item.title}`}
          />
        </div>
      );
    });

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-base font-semibold tracking-tight text-foreground">
            Settings
          </h1>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Connection and authentication preferences.
          </p>
        </div>

        {getRuntimeShell() === "electron" ? <LiveKitCompanionSettings /> : null}

        <div className="overflow-hidden rounded border border-border bg-surface">
          <div className="border-b border-border px-3 py-2.5">
            <p className="text-[12.5px] font-medium text-foreground">
              Sidebar items
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Settings stays visible.
            </p>
          </div>
          <div className="divide-y divide-border">
            <div>
              <div className="bg-background/60 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Workspace
              </div>
              <div className="divide-y divide-border">
                {renderSidebarPreferenceRows(sidebarItemsBySection.workspace)}
              </div>
            </div>
            <div>
              <div className="bg-background/60 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                System
              </div>
              <div className="divide-y divide-border">
                {renderSidebarPreferenceRows(sidebarItemsBySection.system)}
              </div>
            </div>
            {sidebarItemsBySection.plugins.length > 0 ? (
              <div>
                <div className="bg-background/60 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Plugins
                </div>
                <div className="divide-y divide-border">
                  {renderSidebarPreferenceRows(sidebarItemsBySection.plugins)}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="overflow-hidden rounded border border-border bg-surface">
          <div className="flex flex-col gap-3 border-b border-border px-3 py-2.5 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-medium text-foreground">
                Openbase service commands
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Start, stop, or restart Openbase-managed services.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-[12px]"
                onClick={() => {
                  void handleRestartSuperAgentsMcp();
                }}
                disabled={loadingOpenbaseServices || serviceActionKey !== null}
                title="Restart only the Super Agents MCP process"
              >
                <RefreshCw
                  className={`h-3 w-3 ${
                    serviceActionKey === "__super_agents_mcp__:restart"
                      ? "animate-spin"
                      : ""
                  }`}
                />
                {serviceActionKey === "__super_agents_mcp__:restart"
                  ? "Restarting…"
                  : "Restart Super Agents MCP"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-[12px]"
                onClick={() => {
                  void handleRestartAllServices();
                }}
                disabled={loadingOpenbaseServices || serviceActionKey !== null}
                title="Restart all Openbase services and known MCP processes"
              >
                <RefreshCw
                  className={`h-3 w-3 ${
                    serviceActionKey === "__all__:restart" ? "animate-spin" : ""
                  }`}
                />
                {serviceActionKey === "__all__:restart"
                  ? "Restarting…"
                  : "Restart all"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-[12px]"
                onClick={fetchOpenbaseServices}
                disabled={loadingOpenbaseServices || serviceActionKey !== null}
              >
                <RefreshCw
                  className={`h-3 w-3 ${
                    loadingOpenbaseServices ? "animate-spin" : ""
                  }`}
                />
                Refresh
              </Button>
            </div>
          </div>
          {openbaseServicesError ? (
            <div className="border-b border-border px-3 py-2 text-[12px] text-destructive">
              {openbaseServicesError}
            </div>
          ) : null}
          {loadingOpenbaseServices && openbaseServices.length === 0 ? (
            <div className="px-3 py-3 text-[12px] text-muted-foreground">
              Loading…
            </div>
          ) : openbaseServices.length === 0 ? (
            <div className="px-3 py-3 text-[12px] text-muted-foreground">
              No Openbase-managed services found.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {openbaseServices.map((service) => (
                <div
                  key={service.name}
                  className="flex min-w-0 flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:gap-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        service.running ? "bg-success" : "bg-destructive"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="truncate text-[12.5px] font-medium text-foreground">
                          {service.description}
                        </p>
                        <span className="font-mono text-[10.5px] text-muted-foreground/70">
                          {service.port != null
                            ? `:${service.port}`
                            : "launchd"}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate font-mono text-[10.5px] text-muted-foreground">
                        {service.label}
                      </p>
                    </div>
                  </div>
                  <div className="flex w-full shrink-0 flex-wrap items-center gap-1.5 sm:w-auto sm:justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-[12px]"
                      onClick={() => {
                        void handleServiceAction(service.name, "start");
                      }}
                      disabled={serviceActionKey !== null}
                      title={`Start ${service.description}`}
                    >
                      <Play className="h-3 w-3" />
                      {serviceActionKey === `${service.name}:start`
                        ? "…"
                        : "Start"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-[12px]"
                      onClick={() => {
                        void handleServiceAction(service.name, "stop");
                      }}
                      disabled={serviceActionKey !== null}
                      title={`Stop ${service.description}`}
                    >
                      <Square className="h-3 w-3" />
                      {serviceActionKey === `${service.name}:stop`
                        ? "…"
                        : "Stop"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-[12px]"
                      onClick={() => {
                        void handleServiceAction(service.name, "restart");
                      }}
                      disabled={serviceActionKey !== null}
                      title={`Restart ${service.description}`}
                    >
                      <RefreshCw className="h-3 w-3" />
                      {serviceActionKey === `${service.name}:restart`
                        ? "…"
                        : "Restart"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded border border-border bg-surface">
          <div className="flex flex-col gap-3 border-b border-border px-3 py-2.5 lg:flex-row lg:items-center">
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-medium text-foreground">
                Dispatcher voice
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Select the Cartesia voice used by the dispatcher. Recreate the
                dispatcher thread to apply a saved change.
              </p>
              {dispatcherVoice ? (
                <p className="mt-1 truncate text-[11px] text-muted-foreground">
                  Current: {dispatcherVoice.name}
                </p>
              ) : null}
              {selectedDispatcherVoice ? (
                <p className="mt-1 truncate font-mono text-[10.5px] text-muted-foreground">
                  {selectedDispatcherVoice.id}
                </p>
              ) : null}
              {dispatcherVoiceMessage ? (
                <p className="mt-1 text-[12px] text-success">
                  {dispatcherVoiceMessage}
                </p>
              ) : null}
              {dispatcherVoiceError ? (
                <p className="mt-1 text-[12px] text-destructive">
                  {dispatcherVoiceError}
                </p>
              ) : null}
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
              <Select
                value={selectedDispatcherVoiceId}
                onValueChange={setSelectedDispatcherVoiceId}
                disabled={loadingDispatcherVoices || savingDispatcherVoice}
              >
                <SelectTrigger className="h-8 min-w-0 text-[12px] sm:w-72">
                  <SelectValue
                    placeholder={
                      loadingDispatcherVoices ? "Loading voices…" : "Select voice"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {cartesiaVoices.map((voice) => (
                    <SelectItem key={voice.id} value={voice.id}>
                      {voice.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-[12px]"
                onClick={() => {
                  void handleSaveDispatcherVoice();
                }}
                disabled={
                  savingDispatcherVoice ||
                  loadingDispatcherVoices ||
                  !selectedDispatcherVoiceId ||
                  selectedDispatcherVoiceId === dispatcherVoice?.id
                }
              >
                {savingDispatcherVoice ? "Saving…" : "Save voice"}
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-3 px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-medium text-foreground">
                LiveKit dispatcher thread
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Clear the saved dispatcher thread and restart the LiveKit agent.
              </p>
              {liveKitThreadResult ? (
                <p className="mt-1 truncate font-mono text-[10.5px] text-muted-foreground">
                  Previous:{" "}
                  {liveKitThreadResult.previous_dispatcher_thread_id ?? "none"}
                  {" · agent "}
                  {liveKitThreadResult.livekit_agent.running
                    ? "running"
                    : "stopped"}
                </p>
              ) : null}
              {liveKitThreadError ? (
                <p className="mt-1 text-[12px] text-destructive">
                  {liveKitThreadError}
                </p>
              ) : null}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-[12px]"
              onClick={() => {
                void handleRecreateLiveKitThread();
              }}
              disabled={recreatingLiveKitThread}
            >
              <RefreshCw
                className={`h-3 w-3 ${
                  recreatingLiveKitThread ? "animate-spin" : ""
                }`}
              />
              {recreatingLiveKitThread ? "Recreating…" : "Recreate thread"}
            </Button>
          </div>
        </div>

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
              <RefreshCw
                className={`h-3 w-3 ${
                  loadingIgnoredLabels ? "animate-spin" : ""
                }`}
              />
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

        <div className="overflow-hidden rounded border border-border bg-surface">
          <div className="flex items-center gap-3 px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-medium text-foreground">
                Authentication
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Openbase bearer JWT, managed by the local CLI.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-[12px]"
              onClick={logout}
            >
              <LogOut className="h-3 w-3" />
              Log out
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
