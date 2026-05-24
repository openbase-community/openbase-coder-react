import { Button } from "@/components/ui/button";
import { Play, RefreshCw, Square } from "lucide-react";
import React from "react";
import type { OpenbaseServicesController } from "./useOpenbaseServices";

type Props = {
  controller: OpenbaseServicesController;
};

export const OpenbaseServicesSettings: React.FC<Props> = ({ controller }) => {
  const {
    services,
    loading,
    error,
    actionKey,
    refresh,
    runServiceAction,
    restartAll,
  } = controller;

  return (
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
              void restartAll();
            }}
            disabled={loading || actionKey !== null}
            title="Restart all Openbase-managed services"
          >
            <RefreshCw
              className={`h-3 w-3 ${actionKey === "__all__:restart" ? "animate-spin" : ""}`}
            />
            {actionKey === "__all__:restart" ? "Restarting…" : "Restart all"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2.5 text-[12px]"
            onClick={refresh}
            disabled={loading || actionKey !== null}
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>
      {error ? (
        <div className="border-b border-border px-3 py-2 text-[12px] text-destructive">
          {error}
        </div>
      ) : null}
      {loading && services.length === 0 ? (
        <div className="px-3 py-3 text-[12px] text-muted-foreground">
          Loading…
        </div>
      ) : services.length === 0 ? (
        <div className="px-3 py-3 text-[12px] text-muted-foreground">
          No Openbase-managed services found.
        </div>
      ) : (
        <div className="divide-y divide-border">
          {services.map((service) => (
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
                      {service.port != null ? `:${service.port}` : "launchd"}
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
                    void runServiceAction(service.name, "start");
                  }}
                  disabled={actionKey !== null}
                  title={`Start ${service.description}`}
                >
                  <Play className="h-3 w-3" />
                  {actionKey === `${service.name}:start` ? "…" : "Start"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-[12px]"
                  onClick={() => {
                    void runServiceAction(service.name, "stop");
                  }}
                  disabled={actionKey !== null}
                  title={`Stop ${service.description}`}
                >
                  <Square className="h-3 w-3" />
                  {actionKey === `${service.name}:stop` ? "…" : "Stop"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-[12px]"
                  onClick={() => {
                    void runServiceAction(service.name, "restart");
                  }}
                  disabled={actionKey !== null}
                  title={`Restart ${service.description}`}
                >
                  <RefreshCw className="h-3 w-3" />
                  {actionKey === `${service.name}:restart` ? "…" : "Restart"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
