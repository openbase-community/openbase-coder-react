import { getBackendBaseUrl } from "@/lib/runtime-config";

export const OPENBASE_TAILNET_PORT = 18080;

/**
 * Base URL for talking DIRECTLY to the peer desktop that owns a fleet item
 * (its `origin_host` MagicDNS name). An https-served console must stay on
 * TLS (mixed-content rules), and every desktop serves HTTPS on 443 via
 * Tailscale Serve; anything else talks to the plain tailnet port.
 */
export const peerBackendBaseUrl = (originHost: string): string =>
  getBackendBaseUrl().startsWith("https:")
    ? `https://${originHost}`
    : `http://${originHost}:${OPENBASE_TAILNET_PORT}`;

/**
 * Prefix `path` with the owning peer's base when `originHost` is set, else
 * leave it relative (the selected backend). apiFetch passes absolute URLs
 * through untouched, so results feed it directly.
 */
export const fleetApiPath = (
  originHost: string | null | undefined,
  path: string,
): string => (originHost ? `${peerBackendBaseUrl(originHost)}${path}` : path);

export const peerWebSocketUrl = (originHost: string, path: string): string =>
  `${peerBackendBaseUrl(originHost).replace(/^http/, "ws")}${path}`;
