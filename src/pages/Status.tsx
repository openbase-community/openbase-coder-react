import DashboardLayout from "@/components/layouts/ExampleLayout";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import type { ServiceStatus } from "@/types/session";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const Status = () => {
  const [services, setServices] = useState<Record<string, ServiceStatus>>({});
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    const res = await apiFetch("/api/status/");
    if (res.ok) setServices((await res.json()).services);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const locationLabel = (svc: ServiceStatus) => {
    if (svc.port != null) return `:${svc.port}`;
    if (svc.url) return "remote";
    return "—";
  };

  const entries = Object.entries(services);
  const requiredEntries = entries.filter(([, s]) => !s.optional);
  const runningCount = requiredEntries.filter(([, s]) => s.running).length;

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold tracking-tight text-foreground">
              Service status
            </h1>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {runningCount}/{requiredEntries.length} required running ·
              auto-refresh 30s
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2.5 text-[12px]"
            onClick={fetchStatus}
            disabled={loading}
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {entries.length === 0 ? (
          <div className="rounded border border-dashed border-border bg-surface px-4 py-6 text-center text-[12px] text-muted-foreground">
            No services configured.
          </div>
        ) : (
          <div className="overflow-hidden rounded border border-border bg-surface">
            {entries.map(([key, svc], idx) => (
              <div
                key={key}
                className={`flex items-center gap-2.5 px-3 py-1.5 ${
                  idx > 0 ? "border-t border-border" : ""
                }`}
              >
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    svc.running
                      ? "bg-success"
                      : svc.optional
                        ? "bg-muted-foreground/40"
                        : "bg-destructive"
                  }`}
                />
                <span className="text-[12.5px] font-medium text-foreground">
                  {svc.name}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground/70">
                  {locationLabel(svc)}
                </span>
                <span
                  className={`ml-auto font-mono text-[10.5px] ${
                    svc.running
                      ? "text-success"
                      : svc.optional
                        ? "text-muted-foreground"
                        : "text-destructive"
                  }`}
                >
                  {svc.running ? "running" : svc.optional ? "optional" : "stopped"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Status;
