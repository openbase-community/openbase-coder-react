import DashboardLayout from "@/components/layouts/ExampleLayout";
import { Button } from "@/components/ui/button";
import { fetchUvTools, type UvTool } from "@/lib/uv-tools";
import { ChevronRight, RefreshCw, Wrench } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

const Tools = () => {
  const [tools, setTools] = useState<UvTool[]>([]);
  const [uvPath, setUvPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTools = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchUvTools();
      setTools(data.tools);
      setUvPath(data.uv_path);
      setError(data.error);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to reach the local API.",
      );
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
              <Link
                key={tool.name}
                to={`/dashboard/tools/${encodeURIComponent(tool.name)}`}
                className={`grid min-w-0 grid-cols-1 gap-2 px-3 py-2 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)_minmax(96px,140px)_24px] md:items-center ${
                  idx > 0 ? "border-t border-border" : ""
                }`}
              >
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span
                      className="min-w-0 truncate text-[12.5px] font-medium text-foreground"
                      title={tool.name}
                    >
                      {tool.name}
                    </span>
                    {tool.is_editable ? (
                      <span className="shrink-0 font-mono text-[10px] text-info">
                        editable
                      </span>
                    ) : null}
                    <span className="shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums">
                      v{tool.version}
                    </span>
                  </div>
                  <p
                    className="mt-0.5 truncate font-mono text-[10.5px] text-muted-foreground/60"
                    title={tool.environment_path}
                  >
                    {tool.environment_path}
                  </p>
                </div>

                <div className="min-w-0">
                  {tool.executables.length === 0 ? (
                    <p className="text-[12px] text-muted-foreground">—</p>
                  ) : (
                    <div className="flex min-w-0 flex-wrap gap-1">
                      {tool.executables.slice(0, 3).map((executable) => (
                        <span
                          key={`${tool.name}:${executable.path}`}
                          className="max-w-[11rem] truncate rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[11px] text-foreground"
                          title={`${executable.name}: ${executable.path}`}
                        >
                          {executable.name}
                        </span>
                      ))}
                      {tool.executables.length > 3 ? (
                        <span className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                          +{tool.executables.length - 3}
                        </span>
                      ) : null}
                    </div>
                  )}
                </div>

                <div className="flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground md:justify-end">
                  {tool.python_version ? (
                    <span
                      className="truncate font-mono"
                      title={tool.python_version}
                    >
                      {tool.python_version}
                    </span>
                  ) : null}
                  {tool.inspection_error ? (
                    <span className="shrink-0 text-destructive">error</span>
                  ) : null}
                </div>

                <ChevronRight className="hidden h-3.5 w-3.5 text-muted-foreground md:block" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Tools;
