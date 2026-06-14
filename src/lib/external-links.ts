declare global {
  interface Window {
    __OPENBASE_SHELL__?: {
      openExternal?: (url: string) => Promise<{ ok: boolean; error?: string }>;
    };
  }
}

export async function openExternalUrl(url: string) {
  if (typeof window === "undefined") return;

  const electronOpenExternal = window.__OPENBASE_SHELL__?.openExternal;
  if (electronOpenExternal) {
    const result = await electronOpenExternal(url);
    if (!result?.ok) {
      throw new Error(result?.error || "Unable to open external link.");
    }
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

