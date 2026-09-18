import { apiFetch } from "@/lib/api";
import { extractErrorMessage } from "@/lib/api-errors";
import type {
  TemplateDetails,
  TemplateInputField,
  TemplateListEntry,
  TemplateSource,
} from "boilersync-react";

export type BoilerSyncSource = TemplateSource;
export type BoilerSyncTemplate = TemplateListEntry;
export type BoilerSyncTemplateField = TemplateInputField;
export type BoilerSyncTemplateDetails = TemplateDetails;

export type BoilerSyncTemplatesResponse = {
  boilersync_available: boolean;
  boilersync_path: string | null;
  sources: {
    template_root_dir?: string;
    sources?: BoilerSyncSource[];
    duplicate_remotes?: { remote_url: string; paths: string[] }[];
  } | null;
  templates: {
    template_root_dir?: string;
    count?: number;
    templates?: BoilerSyncTemplate[];
  } | null;
  details: BoilerSyncTemplateDetails | null;
  featured_source: {
    org: string;
    repo: string;
    repo_url: string;
    installed: boolean;
    prompt_dismissed: boolean;
    prompt_visible: boolean;
  };
  error: string | null;
};

const requestBoilerSyncTemplates = async (
  init: RequestInit,
): Promise<BoilerSyncTemplatesResponse> => {
  const res = await apiFetch("/api/boilersync/templates/", init);
  if (!res.ok) {
    throw new Error(
      await extractErrorMessage(
        res,
        `Unable to update BoilerSync templates: ${res.status}`,
      ),
    );
  }
  return (await res.json()) as BoilerSyncTemplatesResponse;
};

export const fetchBoilerSyncTemplates = async (
  templateRef?: string,
): Promise<BoilerSyncTemplatesResponse> => {
  const search = new URLSearchParams();
  if (templateRef) search.set("template_ref", templateRef);
  const suffix = search.toString() ? `?${search.toString()}` : "";
  const res = await apiFetch(`/api/boilersync/templates/${suffix}`);
  if (!res.ok) {
    throw new Error(
      await extractErrorMessage(
        res,
        `Unable to load BoilerSync templates: ${res.status}`,
      ),
    );
  }
  return (await res.json()) as BoilerSyncTemplatesResponse;
};

export const addBoilerSyncSource = async (
  repoUrl: string,
  options: { dismissFeaturedPrompt?: boolean } = {},
): Promise<BoilerSyncTemplatesResponse> =>
  requestBoilerSyncTemplates({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      repo_url: repoUrl,
      dismiss_featured_prompt: options.dismissFeaturedPrompt ?? false,
    }),
  });

export const removeBoilerSyncSource = async (
  org: string,
  repo: string,
): Promise<BoilerSyncTemplatesResponse> =>
  requestBoilerSyncTemplates({
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ org, repo }),
  });

export const setBoilerSyncFeaturedPromptDismissed = async (
  dismissed: boolean,
): Promise<BoilerSyncTemplatesResponse> =>
  requestBoilerSyncTemplates({
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dismissed }),
  });
