import DashboardLayout from "@/components/layouts/ExampleLayout";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { RefreshCw, Wrench } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type UvToolExecutable = { name: string; path: string };
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

const Tools = () => {
  const [tools, setTools] = useState<UvTool[]>([]);
  const [uvPath, setUvPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTools = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/tools/uv/");
      if (!res.ok) {
        setError(
          await extractErrorMessage(
            res,
            `Unable to load uv tools: ${res.status}`,
          ),
        );
        setLoading(false);
        return;
      }
      const data = (await res.json()) as UvToolsResponse;
      setTools(data.tools);
      setUvPath(data.uv_path);
      setError(data.error);
    } catch {
      setError("Unable to reach the local API.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchTools();
  }, [fetchTools]);

  const editableCount = tools.filter((t) => t.is_editable).length;

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold tracking-tight text-foreground">
              uv tools
            </h1>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {tools.length} installed · {editableCount} editable
              {uvPath ? (
                <span className="ml-2 font-mono text-[11px]">{uvPath}</span>
              ) : null}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2.5 text-[12px]"
            onClick={fetchTools}
            disabled={loading}
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

        {loading && tools.length === 0 ? (
          <div className="text-[12px] text-muted-foreground">Loading…</div>
        ) : tools.length === 0 ? (
          <div className="rounded border border-dashed border-border bg-surface px-4 py-6 text-center">
            <Wrench className="mx-auto h-4 w-4 text-muted-foreground/40" />
            <p className="mt-2 text-[12px] text-muted-foreground">
              No uv tools.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded border border-border bg-surface">
            {tools.map((tool, idx) => (
              <div
                key={tool.name}
                className={`grid grid-cols-1 gap-3 px-3 py-2 lg:grid-cols-[minmax(160px,1fr)_minmax(200px,1.4fr)_minmax(200px,1.6fr)] ${
                  idx > 0 ? "border-t border-border" : ""
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12.5px] font-medium text-foreground">
                      {tool.name}
                    </span>
                    {tool.is_editable ? (
                      <span className="font-mono text-[10px] text-info">
                        editable
                      </span>
                    ) : null}
                    <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                      v{tool.version}
                    </span>
                  </div>
                  {tool.python_version ? (
                    <p className="mt-0.5 font-mono text-[10.5px] text-muted-foreground/70">
                      {tool.python_version}
                    </p>
                  ) : null}
                  {tool.required_specifier ? (
                    <p className="mt-0.5 break-all font-mono text-[10.5px] text-muted-foreground/70">
                      {tool.required_specifier}
                    </p>
                  ) : null}
                  <p className="mt-0.5 break-all font-mono text-[10.5px] text-muted-foreground/60">
                    {tool.environment_path}
                  </p>
                </div>

                <div className="min-w-0 space-y-0.5">
                  {tool.executables.length === 0 ? (
                    <p className="text-[12px] text-muted-foreground">—</p>
                  ) : (
                    tool.executables.map((executable) => (
                      <div key={`${tool.name}:${executable.path}`}>
                        <span className="font-mono text-[12px] font-medium text-foreground">
                          {executable.name}
                        </span>
                        <p className="break-all font-mono text-[10.5px] text-muted-foreground/60">
                          {executable.path}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                <div className="min-w-0">
                  {tool.editable_project_location ? (
                    <p className="break-all font-mono text-[12px] text-foreground/80">
                      {tool.editable_project_location}
                    </p>
                  ) : (
                    <p className="text-[12px] text-muted-foreground">—</p>
                  )}
                  {tool.editable_packages.length > 1 ? (
                    <div className="mt-1 space-y-1">
                      {tool.editable_packages.map((pkg) => (
                        <div
                          key={`${tool.name}:${pkg.name}:${pkg.editable_project_location}`}
                        >
                          <span className="font-mono text-[10.5px] text-muted-foreground">
                            {pkg.name} v{pkg.version}
                          </span>
                          <p className="break-all font-mono text-[10.5px] text-muted-foreground/60">
                            {pkg.editable_project_location}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {tool.inspection_error ? (
                    <p className="mt-1 break-all text-[10.5px] text-destructive">
                      {tool.inspection_error}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Tools;
