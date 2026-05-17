import { apiFetch } from "@/lib/api";

export type UvToolExecutable = { name: string; path: string };

export type EditablePackage = {
  name: string;
  version: string;
  editable_project_location: string;
};

export type UvTool = {
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

export type UvToolsResponse = {
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

export const fetchUvTools = async (): Promise<UvToolsResponse> => {
  const res = await apiFetch("/api/tools/uv/");
  if (!res.ok) {
    throw new Error(
      await extractErrorMessage(res, `Unable to load uv tools: ${res.status}`),
    );
  }
  return (await res.json()) as UvToolsResponse;
};

export const uninstallUvTool = async (
  toolName: string,
): Promise<UvToolsResponse> => {
  const res = await apiFetch(`/api/tools/uv/${encodeURIComponent(toolName)}/`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error(
      await extractErrorMessage(
        res,
        `Unable to uninstall uv tool: ${res.status}`,
      ),
    );
  }
  return (await res.json()) as UvToolsResponse;
};
