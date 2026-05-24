export const readJson = async <T = any>(res: Response): Promise<T | null> => {
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }
  return (await res.json()) as T;
};

export const extractErrorMessage = async (
  res: Response,
  fallback: string,
): Promise<string> => {
  try {
    const data = await readJson<{ error?: string; detail?: string }>(res);
    return data?.error ?? data?.detail ?? fallback;
  } catch {
    return fallback;
  }
};
