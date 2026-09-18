import { Panel } from "@/components/ui/panel";
import {
  ResourceEmptyState,
  ResourceLoading,
} from "@/components/resource/ResourcePage";
import type {
  BoilerSyncTemplate,
  BoilerSyncTemplateDetails,
} from "@/lib/boilersync";
import { TemplateFieldList } from "boilersync-react";
import { ChevronRight, GitBranch, ScrollText } from "lucide-react";
import { useMemo } from "react";

type TemplateBrowserProps = {
  details: BoilerSyncTemplateDetails | null;
  loading: boolean;
  onSelect: (templateRef: string) => void;
  selectedTemplate: string | null;
  templates: BoilerSyncTemplate[];
};

export function TemplateBrowser({
  details,
  loading,
  onSelect,
  selectedTemplate,
  templates,
}: TemplateBrowserProps) {
  const groupedTemplates = useMemo(() => {
    const groups = new Map<string, BoilerSyncTemplate[]>();
    for (const template of templates) {
      const key = `${template.org}/${template.repo}`;
      groups.set(key, [...(groups.get(key) ?? []), template]);
    }
    return Array.from(groups.entries());
  }, [templates]);

  const fieldCount =
    (details?.variables?.length ?? 0) + (details?.options?.length ?? 0);

  if (loading && templates.length === 0) {
    return <ResourceLoading>Loading...</ResourceLoading>;
  }

  if (templates.length === 0) {
    return (
      <ResourceEmptyState icon={ScrollText}>
        No templates found.
      </ResourceEmptyState>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)]">
      <Panel>
        {groupedTemplates.map(([source, sourceTemplates], groupIdx) => (
          <div
            className={groupIdx > 0 ? "border-t border-border" : ""}
            key={source}
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
                className={`grid w-full min-w-0 grid-cols-[minmax(0,1fr)_20px] items-center gap-2 border-t border-border px-3 py-2 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  selectedTemplate === template.template_ref ? "bg-muted/50" : ""
                }`}
                key={template.template_ref}
                onClick={() => onSelect(template.template_ref)}
                type="button"
              >
                <span className="min-w-0 truncate text-[12.5px] font-medium text-foreground">
                  {template.subdir}
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            ))}
          </div>
        ))}
      </Panel>

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
              compact
              fields={details.variables ?? []}
              title="Variables"
            />
            <TemplateFieldList
              compact
              fields={details.options ?? []}
              title="Options"
            />
          </div>
        ) : (
          <div className="px-3 py-6 text-center text-[12px] text-muted-foreground">
            Select a template to view inputs.
          </div>
        )}
      </div>
    </div>
  );
}
