import { getBackendUrl } from "@/lib/runtime-config";

const LOCAL_REFRESH_URL = "/api/auth/refresh-jwt/";
const LOCAL_SESSION_URL = "/api/auth/session/";
const LOCAL_LOGOUT_URL = "/api/auth/logout/";
const REFRESH_SKEW_MS = 60_000;

declare global {
  interface Window {
    __openbaseNativeAuth?: {
      getToken: () => Promise<string>;
    };
  }
}

type LocalAuthResponse = {
  access_token?: string;
  access_token_expires_in?: number;
  expires_at?: number;
  logged_in?: boolean;
  detail?: string;
};

let accessToken: string | null = null;
let accessTokenExpiresAt = 0;
let refreshPromise: Promise<string | null> | null = null;
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

function applyToken(payload: LocalAuthResponse | null) {
  const nextToken = payload?.access_token;
  if (!nextToken) {
    clearStoredAuth();
    return null;
  }

  let nextExpiresAt = 0;
  if (typeof payload?.expires_at === "number") {
    nextExpiresAt = payload.expires_at * 1000;
  } else {
    const expiresIn = payload?.access_token_expires_in ?? 300;
    nextExpiresAt = Date.now() + expiresIn * 1000;
  }
  updateStoredAuth(nextToken, nextExpiresAt);
  return nextToken;
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

    const expiresAt = getTokenExpiryMs(token);
    updateStoredAuth(token, expiresAt);
    return token;
  } catch {
    return null;
  }
}

async function fetchLocal(path: string, init?: RequestInit) {
  return fetch(getBackendUrl(path), init);
}

async function refreshAccessToken() {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const response = await fetchLocal(LOCAL_REFRESH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
    });
    const payload = await parseJson(response);

    if (!response.ok) {
      // Only a 401 means the CLI's refresh token is gone for good. Network
      // blips and 5xx responses are transient: keep the current token so a
      // hiccup does not bounce the user to the login screen.
      if (response.status === 401) {
        clearStoredAuth();
      }
      throw new Error(payload?.detail || "Unable to refresh local JWT.");
    }

    return applyToken(payload);
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

export async function getValidAccessToken() {
  const nativeToken = await getNativeAccessToken();
  if (nativeToken) {
    return nativeToken;
  }

  if (!shouldRefresh()) {
    return accessToken;
  }

  try {
    return await refreshAccessToken();
  } catch {
    // On transient failures the stored token survives and may still be
    // valid for a few minutes; only a definitive 401 cleared it.
    return accessToken;
  }
}

export async function getLocalAuthSession() {
  const nativeToken = await getNativeAccessToken();
  if (nativeToken) {
    return {
      ok: true,
      loggedIn: true,
    };
  }

  const response = await fetchLocal(LOCAL_SESSION_URL, {
    headers: {
      Accept: "application/json",
    },
  });
  const payload = await parseJson(response);
  return {
    ok: response.ok,
    loggedIn: !!payload?.logged_in,
  };
}

export async function logoutFromOpenbase() {
  try {
    await fetchLocal(LOCAL_LOGOUT_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
    });
  } finally {
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
