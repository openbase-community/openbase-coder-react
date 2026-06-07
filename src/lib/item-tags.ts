import { apiFetch } from "@/lib/api";
import { extractErrorMessage, readJson } from "@/lib/api-errors";

export type TagOption = {
  slug: string;
  label: string;
  usage_count?: number;
};

export type TaggedItemPayload = {
  tags: string[];
  tag_options?: TagOption[];
};

export const fetchTagOptions = async (): Promise<TagOption[]> => {
  const response = await apiFetch("/api/tags/");
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, "Failed to load tags"));
  }
  const data = await readJson<{ tags?: TagOption[] }>(response);
  return Array.isArray(data?.tags) ? data.tags : [];
};

export const setReportTags = async (
  projectPath: string,
  filePath: string,
  tags: string[],
): Promise<TaggedItemPayload> => {
  const params = new URLSearchParams({ path: projectPath, file: filePath });
  const response = await apiFetch(`/api/projects/reports/tags/?${params}`, {
    method: "PATCH",
    body: JSON.stringify({ tags }),
  });
  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(response, "Failed to update tags"),
    );
  }
  const data = await readJson<TaggedItemPayload>(response);
  return {
    tags: Array.isArray(data?.tags) ? data.tags : [],
    tag_options: Array.isArray(data?.tag_options) ? data.tag_options : [],
  };
};
