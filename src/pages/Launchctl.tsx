import DashboardLayout from "@/components/layouts/DashboardLayout";
import {
  ResourceEmptyState,
  ResourceError,
  ResourceLoading,
  ResourcePageHeader,
} from "@/components/resource/ResourcePage";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { extractErrorMessage } from "@/lib/api-errors";
import {
  ArrowLeft,
  ChevronRight,
  EyeOff,
  RefreshCw,
  Server,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

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
  ignored_labels?: string[];
};

type IgnoredLaunchctlLabelsResponse = {
  ignored_labels: string[];
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

const servicePath = (label: string) =>
  `/dashboard/launchctl/${encodeURIComponent(label)}`;

const DetailField = ({
  label,
  value,
}: {
  label: string;
  value: string | number | boolean | null | undefined;
}) => (
  <div className="min-w-0 rounded border border-border bg-background px-3 py-2">
    <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      {label}
    </dt>
    <dd className="mt-1 break-all font-mono text-[11px] text-foreground/80">
      {value === null || value === undefined || value === ""
        ? "—"
        : String(value)}
    </dd>
  </div>
);

const ServiceActions = ({
  service,
  actionKey,
  onAction,
  className = "",
}: {
  service: LaunchctlService;
  actionKey: string | null;
  onAction: (label: string, action: "start" | "stop" | "restart") => void;
  className?: string;
}) => (
  <div className={`flex flex-wrap items-start gap-1 ${className}`}>
    <Button
      variant="outline"
      size="sm"
      className="h-6 px-2 text-[11px]"
      disabled={actionKey !== null || service.running}
      onClick={(event) => {
        event.stopPropagation();
        onAction(service.label, "start");
      }}
    >
      {actionKey === `${service.label}:start` ? "…" : "Start"}
    </Button>
    <Button
      variant="outline"
      size="sm"
      className="h-6 px-2 text-[11px]"
      disabled={actionKey !== null || !service.loaded}
      onClick={(event) => {
        event.stopPropagation();
        onAction(service.label, "stop");
      }}
    >
      {actionKey === `${service.label}:stop` ? "…" : "Stop"}
    </Button>
    <Button
      size="sm"
      className="h-6 px-2 text-[11px]"
      disabled={actionKey !== null}
      onClick={(event) => {
        event.stopPropagation();
        onAction(service.label, "restart");
      }}
    >
      {actionKey === `${service.label}:restart` ? "…" : "Restart"}
    </Button>
  </div>
);

const Launchctl = () => {
  const navigate = useNavigate();
  const { serviceLabel = "" } = useParams();
  const decodedServiceLabel = useMemo(() => {
    try {
      return decodeURIComponent(serviceLabel);
    } catch {
      return serviceLabel;
    }
  }, [serviceLabel]);
  const isDetail = Boolean(serviceLabel);

  const [services, setServices] = useState<LaunchctlService[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [ignoredLabels, setIgnoredLabels] = useState<string[]>([]);

  const applyPayload = useCallback((data: LaunchctlServicesResponse) => {
    setServices(data.services);
    setError(data.error);
    setIgnoredLabels(data.ignored_labels ?? []);
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
  const selectedService = services.find((s) => s.label === decodedServiceLabel);
  const handleServiceAction = useCallback(
    (label: string, action: "start" | "stop" | "restart") => {
      void handleAction(label, action);
    },
    [handleAction],
  );
  const handleIgnore = useCallback(
    async (label: string) => {
      setActionKey(`${label}:ignore`);
      try {
        const nextIgnoredLabels = Array.from(
          new Set([...ignoredLabels, label]),
        ).sort();
        const res = await apiFetch("/api/settings/launchctl-ignored/", {
          method: "PATCH",
          body: JSON.stringify({ ignored_labels: nextIgnoredLabels }),
        });
        if (!res.ok) {
          setError(
            await extractErrorMessage(
              res,
              `Unable to ignore launchctl service: ${res.status}`,
            ),
          );
          setActionKey(null);
          return;
        }
        const data = (await res.json()) as IgnoredLaunchctlLabelsResponse;
        setIgnoredLabels(data.ignored_labels);
        setServices((current) => current.filter((svc) => svc.label !== label));
        navigate("/dashboard/launchctl");
      } catch {
        setError("Unable to reach the local API.");
      }
      setActionKey(null);
    },
    [ignoredLabels, navigate],
  );

  if (isDetail) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="-ml-2 h-7 px-2 text-[12px]"
              >
                <Link to="/dashboard/launchctl">
                  <ArrowLeft className="h-3 w-3" />
                  Launchctl
                </Link>
              </Button>
              <div className="mt-2 flex min-w-0 items-center gap-2">
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    selectedService ? runtimeDot(selectedService) : "bg-muted-foreground/40"
                  }`}
                />
                <h1 className="min-w-0 truncate font-mono text-base font-semibold tracking-tight text-foreground">
                  {decodedServiceLabel}
                </h1>
                {selectedService?.is_openbase_managed ? (
                  <span className="shrink-0 font-mono text-[10px] text-info">
                    openbase
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                {selectedService ? runtimeLabel(selectedService) : "LaunchAgent"}
                {selectedService?.plist_path ? (
                  <span className="mt-0.5 block break-all font-mono text-[11px] sm:ml-2 sm:mt-0 sm:inline">
                    {selectedService.plist_path}
                  </span>
                ) : null}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {selectedService ? (
                <ServiceActions
                  service={selectedService}
                  actionKey={actionKey}
                  onAction={handleServiceAction}
                />
              ) : null}
              {selectedService ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-fit px-2.5 text-[12px]"
                      disabled={loading || actionKey !== null}
                    >
                      <EyeOff className="h-3 w-3" />
                      Ignore
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Ignore LaunchAgent?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will hide the item from the normal Launch Control list.
                        Ignored items can be edited later in Settings.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          void handleIgnore(selectedService.label);
                        }}
                      >
                        Ignore item
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : null}
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-fit px-2.5 text-[12px]"
                onClick={fetchServices}
                disabled={loading || actionKey !== null}
              >
                <RefreshCw
                  className={`h-3 w-3 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>
          </div>

          {error ? (
            <div className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
              {error}
            </div>
          ) : null}

          {loading && !selectedService ? (
            <div className="text-[12px] text-muted-foreground">Loading…</div>
          ) : !selectedService ? (
            <div className="rounded border border-dashed border-border bg-surface px-4 py-6 text-center">
              <Server className="mx-auto h-4 w-4 text-muted-foreground/40" />
              <p className="mt-2 text-[12px] text-muted-foreground">
                LaunchAgent not found.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <section className="rounded border border-border bg-surface p-3">
                <dl className="grid min-w-0 grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                  <DetailField label="Runtime" value={runtimeLabel(selectedService)} />
                  <DetailField label="PID" value={selectedService.pid} />
                  <DetailField label="Status" value={selectedService.status} />
                  <DetailField label="Loaded" value={selectedService.loaded} />
                  <DetailField label="Running" value={selectedService.running} />
                  <DetailField label="Disabled" value={selectedService.disabled} />
                  <DetailField label="Run at load" value={selectedService.run_at_load} />
                  <DetailField label="Keep alive" value={selectedService.keep_alive} />
                  <DetailField
                    label="Openbase managed"
                    value={selectedService.is_openbase_managed}
                  />
                </dl>
              </section>

              <section className="rounded border border-border bg-surface">
                <div className="border-b border-border px-3 py-2">
                  <h2 className="text-[12px] font-medium text-foreground">
                    Service metadata
                  </h2>
                </div>
                <dl className="grid min-w-0 grid-cols-1 gap-2 p-3 md:grid-cols-2">
                  <DetailField label="Plist" value={selectedService.plist_path} />
                  <DetailField
                    label="Working directory"
                    value={selectedService.working_directory}
                  />
                  <DetailField label="Program" value={selectedService.program} />
                  <DetailField label="Command" value={selectedService.command} />
                </dl>
              </section>

              <section className="rounded border border-border bg-surface">
                <div className="border-b border-border px-3 py-2">
                  <h2 className="text-[12px] font-medium text-foreground">
                    Program arguments
                  </h2>
                </div>
                {selectedService.program_arguments.length === 0 ? (
                  <p className="px-3 py-3 text-[12px] text-muted-foreground">
                    No program arguments reported.
                  </p>
                ) : (
                  <div className="divide-y divide-border">
                    {selectedService.program_arguments.map((arg, idx) => (
                      <div
                        key={`${selectedService.label}:arg:${idx}`}
                        className="grid min-w-0 grid-cols-[42px_minmax(0,1fr)] gap-2 px-3 py-2"
                      >
                        <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                          {idx}
                        </span>
                        <span className="break-all font-mono text-[11px] text-foreground/80">
                          {arg}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {selectedService.plist_error ? (
                <section className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2">
                  <h2 className="text-[12px] font-medium text-destructive">
                    Plist error
                  </h2>
                  <p className="mt-1 break-all text-[11px] text-destructive">
                    {selectedService.plist_error}
                  </p>
                </section>
              ) : null}
            </div>
          )}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <ResourcePageHeader
          title="launchctl"
          loading={loading}
          refreshDisabled={actionKey !== null}
          onRefresh={fetchServices}
          subtitle={
            <>
              {runningCount}/{services.length} running · {openbaseCount} openbase
              · <span className="font-mono">~/Library/LaunchAgents</span>
            </>
          }
        />

        <ResourceError message={error} />

        {loading && services.length === 0 ? (
          <ResourceLoading>Loading…</ResourceLoading>
        ) : services.length === 0 ? (
          <ResourceEmptyState icon={Server}>No LaunchAgents.</ResourceEmptyState>
        ) : (
          <div className="overflow-hidden rounded border border-border bg-surface">
            {services.map((svc, idx) => (
              <div
                key={svc.label}
                role="link"
                tabIndex={0}
                onClick={() => navigate(servicePath(svc.label))}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    navigate(servicePath(svc.label));
                  }
                }}
                className={`grid cursor-pointer grid-cols-1 gap-2 px-3 py-2 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:grid-cols-[minmax(0,1.25fr)_minmax(0,0.8fr)_auto_24px] md:items-center ${
                  idx > 0 ? "border-t border-border" : ""
                }`}
              >
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${runtimeDot(svc)}`}
                    />
                    <span className="min-w-0 truncate font-mono text-[12.5px] font-medium text-foreground">
                      {svc.label}
                    </span>
                    {svc.is_openbase_managed ? (
                      <span className="shrink-0 font-mono text-[10px] text-info">
                        openbase
                      </span>
                    ) : null}
                    {svc.disabled ? (
                      <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                        disabled
                      </span>
                    ) : null}
                  </div>
                  <p
                    className="mt-0.5 truncate font-mono text-[10.5px] text-muted-foreground/70"
                    title={svc.plist_path}
                  >
                    {svc.plist_path}
                  </p>
                  {svc.plist_error ? (
                    <p className="mt-1 truncate text-[10.5px] text-destructive">
                      plist error
                    </p>
                  ) : null}
                </div>

                <div className="min-w-0">
                  {svc.command ? (
                    <p
                      className="truncate font-mono text-[11.5px] text-foreground/80"
                      title={svc.command}
                    >
                      {svc.command}
                    </p>
                  ) : (
                    <p className="text-[12px] text-muted-foreground">—</p>
                  )}
                  {svc.working_directory ? (
                    <p
                      className="mt-0.5 truncate font-mono text-[10.5px] text-muted-foreground/70"
                      title={svc.working_directory}
                    >
                      cwd: {svc.working_directory}
                    </p>
                  ) : null}
                </div>

                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[11px] md:justify-end">
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

                <ChevronRight className="hidden h-3.5 w-3.5 text-muted-foreground md:block" />
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Launchctl;
