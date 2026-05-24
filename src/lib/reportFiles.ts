import { apiFetch } from "@/lib/api";
import { readJson } from "@/lib/api-errors";
import type { ReportsFile } from "@/types/session";

export const downloadReportFile = async (
  projectPath: string,
  file: ReportsFile,
) => {
  const params = new URLSearchParams({
    path: projectPath,
    file: file.path,
  });
  const res = await apiFetch(`/api/projects/reports/download/?${params}`);

  if (!res.ok) {
    const data = await readJson(res);
    throw new Error(data?.error || "Failed to download report");
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
