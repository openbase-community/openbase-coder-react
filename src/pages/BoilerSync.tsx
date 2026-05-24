import DashboardLayout from "@/components/layouts/ExampleLayout";
import { Button } from "@/components/ui/button";
import {
  ResourceEmptyState,
  ResourceError,
  ResourceLoading,
  ResourcePageHeader,
} from "@/components/resource/ResourcePage";
import {
  fetchBoilerSyncTemplates,
  type BoilerSyncTemplate,
  type BoilerSyncTemplateDetails,
} from "@/lib/boilersync";
import { TemplateFieldList } from "boilersync-react";
import { ChevronRight, GitBranch, ScrollText } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const BoilerSync = () => {
  const [templates, setTemplates] = useState<BoilerSyncTemplate[]>([]);
  const [details, setDetails] = useState<BoilerSyncTemplateDetails | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [sourceCount, setSourceCount] = useState(0);
  const [rootDir, setRootDir] = useState<string | null>(null);
  const [boilersyncPath, setBoilersyncPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = useCallback(async (templateRef?: string) => {
    setLoading(true);
    try {
      const data = await fetchBoilerSyncTemplates(templateRef);
      setTemplates(data.templates?.templates ?? []);
      setDetails(data.details);
      setSourceCount(data.sources?.sources?.length ?? 0);
      setRootDir(data.templates?.template_root_dir ?? data.sources?.template_root_dir ?? null);
      setBoilersyncPath(data.boilersync_path);
      setError(data.error);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to reach the local API.",
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchTemplates();
  }, [fetchTemplates]);

  const groupedTemplates = useMemo(() => {
    const groups = new Map<string, BoilerSyncTemplate[]>();
    for (const template of templates) {
      const key = `${template.org}/${template.repo}`;
      groups.set(key, [...(groups.get(key) ?? []), template]);
    }
    return Array.from(groups.entries());
  }, [templates]);

  const selectTemplate = (templateRef: string) => {
    setSelectedTemplate(templateRef);
    void fetchTemplates(templateRef);
  };

  const fieldCount =
    (details?.variables?.length ?? 0) + (details?.options?.length ?? 0);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <ResourcePageHeader
          title="BoilerSync"
          loading={loading}
          onRefresh={() => fetchTemplates(selectedTemplate ?? undefined)}
          subtitle={
            <span className="block truncate">
              {templates.length} templates · {sourceCount} sources
              {rootDir ? <span className="ml-2 font-mono text-[11px]">{rootDir}</span> : null}
            </span>
          }
        />

        <ResourceError message={error} />

        {boilersyncPath ? (
          <div className="rounded border border-border bg-muted/30 px-3 py-2 font-mono text-[11px] text-muted-foreground">
            {boilersyncPath}
          </div>
        ) : null}

        {loading && templates.length === 0 ? (
          <ResourceLoading>Loading...</ResourceLoading>
        ) : templates.length === 0 ? (
          <ResourceEmptyState icon={ScrollText}>
            No BoilerSync templates found.
          </ResourceEmptyState>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)]">
            <div className="overflow-hidden rounded border border-border bg-surface">
              {groupedTemplates.map(([source, sourceTemplates], groupIdx) => (
                <div
                  key={source}
                  className={groupIdx > 0 ? "border-t border-border" : ""}
                >
                  <div className="flex items-center gap-2 bg-muted/30 px-3 py-2">
                    <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-[12px] font-medium text-foreground">
                      {source}
                    </span>
                    <span className="ml-auto font-mono text-[10.5px] text-muted-foreground">
                      {sourceTemplates.length}
                    </span>
                  </div>
                  {sourceTemplates.map((template) => (
                    <button
                      key={template.template_ref}
                      type="button"
                      onClick={() => selectTemplate(template.template_ref)}
                      className={`grid w-full min-w-0 grid-cols-[minmax(0,1fr)_20px] items-center gap-2 border-t border-border px-3 py-2 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        selectedTemplate === template.template_ref ? "bg-muted/50" : ""
                      }`}
                    >
                      <span className="min-w-0 truncate text-[12.5px] font-medium text-foreground">
                        {template.subdir}
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              ))}
            </div>

            <div className="rounded border border-border bg-surface">
              <div className="border-b border-border px-3 py-2">
                <h2 className="text-[12.5px] font-medium text-foreground">
                  Template details
                </h2>
                <p className="mt-0.5 truncate font-mono text-[10.5px] text-muted-foreground">
                  {details?.template_ref ?? "Select a template"}
                </p>
              </div>
              {details ? (
                <div className="space-y-3 px-3 py-3">
                  <div className="text-[12px] text-muted-foreground">
                    {fieldCount} inputs ·{" "}
                    <span className="font-mono">{details.template_dir}</span>
                  </div>
                  <TemplateFieldList
                    title="Variables"
                    fields={details.variables ?? []}
                    compact
                  />
                  <TemplateFieldList
                    title="Options"
                    fields={details.options ?? []}
                    compact
                  />
                </div>
              ) : (
                <div className="px-3 py-6 text-center text-[12px] text-muted-foreground">
                  Select a template to view inputs.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default BoilerSync;
