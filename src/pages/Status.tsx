import DashboardLayout from "@/components/layouts/ExampleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import type { ServiceStatus } from "@/types/session";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const Status = () => {
  const [services, setServices] = useState<Record<string, ServiceStatus>>({});
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    const res = await apiFetch("/api/status/");
    if (res.ok) {
      const data = await res.json();
      setServices(data.services);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const locationLabel = (svc: ServiceStatus) => {
    if (svc.port != null) return `Port ${svc.port}`;
    if (svc.url) return "Remote endpoint";
    return "Endpoint";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-light mb-2">Service Status</h1>
            <p className="text-gray-600">Monitor related services</p>
          </div>
          <button
            onClick={fetchStatus}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {Object.entries(services).map(([key, svc]) => (
            <Card key={key}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3 text-base">
                  <span
                    className={`h-3 w-3 rounded-full ${
                      svc.running ? "bg-green-500" : "bg-red-500"
                    }`}
                  />
                  {svc.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-500">
                  {locationLabel(svc)} &mdash;{" "}
                  <span
                    className={
                      svc.running ? "text-green-600" : "text-red-600"
                    }
                  >
                    {svc.running ? "Running" : "Stopped"}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Status;
