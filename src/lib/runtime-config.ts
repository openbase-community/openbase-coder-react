declare global {
  interface Window {
    __OPENBASE_RUNTIME_CONFIG__?: {
      backendBaseUrl?: string;
      shell?: "web" | "electron";
    };
  }
}

const DEFAULT_BACKEND_URL = "http://127.0.0.1:7999";

function getConfiguredBackendBaseUrl() {
  return window.__OPENBASE_RUNTIME_CONFIG__?.backendBaseUrl?.trim();
}

export function getBackendBaseUrl() {
  if (typeof window === "undefined") {
    return DEFAULT_BACKEND_URL;
  }

  const configured = getConfiguredBackendBaseUrl();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  if (window.location.protocol === "http:" || window.location.protocol === "https:") {
    return window.location.origin;
  }

  return DEFAULT_BACKEND_URL;
}

export function getRuntimeShell() {
  if (typeof window === "undefined") {
    return "web" as const;
  }
  return window.__OPENBASE_RUNTIME_CONFIG__?.shell === "electron"
    ? ("electron" as const)
    : ("web" as const);
}

export function getBackendUrl(path: string) {
  // Join relative to the base so a base that includes a path prefix (e.g. when
  // the console is served behind a reverse proxy under a subpath) is preserved.
  // Absolute-path inputs like "/api/threads/" would otherwise reset to origin.
  return new URL(path.replace(/^\//, ""), `${getBackendBaseUrl()}/`).toString();
}

export function getBackendWebSocketUrl(path: string) {
  const base = new URL(getBackendBaseUrl());
  const protocol = base.protocol === "https:" ? "wss:" : "ws:";
  // Preserve any base path prefix (subpath reverse-proxy) ahead of the ws path.
  const basePath = base.pathname.replace(/\/$/, "");
  return `${protocol}//${base.host}${basePath}${path}`;
}
