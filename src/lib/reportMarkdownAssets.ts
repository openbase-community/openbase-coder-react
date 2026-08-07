const URL_SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;

export const reportRelativeAssetPath = (
  reportPath: string,
  source: string | undefined,
) => {
  const trimmed = source?.trim() ?? "";
  if (
    !trimmed ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    URL_SCHEME_RE.test(trimmed)
  ) {
    return null;
  }

  const sourcePath = trimmed.split(/[?#]/, 1)[0];
  if (!sourcePath) return null;

  const segments = reportPath.split("/").slice(0, -1).filter(Boolean);
  for (const segment of sourcePath.split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      if (segments.length === 0) return null;
      segments.pop();
      continue;
    }
    segments.push(segment);
  }

  return segments.length > 0 ? segments.join("/") : null;
};

export const reportAssetDownloadPath = (
  projectPath: string | undefined,
  reportPath: string | undefined,
  source: string | undefined,
) => {
  if (!projectPath || !reportPath) return null;
  const assetPath = reportRelativeAssetPath(reportPath, source);
  if (!assetPath) return null;

  const params = new URLSearchParams({
    path: projectPath,
    file: assetPath,
  });
  return `/api/projects/reports/download/?${params}`;
};
