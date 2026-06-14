import type { ReportsFile } from "@/types/session";

type ReportPayloadLike = {
  content?: string | null;
};

export const firstMarkdownTitle = (content?: string | null) => {
  if (!content) return null;

  let fenced = false;
  for (const line of content.split(/\r?\n/)) {
    const trimmedStart = line.trimStart();
    if (/^(```|~~~)/.test(trimmedStart)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;

    const match = /^(?: {0,3})#(?:\s+|$)(.*?)\s*#*\s*$/.exec(line);
    const title = match?.[1]?.trim();
    if (title) return title;
  }

  return null;
};

export const reportDisplayName = (
  file: ReportsFile,
  payload?: ReportPayloadLike,
) => {
  if (file.kind !== "markdown") return file.name;
  return firstMarkdownTitle(payload?.content) ?? file.name;
};
