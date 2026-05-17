import { apiFetch } from "@/lib/api";

export type BoilerSyncSource = {
  org: string;
  repo: string;
  path: string;
  remote_url: string | null;
  branch: string | null;
  commit: string | null;
  template_count: number;
};

export type BoilerSyncTemplate = {
  template_ref: string;
  org: string;
  repo: string;
  subdir: string;
  template_dir: string;
  display_name: string;
};

export type BoilerSyncTemplateField = {
  name: string;
  required?: boolean;
  description?: string;
  default?: unknown;
};

export type BoilerSyncTemplateDetails = {
  template_ref: string;
  template_dir: string;
  variables?: BoilerSyncTemplateField[];
  options?: BoilerSyncTemplateField[];
  [key: string]: unknown;
};

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
