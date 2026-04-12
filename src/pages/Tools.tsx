import DashboardLayout from "@/components/layouts/ExampleLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type UvToolExecutable = {
  name: string;
  path: string;
};

type EditablePackage = {
  name: string;
  version: string;
  editable_project_location: string;
};

type UvTool = {
  name: string;
  version: string;
  environment_path: string;
  required_specifier: string | null;
  python_version: string | null;
  executables: UvToolExecutable[];
  is_editable: boolean;
  editable_project_location: string | null;
  editable_packages: EditablePackage[];
  inspection_error: string | null;
};

type UvToolsResponse = {
  uv_available: boolean;
  uv_path: string | null;
  tools: UvTool[];
  error: string | null;
};

const Tools = () => {
  const [tools, setTools] = useState<UvTool[]>([]);
  const [uvPath, setUvPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTools = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await apiFetch("/api/tools/uv/");
    if (!res.ok) {
      setError(`Unable to load uv tools: ${res.status}`);
      setLoading(false);
      return;
    }
    const data = (await res.json()) as UvToolsResponse;
    setTools(data.tools);
    setUvPath(data.uv_path);
    setError(data.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchTools();
  }, [fetchTools]);

  const editableCount = tools.filter((tool) => tool.is_editable).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-light">Global Tools</h1>
            <p className="text-gray-600">uv tool install inventory</p>
            {uvPath ? <p className="mt-1 text-xs text-gray-400">{uvPath}</p> : null}
          </div>
          <Button variant="outline" onClick={fetchTools} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm text-gray-500">Installed tools</p>
            <p className="mt-2 text-2xl font-semibold">{tools.length}</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm text-gray-500">Editable tools</p>
            <p className="mt-2 text-2xl font-semibold">{editableCount}</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm text-gray-500">uv status</p>
            <p className="mt-2 text-2xl font-semibold">{error ? "Check" : "Ready"}</p>
          </div>
        </div>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-lg border bg-white">
          <div className="hidden grid-cols-[minmax(180px,1fr)_minmax(220px,1.4fr)_minmax(240px,1.6fr)] gap-4 border-b bg-gray-50 px-4 py-3 text-xs font-semibold uppercase text-gray-500 lg:grid">
            <div>Tool</div>
            <div>Executables</div>
            <div>Editable source</div>
          </div>
          {loading && tools.length === 0 ? (
            <div className="px-4 py-8 text-sm text-gray-500">Loading uv tools...</div>
          ) : tools.length === 0 ? (
            <div className="px-4 py-8 text-sm text-gray-500">No uv tools found.</div>
          ) : (
            tools.map((tool) => (
              <div
                key={tool.name}
                className="grid grid-cols-1 gap-4 border-b px-4 py-4 last:border-b-0 lg:grid-cols-[minmax(180px,1fr)_minmax(220px,1.4fr)_minmax(240px,1.6fr)]"
              >
                <div className="min-w-0">
                  <p className="mb-2 text-xs font-semibold uppercase text-gray-500 lg:hidden">
                    Tool
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-gray-900">{tool.name}</p>
                    {tool.is_editable ? (
                      <Badge variant="secondary">Editable</Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-gray-500">v{tool.version}</p>
                  {tool.python_version ? (
                    <p className="mt-1 text-xs text-gray-400">{tool.python_version}</p>
                  ) : null}
                  {tool.required_specifier ? (
                    <p className="mt-2 break-all text-xs text-gray-400">
                      {tool.required_specifier}
                    </p>
                  ) : null}
                  <p className="mt-2 break-all text-xs text-gray-400">
                    {tool.environment_path}
                  </p>
                </div>
                <div className="min-w-0 space-y-2">
                  <p className="text-xs font-semibold uppercase text-gray-500 lg:hidden">
                    Executables
                  </p>
                  {tool.executables.length === 0 ? (
                    <p className="text-sm text-gray-500">No executables reported.</p>
                  ) : (
                    tool.executables.map((executable) => (
                      <div key={`${tool.name}:${executable.path}`}>
                        <p className="text-sm font-medium text-gray-800">
                          {executable.name}
                        </p>
                        <p className="break-all text-xs text-gray-400">
                          {executable.path}
                        </p>
                      </div>
                    ))
                  )}
                </div>
                <div className="min-w-0">
                  <p className="mb-2 text-xs font-semibold uppercase text-gray-500 lg:hidden">
                    Editable source
                  </p>
                  {tool.editable_project_location ? (
                    <p className="break-all text-sm text-gray-800">
                      {tool.editable_project_location}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500">Not editable</p>
                  )}
                  {tool.editable_packages.length > 1 ? (
                    <div className="mt-3 space-y-2">
                      {tool.editable_packages.map((packageInfo) => (
                        <div
                          key={`${tool.name}:${packageInfo.name}:${packageInfo.editable_project_location}`}
                        >
                          <p className="text-xs font-medium text-gray-500">
                            {packageInfo.name} v{packageInfo.version}
                          </p>
                          <p className="break-all text-xs text-gray-400">
                            {packageInfo.editable_project_location}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {tool.inspection_error ? (
                    <p className="mt-3 break-all text-xs text-red-600">
                      {tool.inspection_error}
                    </p>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Tools;
