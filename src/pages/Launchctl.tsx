import DashboardLayout from "@/components/layouts/ExampleLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type LaunchctlService = {
  label: string;
  plist_path: string;
  loaded: boolean;
  running: boolean;
  pid: number | null;
  status: number | null;
  command: string | null;
  program: string | null;
  program_arguments: string[];
  working_directory: string | null;
  run_at_load: boolean;
  keep_alive: boolean;
  disabled: boolean | null;
  is_openbase_managed: boolean;
  plist_error: string | null;
};

type LaunchctlServicesResponse = {
  services: LaunchctlService[];
  error: string | null;
};

const runtimeTone = (service: LaunchctlService) => {
  if (service.running) {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  }
  if (service.loaded) {
    return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
  }
  return "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
};

const runtimeLabel = (service: LaunchctlService) => {
  if (service.running) {
    return "Running";
  }
  if (service.loaded) {
    return "Loaded";
  }
  return "Stopped";
};

const extractErrorMessage = async (
  res: Response,
  fallback: string
): Promise<string> => {
  try {
    const data = (await res.json()) as { error?: string; detail?: string };
    return data.error ?? data.detail ?? fallback;
  } catch {
    return fallback;
  }
};

const Launchctl = () => {
  const [services, setServices] = useState<LaunchctlService[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionKey, setActionKey] = useState<string | null>(null);

  const applyPayload = useCallback((data: LaunchctlServicesResponse) => {
    setServices(data.services);
    setError(data.error);
  }, []);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/tools/launchctl/");
      if (!res.ok) {
        setError(
          await extractErrorMessage(
            res,
            `Unable to load launchctl services: ${res.status}`
          )
        );
        setLoading(false);
        return;
      }
      applyPayload((await res.json()) as LaunchctlServicesResponse);
    } catch {
      setError("Unable to reach the local API.");
    }
    setLoading(false);
  }, [applyPayload]);

  useEffect(() => {
    void fetchServices();
  }, [fetchServices]);

  const handleAction = useCallback(
    async (label: string, action: "start" | "stop" | "restart") => {
      const nextActionKey = `${label}:${action}`;
      setActionKey(nextActionKey);
      try {
        const res = await apiFetch(`/api/tools/launchctl/${encodeURIComponent(label)}/`, {
          method: "POST",
          body: JSON.stringify({ action }),
        });

        if (!res.ok) {
          setError(
            await extractErrorMessage(
              res,
              `Unable to ${action} launchctl service: ${res.status}`
            )
          );
          setActionKey(null);
          return;
        }

        applyPayload((await res.json()) as LaunchctlServicesResponse);
      } catch {
        setError("Unable to reach the local API.");
        setActionKey(null);
        return;
      }
      setActionKey(null);
    },
    [applyPayload]
  );

  const runningCount = services.filter((service) => service.running).length;
  const loadedCount = services.filter((service) => service.loaded).length;
  const openbaseCount = services.filter((service) => service.is_openbase_managed).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-light">Launchctl</h1>
            <p className="text-gray-600">
              User LaunchAgents from `~/Library/LaunchAgents` with live launchctl state
            </p>
          </div>
          <Button
            variant="outline"
            onClick={fetchServices}
            disabled={loading || actionKey !== null}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm text-gray-500">Launch agents</p>
            <p className="mt-2 text-2xl font-semibold">{services.length}</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm text-gray-500">Loaded agents</p>
            <p className="mt-2 text-2xl font-semibold">{loadedCount}</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm text-gray-500">Running agents</p>
            <p className="mt-2 text-2xl font-semibold">{runningCount}</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm text-gray-500">Openbase managed</p>
            <p className="mt-2 text-2xl font-semibold">{openbaseCount}</p>
          </div>
        </div>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-lg border bg-white">
          <div className="hidden grid-cols-[minmax(220px,1.2fr)_minmax(220px,1.2fr)_minmax(160px,0.9fr)_minmax(220px,1fr)] gap-4 border-b bg-gray-50 px-4 py-3 text-xs font-semibold uppercase text-gray-500 lg:grid">
            <div>Service</div>
            <div>Command</div>
            <div>Runtime</div>
            <div>Actions</div>
          </div>
          {loading && services.length === 0 ? (
            <div className="px-4 py-8 text-sm text-gray-500">Loading launchctl services...</div>
          ) : services.length === 0 ? (
            <div className="px-4 py-8 text-sm text-gray-500">
              No user LaunchAgents found in `~/Library/LaunchAgents`.
            </div>
          ) : (
            services.map((service) => (
              <div
                key={service.label}
                className="grid grid-cols-1 gap-4 border-b px-4 py-4 last:border-b-0 lg:grid-cols-[minmax(220px,1.2fr)_minmax(220px,1.2fr)_minmax(160px,0.9fr)_minmax(220px,1fr)]"
              >
                <div className="min-w-0">
                  <p className="mb-2 text-xs font-semibold uppercase text-gray-500 lg:hidden">
                    Service
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-gray-900">{service.label}</p>
                    {service.is_openbase_managed ? (
                      <Badge variant="secondary">Openbase</Badge>
                    ) : null}
                    {service.disabled ? <Badge variant="outline">Disabled</Badge> : null}
                  </div>
                  <p className="mt-2 break-all text-xs text-gray-400">{service.plist_path}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                    {service.run_at_load ? <span>RunAtLoad</span> : null}
                    {service.keep_alive ? <span>KeepAlive</span> : null}
                  </div>
                  {service.plist_error ? (
                    <p className="mt-3 break-all text-xs text-red-600">
                      {service.plist_error}
                    </p>
                  ) : null}
                </div>

                <div className="min-w-0">
                  <p className="mb-2 text-xs font-semibold uppercase text-gray-500 lg:hidden">
                    Command
                  </p>
                  {service.command ? (
                    <p className="break-all text-sm text-gray-800">{service.command}</p>
                  ) : (
                    <p className="text-sm text-gray-500">No command metadata in plist.</p>
                  )}
                  {service.working_directory ? (
                    <p className="mt-2 break-all text-xs text-gray-400">
                      cwd: {service.working_directory}
                    </p>
                  ) : null}
                </div>

                <div className="min-w-0">
                  <p className="mb-2 text-xs font-semibold uppercase text-gray-500 lg:hidden">
                    Runtime
                  </p>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${runtimeTone(service)}`}
                  >
                    {runtimeLabel(service)}
                  </span>
                  {service.pid !== null ? (
                    <p className="mt-2 text-sm text-gray-700">PID {service.pid}</p>
                  ) : null}
                  {service.status !== null ? (
                    <p className="mt-1 text-xs text-gray-500">status {service.status}</p>
                  ) : null}
                </div>

                <div className="min-w-0">
                  <p className="mb-2 text-xs font-semibold uppercase text-gray-500 lg:hidden">
                    Actions
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={actionKey !== null || service.running}
                      onClick={() => void handleAction(service.label, "start")}
                    >
                      {actionKey === `${service.label}:start` ? "Starting..." : "Start"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={actionKey !== null || !service.loaded}
                      onClick={() => void handleAction(service.label, "stop")}
                    >
                      {actionKey === `${service.label}:stop` ? "Stopping..." : "Stop"}
                    </Button>
                    <Button
                      size="sm"
                      disabled={actionKey !== null}
                      onClick={() => void handleAction(service.label, "restart")}
                    >
                      {actionKey === `${service.label}:restart`
                        ? "Restarting..."
                        : "Restart"}
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Launchctl;
