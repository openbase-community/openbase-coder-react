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
  error: string | null;
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
