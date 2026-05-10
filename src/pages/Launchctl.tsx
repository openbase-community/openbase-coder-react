import DashboardLayout from "@/components/layouts/ExampleLayout";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { RefreshCw, Server } from "lucide-react";
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

const runtimeText = (svc: LaunchctlService) => {
  if (svc.running) return "text-success";
  if (svc.loaded) return "text-warning";
  return "text-muted-foreground";
};

const runtimeDot = (svc: LaunchctlService) => {
  if (svc.running) return "bg-success";
  if (svc.loaded) return "bg-warning";
  return "bg-muted-foreground/40";
};

const runtimeLabel = (svc: LaunchctlService) =>
  svc.running ? "running" : svc.loaded ? "loaded" : "stopped";

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
            `Unable to load launchctl services: ${res.status}`,
          ),
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
        const res = await apiFetch(
          `/api/tools/launchctl/${encodeURIComponent(label)}/`,
          {
            method: "POST",
            body: JSON.stringify({ action }),
          },
        );
        if (!res.ok) {
          setError(
            await extractErrorMessage(
              res,
              `Unable to ${action} launchctl service: ${res.status}`,
            ),
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
    [applyPayload],
  );

  const runningCount = services.filter((s) => s.running).length;
  const openbaseCount = services.filter((s) => s.is_openbase_managed).length;

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold tracking-tight text-foreground">
              launchctl
            </h1>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {runningCount}/{services.length} running · {openbaseCount} openbase
              · <span className="font-mono">~/Library/LaunchAgents</span>
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2.5 text-[12px]"
            onClick={fetchServices}
            disabled={loading || actionKey !== null}
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {error ? (
          <div className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
            {error}
          </div>
        ) : null}

        {loading && services.length === 0 ? (
          <div className="text-[12px] text-muted-foreground">Loading…</div>
        ) : services.length === 0 ? (
          <div className="rounded border border-dashed border-border bg-surface px-4 py-6 text-center">
            <Server className="mx-auto h-4 w-4 text-muted-foreground/40" />
            <p className="mt-2 text-[12px] text-muted-foreground">
              No LaunchAgents.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded border border-border bg-surface">
            {services.map((svc, idx) => (
              <div
                key={svc.label}
                className={`grid grid-cols-1 gap-3 px-3 py-2 lg:grid-cols-[minmax(220px,1.2fr)_minmax(200px,1.2fr)_minmax(120px,0.7fr)_auto] ${
                  idx > 0 ? "border-t border-border" : ""
                }`}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${runtimeDot(svc)}`}
                    />
                    <span className="font-mono text-[12.5px] font-medium text-foreground">
                      {svc.label}
                    </span>
                    {svc.is_openbase_managed ? (
                      <span className="font-mono text-[10px] text-info">
                        openbase
                      </span>
                    ) : null}
                    {svc.disabled ? (
                      <span className="font-mono text-[10px] text-muted-foreground">
                        disabled
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 break-all font-mono text-[10.5px] text-muted-foreground/70">
                    {svc.plist_path}
                  </p>
                  <div className="mt-0.5 flex flex-wrap gap-2 font-mono text-[10px] text-muted-foreground">
                    {svc.run_at_load ? <span>RunAtLoad</span> : null}
                    {svc.keep_alive ? <span>KeepAlive</span> : null}
                  </div>
                  {svc.plist_error ? (
                    <p className="mt-1 break-all text-[10.5px] text-destructive">
                      {svc.plist_error}
                    </p>
                  ) : null}
                </div>

                <div className="min-w-0">
                  {svc.command ? (
                    <p className="break-all font-mono text-[11.5px] text-foreground/80">
                      {svc.command}
                    </p>
                  ) : (
                    <p className="text-[12px] text-muted-foreground">—</p>
                  )}
                  {svc.working_directory ? (
                    <p className="mt-0.5 break-all font-mono text-[10.5px] text-muted-foreground/70">
                      cwd: {svc.working_directory}
                    </p>
                  ) : null}
                </div>

                <div className="min-w-0 font-mono text-[11px]">
                  <p className={runtimeText(svc)}>{runtimeLabel(svc)}</p>
                  {svc.pid !== null ? (
                    <p className="text-muted-foreground tabular-nums">
                      pid {svc.pid}
                    </p>
                  ) : null}
                  {svc.status !== null ? (
                    <p className="text-muted-foreground/70 tabular-nums">
                      status {svc.status}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-start gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-[11px]"
                    disabled={actionKey !== null || svc.running}
                    onClick={() => void handleAction(svc.label, "start")}
                  >
                    {actionKey === `${svc.label}:start` ? "…" : "Start"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-[11px]"
                    disabled={actionKey !== null || !svc.loaded}
                    onClick={() => void handleAction(svc.label, "stop")}
                  >
                    {actionKey === `${svc.label}:stop` ? "…" : "Stop"}
                  </Button>
                  <Button
                    size="sm"
                    className="h-6 px-2 text-[11px]"
                    disabled={actionKey !== null}
                    onClick={() => void handleAction(svc.label, "restart")}
                  >
                    {actionKey === `${svc.label}:restart` ? "…" : "Restart"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Launchctl;
