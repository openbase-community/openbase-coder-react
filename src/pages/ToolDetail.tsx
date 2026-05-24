import DashboardLayout from "@/components/layouts/ExampleLayout";
import { Button } from "@/components/ui/button";
import {
  fetchUvToolHelp,
  uninstallUvTool,
  type UvToolExecutable,
  type UvToolHelpResponse,
} from "@/lib/uv-tools";
import { useUvTools } from "@/lib/useUvTools";
import { ArrowLeft, CircleHelp, RefreshCw, Trash2, Wrench } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

const DetailField = ({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) => (
  <div className="min-w-0 rounded border border-border bg-background px-3 py-2">
    <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      {label}
    </dt>
    <dd className="mt-1 break-all font-mono text-[11px] text-foreground/80">
      {value || "—"}
    </dd>
  </div>
);

type HelpState = {
  loading: boolean;
  response: UvToolHelpResponse | null;
  error: string | null;
};

const ToolDetail = () => {
  const { toolName = "" } = useParams();
  const navigate = useNavigate();
  const decodedToolName = toolName;

  const {
    tools,
    uvPath,
    error,
    loading,
    fetchTools,
    setTools,
    setUvPath,
    setError,
  } = useUvTools();
  const [uninstalling, setUninstalling] = useState(false);
  const [helpByExecutable, setHelpByExecutable] = useState<
    Record<string, HelpState>
  >({});

  const tool = tools.find((candidate) => candidate.name === decodedToolName);

  const executableKey = (executable: UvToolExecutable) =>
    `${executable.name}:${executable.path}`;

  const handleLoadHelp = async (executable: UvToolExecutable) => {
    if (!tool) return;
    const key = executableKey(executable);
    setHelpByExecutable((current) => ({
      ...current,
      [key]: {
        loading: true,
        response: current[key]?.response ?? null,
        error: null,
      },
    }));

    try {
      const response = await fetchUvToolHelp(tool.name, executable.name);
      setHelpByExecutable((current) => ({
        ...current,
        [key]: { loading: false, response, error: null },
      }));
    } catch (err) {
      setHelpByExecutable((current) => ({
        ...current,
        [key]: {
          loading: false,
          response: null,
          error:
            err instanceof Error ? err.message : "Unable to load help output.",
        },
      }));
    }
  };

  const handleUninstall = async () => {
    if (!tool || uninstalling) return;

    const confirmed = window.confirm(
      `Uninstall the uv tool "${tool.name}"? This removes the global tool environment and executables.`,
    );
    if (!confirmed) return;

    setUninstalling(true);
    setError(null);
    try {
      const data = await uninstallUvTool(tool.name);
      setTools(data.tools);
      setUvPath(data.uv_path);
      setError(data.error);
      toast.success(`Uninstalled ${tool.name}`);
      navigate("/dashboard/tools");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to uninstall uv tool.";
      setError(message);
      toast.error(message);
    }
    setUninstalling(false);
  };

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
              <Link to="/dashboard/tools">
                <ArrowLeft className="h-3 w-3" />
                Tools
              </Link>
            </Button>
            <div className="mt-2 flex min-w-0 items-center gap-2">
              <Wrench className="h-4 w-4 shrink-0 text-muted-foreground" />
              <h1 className="min-w-0 truncate text-base font-semibold tracking-tight text-foreground">
                {decodedToolName}
              </h1>
              {tool?.is_editable ? (
                <span className="shrink-0 font-mono text-[10px] text-info">
                  editable
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {tool ? `v${tool.version}` : "uv tool"}
              {uvPath ? (
                <span className="ml-2 font-mono text-[11px]">{uvPath}</span>
              ) : null}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {tool ? (
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-fit px-2.5 text-[12px] text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={handleUninstall}
                disabled={loading || uninstalling}
              >
                <Trash2 className="h-3 w-3" />
                {uninstalling ? "Uninstalling" : "Uninstall"}
              </Button>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-fit px-2.5 text-[12px]"
              onClick={fetchTools}
              disabled={loading || uninstalling}
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

        {loading && !tool ? (
          <div className="text-[12px] text-muted-foreground">Loading…</div>
        ) : !tool ? (
          <div className="rounded border border-dashed border-border bg-surface px-4 py-6 text-center">
            <p className="text-[12px] text-muted-foreground">
              Tool not found.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <section className="rounded border border-border bg-surface p-3">
              <dl className="grid min-w-0 grid-cols-1 gap-2 md:grid-cols-2">
                <DetailField label="Environment" value={tool.environment_path} />
                <DetailField
                  label="Required specifier"
                  value={tool.required_specifier}
                />
                <DetailField label="Python" value={tool.python_version} />
                <DetailField
                  label="Editable project"
                  value={tool.editable_project_location}
                />
              </dl>
            </section>

            <section className="rounded border border-border bg-surface">
              <div className="border-b border-border px-3 py-2">
                <h2 className="text-[12px] font-medium text-foreground">
                  Executables
                </h2>
              </div>
              <div className="divide-y divide-border">
                {tool.executables.length === 0 ? (
                  <p className="px-3 py-3 text-[12px] text-muted-foreground">
                    No executables reported.
                  </p>
                ) : (
                  tool.executables.map((executable) => {
                    const helpState =
                      helpByExecutable[executableKey(executable)];
                    const output = [
                      helpState?.response?.stdout,
                      helpState?.response?.stderr,
                    ]
                      .filter(Boolean)
                      .join("\n");

                    return (
                      <div
                        key={`${tool.name}:${executable.path}`}
                        className="grid min-w-0 grid-cols-1 gap-1 px-3 py-2 md:grid-cols-[minmax(0,180px)_minmax(0,1fr)_auto] md:items-center"
                      >
                        <span className="min-w-0 truncate font-mono text-[12px] font-medium text-foreground">
                          {executable.name}
                        </span>
                        <span className="break-all font-mono text-[11px] text-muted-foreground">
                          {executable.path}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 w-fit px-2 text-[12px]"
                          disabled={Boolean(helpState?.loading)}
                          onClick={() => void handleLoadHelp(executable)}
                        >
                          <CircleHelp className="h-3 w-3" />
                          {helpState?.loading ? "Loading" : "Help"}
                        </Button>
                        {helpState?.error ? (
                          <div className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive md:col-span-3">
                            {helpState.error}
                          </div>
                        ) : helpState?.response ? (
                          <div className="min-w-0 rounded border border-border bg-background md:col-span-3">
                            <div className="border-b border-border px-3 py-1.5 font-mono text-[10.5px] text-muted-foreground">
                              {executable.name} --help
                              {helpState.response.return_code !== 0 ? (
                                <span className="ml-2 text-warning">
                                  exit {helpState.response.return_code}
                                </span>
                              ) : null}
                              {helpState.response.error ? (
                                <span className="ml-2 text-warning">
                                  {helpState.response.error}
                                </span>
                              ) : null}
                            </div>
                            <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap break-words px-3 py-2 font-mono text-[11px] leading-relaxed text-foreground">
                              {output || "No help output."}
                            </pre>
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            {tool.editable_packages.length > 0 ? (
              <section className="rounded border border-border bg-surface">
                <div className="border-b border-border px-3 py-2">
                  <h2 className="text-[12px] font-medium text-foreground">
                    Editable packages
                  </h2>
                </div>
                <div className="divide-y divide-border">
                  {tool.editable_packages.map((pkg) => (
                    <div
                      key={`${tool.name}:${pkg.name}:${pkg.editable_project_location}`}
                      className="grid min-w-0 grid-cols-1 gap-1 px-3 py-2 md:grid-cols-[minmax(0,180px)_minmax(0,1fr)]"
                    >
                      <span className="min-w-0 truncate font-mono text-[12px] font-medium text-foreground">
                        {pkg.name} v{pkg.version}
                      </span>
                      <span className="break-all font-mono text-[11px] text-muted-foreground">
                        {pkg.editable_project_location}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {tool.inspection_error ? (
              <section className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2">
                <h2 className="text-[12px] font-medium text-destructive">
                  Inspection error
                </h2>
                <p className="mt-1 break-all text-[11px] text-destructive">
                  {tool.inspection_error}
                </p>
              </section>
            ) : null}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ToolDetail;
