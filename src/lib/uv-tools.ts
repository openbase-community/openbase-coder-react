import { apiFetch } from "@/lib/api";
import { extractErrorMessage } from "@/lib/api-errors";

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

export type UvToolHelpResponse = {
  tool_name: string;
  executable_name: string;
  command: string[];
  return_code: number | null;
  stdout: string;
  stderr: string;
  error: string | null;
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

export const fetchUvToolHelp = async (
  toolName: string,
  executableName: string,
): Promise<UvToolHelpResponse> => {
  const res = await apiFetch(
    `/api/tools/uv/${encodeURIComponent(toolName)}/executables/${encodeURIComponent(
      executableName,
    )}/help/`,
  );
  if (!res.ok) {
    throw new Error(
      await extractErrorMessage(
        res,
        `Unable to load tool help: ${res.status}`,
      ),
    );
  }
  return (await res.json()) as UvToolHelpResponse;
};
