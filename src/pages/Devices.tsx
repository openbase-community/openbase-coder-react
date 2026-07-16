import DashboardLayout from "@/components/layouts/DashboardLayout";
import {
  ResourceEmptyState,
  ResourceError,
  ResourceLoading,
  ResourcePageHeader,
} from "@/components/resource/ResourcePage";
import { apiFetch } from "@/lib/api";
import { Monitor } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type TailnetDevice = {
  name: string;
  host: string;
  dns_name: string | null;
  ip: string | null;
  online: boolean;
  os: string | null;
  openbase_url: string | null;
  openbase_available: boolean;
  probe_error: string | null;
};

type DevicesPayload = {
  tailscale_available: boolean;
  devices: TailnetDevice[];
  openbase_devices: TailnetDevice[];
  error: string | null;
};

const Devices = () => {
  const [payload, setPayload] = useState<DevicesPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/devices/");
      if (!res.ok) {
        throw new Error(`Unable to load devices: HTTP ${res.status}`);
      }
      const data = (await res.json()) as DevicesPayload;
      setPayload(data);
      setError(data.error);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to reach the local API.",
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchDevices();
  }, [fetchDevices]);

  const openbaseDevices = payload?.openbase_devices ?? [];
  const allDevices = payload?.devices ?? [];
  const offlineCount = useMemo(
    () => allDevices.filter((device) => !device.online).length,
    [allDevices],
  );

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <ResourcePageHeader
          title="Devices"
          loading={loading}
          onRefresh={fetchDevices}
          subtitle={
            <>
              {openbaseDevices.length} Openbase host
              {openbaseDevices.length === 1 ? "" : "s"} · {allDevices.length} tailnet
              device{allDevices.length === 1 ? "" : "s"}
              {offlineCount > 0 ? ` · ${offlineCount} offline` : ""}
            </>
          }
        />

        <ResourceError message={error} />

        {loading && !payload ? (
          <ResourceLoading>Scanning tailnet…</ResourceLoading>
        ) : openbaseDevices.length === 0 ? (
          <ResourceEmptyState icon={Monitor}>
            No Openbase Coder hosts found on the tailnet.
          </ResourceEmptyState>
        ) : (
          <div className="overflow-hidden rounded border border-border bg-surface">
            {openbaseDevices.map((device, idx) => (
              <div
                key={device.host}
                className={`grid min-w-0 grid-cols-1 gap-2 px-3 py-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_minmax(80px,120px)] md:items-center ${
                  idx > 0 ? "border-t border-border" : ""
                }`}
              >
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-success" />
                    <span
                      className="min-w-0 truncate text-[12.5px] font-medium text-foreground"
                      title={device.name}
                    >
                      {device.name}
                    </span>
                    {device.os ? (
                      <span className="shrink-0 font-mono text-[10.5px] text-muted-foreground">
                        {device.os}
                      </span>
                    ) : null}
                  </div>
                  <p
                    className="mt-0.5 truncate font-mono text-[10.5px] text-muted-foreground/60"
                    title={device.ip ?? ""}
                  >
                    {device.ip ?? "no tailnet IP"}
                  </p>
                </div>

                <div className="min-w-0">
                  <p
                    className="truncate font-mono text-[11.5px] text-foreground"
                    title={device.host}
                  >
                    {device.host}
                  </p>
                  <p
                    className="mt-0.5 truncate font-mono text-[10.5px] text-muted-foreground/60"
                    title={device.openbase_url ?? ""}
                  >
                    {device.openbase_url ?? "Openbase URL unavailable"}
                  </p>
                </div>

                <div className="font-mono text-[10.5px] text-success md:text-right">
                  hosting
                </div>
              </div>
            ))}
          </div>
        )}

        {allDevices.length > openbaseDevices.length ? (
          <div className="space-y-2">
            <h2 className="text-[12px] font-medium text-muted-foreground">
              Other tailnet devices
            </h2>
            <div className="overflow-hidden rounded border border-border bg-surface/60">
              {allDevices
                .filter((device) => !device.openbase_available)
                .map((device, idx) => (
                  <div
                    key={device.host}
                    className={`flex min-w-0 items-center gap-2 px-3 py-1.5 ${
                      idx > 0 ? "border-t border-border" : ""
                    }`}
                  >
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        device.online ? "bg-muted-foreground/50" : "bg-destructive"
                      }`}
                    />
                    <span className="min-w-0 truncate text-[12px] text-foreground">
                      {device.name}
                    </span>
                    <span className="min-w-0 truncate font-mono text-[10.5px] text-muted-foreground">
                      {device.host}
                    </span>
                    <span className="ml-auto shrink-0 font-mono text-[10.5px] text-muted-foreground">
                      {device.online ? "no openbase" : "offline"}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
};

export default Devices;
