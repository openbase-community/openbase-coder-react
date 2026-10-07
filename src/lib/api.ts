import { getValidAccessToken } from "@/lib/jwt-auth";
import { getBackendUrl } from "@/lib/runtime-config";

/**
 * Fetch wrapper that adds the Bearer token to requests.
 */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = await getValidAccessToken();
  // The caller may have been cancelled (e.g. a component unmounted) while the
  // token was resolving; bail before touching runtime config or the network.
  init?.signal?.throwIfAborted();
  const headers = new Headers(init?.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(getBackendUrl(path), { ...init, headers });
}
