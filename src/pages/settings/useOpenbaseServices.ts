import { apiFetch } from "@/lib/api";
import { useCallback, useEffect, useState } from "react";
import {
  extractErrorMessage,
  type OpenbaseService,
  type OpenbaseServicesResponse,
} from "./settingsApi";

export function useOpenbaseServices() {
  const [services, setServices] = useState<OpenbaseService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionKey, setActionKey] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/settings/openbase-services/");
      if (!res.ok) {
        setError(
          await extractErrorMessage(
            res,
            `Unable to load Openbase services: ${res.status}`,
          ),
        );
        setLoading(false);
        return;
      }
      const data = (await res.json()) as OpenbaseServicesResponse;
      setServices(data.services);
      setError(null);
    } catch {
      setError("Unable to reach the local API.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const applyRestartResponse = useCallback(
    (data: OpenbaseServicesResponse, delayMs?: number) => {
      setServices(data.services);
      setError(null);
      window.setTimeout(() => {
        void refresh();
      }, delayMs ?? (data.scheduled ? 3000 : 1000));
    },
    [refresh],
  );

  const runServiceAction = useCallback(
    async (serviceName: string, action: "start" | "stop" | "restart") => {
      const key = `${serviceName}:${action}`;
      setActionKey(key);
      try {
        const res =
          action === "restart"
            ? await apiFetch("/api/settings/restart/", {
                method: "POST",
                body: JSON.stringify({ service: serviceName }),
              })
            : await apiFetch(
                `/api/settings/openbase-services/${encodeURIComponent(serviceName)}/`,
                {
                  method: "POST",
                  body: JSON.stringify({ action }),
                },
              );
        if (!res.ok) {
          setError(
            await extractErrorMessage(
              res,
              `Unable to ${action} Openbase service: ${res.status}`,
            ),
          );
          setActionKey(null);
          return;
        }
        const data = (await res.json()) as OpenbaseServicesResponse;
        applyRestartResponse(data);
      } catch {
        setError("Unable to reach the local API.");
      }
      setActionKey(null);
    },
    [applyRestartResponse],
  );

  const restartAll = useCallback(async () => {
    const key = "__all__:restart";
    setActionKey(key);
    try {
      const res = await apiFetch("/api/settings/restart/", {
        method: "POST",
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        setError(
          await extractErrorMessage(
            res,
            `Unable to restart Openbase services: ${res.status}`,
          ),
        );
        setActionKey(null);
        return;
      }
      const data = (await res.json()) as OpenbaseServicesResponse;
      applyRestartResponse(data, 4000);
    } catch {
      setError("Unable to reach the local API.");
    }
    setActionKey(null);
  }, [applyRestartResponse]);

  const restartSuperAgentsMcp = useCallback(async () => {
    const key = "__super_agents_mcp__:restart";
    setActionKey(key);
    try {
      const res = await apiFetch("/api/settings/restart/", {
        method: "POST",
        body: JSON.stringify({ service: "super-agents-mcp" }),
      });
      if (!res.ok) {
        setError(
          await extractErrorMessage(
            res,
            `Unable to restart Super Agents MCP: ${res.status}`,
          ),
        );
        setActionKey(null);
        return;
      }
      const data = (await res.json()) as OpenbaseServicesResponse;
      applyRestartResponse(data, 3000);
    } catch {
      setError("Unable to reach the local API.");
    }
    setActionKey(null);
  }, [applyRestartResponse]);

  return {
    services,
    loading,
    error,
    actionKey,
    refresh,
    runServiceAction,
    restartAll,
    restartSuperAgentsMcp,
    applyRestartResponse,
  };
}

export type OpenbaseServicesController = ReturnType<typeof useOpenbaseServices>;
