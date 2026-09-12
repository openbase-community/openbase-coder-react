import DashboardLayout from "@/components/layouts/DashboardLayout";
import {
  ResourceError,
  ResourcePageHeader,
} from "@/components/resource/ResourcePage";
import {
  addBoilerSyncSource,
  fetchBoilerSyncTemplates,
  removeBoilerSyncSource,
  setBoilerSyncFeaturedPromptDismissed,
  type BoilerSyncSource,
  type BoilerSyncTemplate,
  type BoilerSyncTemplateDetails,
  type BoilerSyncTemplatesResponse,
} from "@/lib/boilersync";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { FeaturedTemplateSource } from "./boilersync/FeaturedTemplateSource";
import { TemplateBrowser } from "./boilersync/TemplateBrowser";
import { TemplateRepositoryManager } from "./boilersync/TemplateRepositoryManager";

const BoilerSync = () => {
  const [templates, setTemplates] = useState<BoilerSyncTemplate[]>([]);
  const [sources, setSources] = useState<BoilerSyncSource[]>([]);
  const [details, setDetails] = useState<BoilerSyncTemplateDetails | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [featuredSource, setFeaturedSource] = useState<
    BoilerSyncTemplatesResponse["featured_source"] | null
  >(null);
  const [rootDir, setRootDir] = useState<string | null>(null);
  const [boilersyncPath, setBoilersyncPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [repoUrl, setRepoUrl] = useState("");
  const [addingSource, setAddingSource] = useState(false);
  const [dismissingFeatured, setDismissingFeatured] = useState(false);
  const [removingSource, setRemovingSource] = useState<string | null>(null);

  const applyResponse = useCallback((data: BoilerSyncTemplatesResponse) => {
    setTemplates(data.templates?.templates ?? []);
    setSources(data.sources?.sources ?? []);
    setDetails(data.details);
    setFeaturedSource(data.featured_source);
    setRootDir(
      data.templates?.template_root_dir ??
        data.sources?.template_root_dir ??
        null,
    );
    setBoilersyncPath(data.boilersync_path);
    setError(data.error);
  }, []);

  const fetchTemplates = useCallback(async (templateRef?: string) => {
    setLoading(true);
    try {
      const data = await fetchBoilerSyncTemplates(templateRef);
      applyResponse(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to reach the local API.",
      );
    }
    setLoading(false);
  }, [applyResponse]);

  useEffect(() => {
    void fetchTemplates();
  }, [fetchTemplates]);

  const selectTemplate = (templateRef: string) => {
    setSelectedTemplate(templateRef);
    void fetchTemplates(templateRef);
  };

  const handleAddSource = async (
    sourceUrl: string,
    options: { dismissFeaturedPrompt?: boolean } = {},
  ) => {
    if (addingSource) return;
    setAddingSource(true);
    setError(null);
    try {
      const data = await addBoilerSyncSource(sourceUrl, options);
      applyResponse(data);
      setRepoUrl("");
      toast.success("Template repository imported");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to import repository.";
      setError(message);
      toast.error(message);
    }
    setAddingSource(false);
  };

  const handleAddSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedUrl = repoUrl.trim();
    if (normalizedUrl) void handleAddSource(normalizedUrl);
  };

  const handleDismissFeatured = async () => {
    if (dismissingFeatured) return;
    setDismissingFeatured(true);
    setError(null);
    try {
      const data = await setBoilerSyncFeaturedPromptDismissed(true);
      applyResponse(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to dismiss suggestion.";
      setError(message);
      toast.error(message);
    }
    setDismissingFeatured(false);
  };

  const handleRemoveSource = async (source: BoilerSyncSource) => {
    const sourceKey = `${source.org}/${source.repo}`;
    if (removingSource) return;
    setRemovingSource(sourceKey);
    setError(null);
    setDetails(null);
    setSelectedTemplate(null);
    try {
      const data = await removeBoilerSyncSource(source.org, source.repo);
      applyResponse(data);
      toast.success(`Removed ${sourceKey}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to remove repository.";
      setError(message);
      toast.error(message);
    }
    setRemovingSource(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <ResourcePageHeader
          title="Templates"
          loading={loading}
          onRefresh={() => fetchTemplates(selectedTemplate ?? undefined)}
          subtitle={
            <span className="block truncate">
              {templates.length} templates · {sources.length} sources
              {rootDir ? (
                <span className="ml-2 font-mono text-[11px]">{rootDir}</span>
              ) : null}
            </span>
          }
        />

        {featuredSource?.prompt_visible ? (
          <FeaturedTemplateSource
            busy={addingSource || dismissingFeatured}
            onDismiss={() => void handleDismissFeatured()}
            onImport={() =>
              void handleAddSource(featuredSource.repo_url, {
                dismissFeaturedPrompt: true,
              })
            }
          />
        ) : null}

        <ResourceError message={error} />

        {boilersyncPath ? (
          <div className="rounded border border-border bg-muted/30 px-3 py-2 font-mono text-[11px] text-muted-foreground">
            {boilersyncPath}
          </div>
        ) : null}

        <TemplateRepositoryManager
          busy={addingSource || dismissingFeatured || Boolean(removingSource)}
          onAdd={handleAddSubmit}
          onRemove={(source) => void handleRemoveSource(source)}
          onRepoUrlChange={setRepoUrl}
          removingSource={removingSource}
          repoUrl={repoUrl}
          sources={sources}
        />

        <TemplateBrowser
          details={details}
          loading={loading}
          onSelect={selectTemplate}
          selectedTemplate={selectedTemplate}
          templates={templates}
        />
      </div>
    </DashboardLayout>
  );
};

export default BoilerSync;
