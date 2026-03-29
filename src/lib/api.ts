import { getValidAccessToken } from "@/lib/jwt-auth";
import { getBackendUrl } from "@/lib/runtime-config";

/**
 * Fetch wrapper that adds the Bearer token to requests.
 */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = await getValidAccessToken();
  const headers = new Headers(init?.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(getBackendUrl(path), { ...init, headers });
}
