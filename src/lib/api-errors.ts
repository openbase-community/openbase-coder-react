export const readJson = async <T = any>(res: Response): Promise<T | null> => {
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
};

/** Turns a machine-readable error code like `subscription_required` into a readable sentence. */
const humanizeErrorCode = (code: string): string => {
  const text = code.replace(/[_-]+/g, " ").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : code;
};

export const extractErrorMessage = async (
  res: Response,
  fallback: string,
): Promise<string> => {
  const data = await readJson<{
    error?: string;
    detail?: string;
    message?: string;
    code?: string;
  }>(res);
  const message = data?.error ?? data?.detail ?? data?.message;
  if (typeof message === "string" && message.trim()) {
    return message;
  }
  if (typeof data?.code === "string" && data.code.trim()) {
    return humanizeErrorCode(data.code);
  }
  return fallback;
};
