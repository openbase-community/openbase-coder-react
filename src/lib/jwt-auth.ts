import { getBackendUrl } from "@/lib/runtime-config";

const LOCAL_SESSION_URL = "/api/auth/session/";
const LOCAL_LOGOUT_URL = "/api/auth/logout/";
const REFRESH_SKEW_MS = 60_000;
const LOCAL_TOKEN_FRAGMENT_KEY = "openbase-local-token";
const LOCAL_TOKEN_SESSION_KEY = "openbase.local-api-token";

declare global {
  interface Window {
    __openbaseNativeAuth?: {
      getToken: () => Promise<string>;
    };
  }
}

type LocalAuthResponse = {
  logged_in?: boolean;
  detail?: string;
};

let accessToken: string | null = null;
let accessTokenExpiresAt = 0;
const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function updateStoredAuth(nextToken: string | null, nextExpiresAt: number) {
  const didChange =
    accessToken !== nextToken || accessTokenExpiresAt !== nextExpiresAt;

  accessToken = nextToken;
  accessTokenExpiresAt = nextExpiresAt;

  if (didChange) {
    emitChange();
  }
}

function clearStoredAuth() {
  updateStoredAuth(null, 0);
}

function shouldRefresh() {
  return !accessToken || Date.now() + REFRESH_SKEW_MS >= accessTokenExpiresAt;
}

async function parseJson(response: Response) {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text) as LocalAuthResponse;
  } catch {
    return null;
  }
}

function getTokenExpiryMs(token: string) {
  const segments = token.split(".");
  if (segments.length !== 3) {
    return 0;
  }

  try {
    const payload = JSON.parse(atob(segments[1].replace(/-/g, "+").replace(/_/g, "/"))) as {
      exp?: number;
    };
    return typeof payload.exp === "number" ? payload.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

function consumeLaunchCapability() {
  const fragment = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  const params = new URLSearchParams(fragment);
  const token = params.get(LOCAL_TOKEN_FRAGMENT_KEY)?.trim() ?? "";
  if (!token) {
    return window.sessionStorage.getItem(LOCAL_TOKEN_SESSION_KEY);
  }

  window.sessionStorage.setItem(LOCAL_TOKEN_SESSION_KEY, token);
  params.delete(LOCAL_TOKEN_FRAGMENT_KEY);
  const remaining = params.toString();
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${window.location.search}${remaining ? `#${remaining}` : ""}`,
  );
  return token;
}

async function getNativeAccessToken() {
  const bridge = window.__openbaseNativeAuth;
  if (!bridge?.getToken) {
    return null;
  }

  try {
    const token = await bridge.getToken();
    if (!token) {
      clearStoredAuth();
      return null;
    }

    const expiresAt = getTokenExpiryMs(token) || Number.POSITIVE_INFINITY;
    if (expiresAt && Date.now() + REFRESH_SKEW_MS >= expiresAt) {
      // The bridge handed back an expired (or nearly expired) cloud token.
      // Treat it as unavailable instead of looping 401/403s.
      return null;
    }
    updateStoredAuth(token, expiresAt);
    return token;
  } catch {
    return null;
  }
}

async function fetchLocal(path: string, init?: RequestInit) {
  return fetch(getBackendUrl(path), init);
}

export async function getValidAccessToken() {
  if (!shouldRefresh()) {
    return accessToken;
  }

  const nativeToken = await getNativeAccessToken();
  if (nativeToken) {
    return nativeToken;
  }

  const launchCapability = consumeLaunchCapability();
  if (launchCapability) {
    updateStoredAuth(launchCapability, Number.POSITIVE_INFINITY);
    return launchCapability;
  }
  return shouldRefresh() ? null : accessToken;
}

export async function getLocalAuthSession() {
  const token = await getValidAccessToken();
  const headers = new Headers({ Accept: "application/json" });
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetchLocal(LOCAL_SESSION_URL, { headers });
  const payload = await parseJson(response);
  return {
    ok: response.ok,
    loggedIn: !!payload?.logged_in,
  };
}

export async function logoutFromOpenbase() {
  try {
    const token = await getValidAccessToken();
    const headers = new Headers({ Accept: "application/json" });
    if (token) headers.set("Authorization", `Bearer ${token}`);
    await fetchLocal(LOCAL_LOGOUT_URL, {
      method: "POST",
      headers,
    });
  } finally {
    window.sessionStorage.removeItem(LOCAL_TOKEN_SESSION_KEY);
    clearStoredAuth();
  }
}

export function subscribeToAuthChanges(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getCurrentAccessToken() {
  return accessToken;
}
